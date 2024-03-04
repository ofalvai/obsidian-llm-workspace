<script lang="ts">
	import { DEFAULT_SETTINGS } from "config/settings"
	import { liveQuery } from "dexie"
	import { Notice, TFile } from "obsidian"
	import { OpenAIChatCompletionClient, OpenAIEmbeddingClient } from "rag/llm"
	import { NodeParser } from "rag/node"
	import { RetrieverQueryEngine } from "rag/query-engine"
	import { EmbeddingVectorRetriever } from "rag/retriever"
	import { VectorStoreIndex } from "rag/storage"
	import { DumbResponseSynthesizer, type DebugInfo, type QueryResponse } from "rag/synthesizer"
	import type { LlmDexie, VectorStoreEntry } from "storage/db"
	import type { ComponentEvents } from "svelte"
	import { writable } from "svelte/store"
	import { debugInfoToMarkdown } from "utils/debug"
	import { appStore, isLlmWorkspace, readWorkspaceContext, settingsStore } from "utils/obsidian"
	import NoteLinks from "./NoteLinks.svelte"
	import QuestionAndAnswer from "./QuestionAndAnswer.svelte"
	import type { EmbeddedFileInfo } from "./types"

	export let workspaceFile: TFile
	export let db: LlmDexie

	// TODO: these are not refreshed when the workspace file changes
	let workspaceContext: string | null = null
	const metadata = $appStore.metadataCache.getFileCache(workspaceFile)
	const isWorkspace = metadata != null && isLlmWorkspace(metadata)
	if (metadata) {
		workspaceContext = readWorkspaceContext(metadata)
	}

	const debug = true // TODO: make it a setting
	const nodeParser = new NodeParser(NodeParser.defaultConfig())
	const embeddingClient = new OpenAIEmbeddingClient($settingsStore.openAIApiKey)
	const vectorStore = new VectorStoreIndex(db)
	const retriever = new EmbeddingVectorRetriever(vectorStore, embeddingClient)
	const completionClient = new OpenAIChatCompletionClient($settingsStore.openAIApiKey, {
		model: "gpt-3.5-turbo-1106",
		temperature: 0.1,
	})
	const systemPrompt = $settingsStore.systemPrompt
		? $settingsStore.systemPrompt
		: DEFAULT_SETTINGS.systemPrompt
	const synthesizer = new DumbResponseSynthesizer(
		completionClient,
		systemPrompt,
		workspaceContext,
		debug,
	)
	const queryEngine = new RetrieverQueryEngine(retriever, synthesizer)

	let queryResponse = writable<QueryResponse>()
	let debugInfo = writable<DebugInfo | undefined>()
	let isLoading = false
	const onQuestionSubmit = async (q: string) => {
		isLoading = true
		try {
			const response = await queryEngine.query(q, workspaceFile.path)
			queryResponse.set(response)
			debugInfo.set(response.debugInfo)
		} catch (e) {
			console.error(e)
		} finally {
			isLoading = false
		}
	}

	let links = liveQuery(async () => {
		const workspace = await db.workspace
			.where("workspaceFile")
			.equals(workspaceFile.path)
			.first()

		if (!workspace) {
			console.error("Workspace not found", workspaceFile.path)
			return []
		}

		const vectorStoreResults: VectorStoreEntry[][] = await Promise.all(
			workspace.links.map(async (link) => {
				// TODO: return a lighter object without the full string content and embedding vector
				return await db.vectorStore.where("node.parent").equals(link).toArray()
			}),
		)

		const embeddedFileMap = vectorStoreResults.flat().reduce((map, vectorStoreEntry) => {
			const filePath = vectorStoreEntry.node.parent
			if (map.has(filePath)) {
				map.get(filePath)!.nodeCount += 1
			} else {
				const file = app.vault.getAbstractFileByPath(filePath) as TFile
				map.set(filePath, {
					name: file.basename,
					parent: file.parent,
					path: filePath,
					nodeCount: 1,
					lastProcessed: vectorStoreEntry.node.createdAt,
				})
			}
			return map
		}, new Map<String, EmbeddedFileInfo>())

		return workspace.links.map((link) => {
			const embeddingInfo = embeddedFileMap.get(link)
			if (embeddingInfo) {
				if (embeddingInfo.path != link) {
					console.warn(
						`Mismatch between path of vector store entry and workspace link:\nPath from vector store entry: ${embeddingInfo.path}\nPath from workspace: ${link}`,
					)
				}
				return embeddingInfo
			} else {
				const file = $appStore.vault.getAbstractFileByPath(link) as TFile
				return {
					name: file.basename,
					parent: file.parent,
					path: link,
					nodeCount: 0,
					lastProcessed: undefined,
				}
			}
		})
	})

	const rebuildAll = async () => {
		// Collect all linked files
		// Note: we can't use `app.metadataCache.getFileCache(workspaceFile).links` because
		// it doesn't contain the full path of the linked file
		let linkedFilePaths: string[] = []
		if (workspaceFile.path in $appStore.metadataCache.resolvedLinks) {
			const linksOfFile = $appStore.metadataCache.resolvedLinks[workspaceFile.path]
			linkedFilePaths = Object.keys(linksOfFile)
		} else {
			linkedFilePaths = []
		}

		if (linkedFilePaths.length === 0) {
			new Notice("Workspace has no linked notes")
			return
		}

		await vectorStore.deleteFiles(...linkedFilePaths)

		for (const path of linkedFilePaths) {
			// TODO: test for non-markdown files
			// TODO: batched iteration
			const file = $appStore.vault.getAbstractFileByPath(path) as TFile
			const text = await $appStore.vault.cachedRead(file)
			for (const node of nodeParser.parse(text, file.path)) {
				const embedding = await embeddingClient.embedNode(node)
				await vectorStore.addNode(node, embedding, workspaceFile.path)
			}
		}
	}

	const onLinkClick = (event: ComponentEvents<NoteLinks>["link-click"]) => {
		$appStore.workspace.openLinkText(event.detail, "", "tab")
	}
	const onLinkRebuild = async (event: ComponentEvents<NoteLinks>["link-rebuild"]) => {
		await vectorStore.deleteFiles(event.detail.path)
		const file = $appStore.vault.getAbstractFileByPath(event.detail.path) as TFile
		const text = await $appStore.vault.cachedRead(file)
		for (const node of nodeParser.parse(text, file.path)) {
			const embedding = await embeddingClient.embedNode(node)
			await vectorStore.addNode(node, embedding, workspaceFile.path)
		}
	}
	const onDebugClick = async (event: ComponentEvents<QuestionAndAnswer>["debug-click"]) => {
		const debugFilePath = "LLM workspace debug.md"
		const file = $appStore.metadataCache.getFirstLinkpathDest(debugFilePath, "")
		const markdown = debugInfoToMarkdown(event.detail)
		if (file) {
			await $appStore.vault.append(file, markdown)
			new Notice("Debug info appended to the end of file")
		} else {
			await $appStore.vault.create(debugFilePath, markdown)
		}

		await $appStore.workspace.openLinkText(debugFilePath, "", "tab")
	}
</script>

<div>
	{#if isWorkspace}
		<h4>{workspaceFile.basename}</h4>
		<NoteLinks
			links={$links || []}
			on:link-click={onLinkClick}
			on:link-rebuild={onLinkRebuild}
		/>
		<button on:click={rebuildAll}>Rebuild embedding DB</button>
	{:else}
		<div>
			<h4>Not a workspace yet</h4>
			<p>
				{workspaceFile.basename} is not an LLM workspace yet. Update its frontmatter and try
				again.
			</p>
		</div>
	{/if}
	<QuestionAndAnswer
		queryResponse={$queryResponse}
		{isLoading}
		on:query-submit={async (e) => {
			onQuestionSubmit(e.detail)
		}}
		on:source-click={onLinkClick}
		on:debug-click={onDebugClick}
	/>
</div>
