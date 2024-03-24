<script lang="ts">
	import { liveQuery } from "dexie"
	import { Notice, TFile } from "obsidian"
	import { conversationStore, type ConversationStore } from "src/conversation"
	import { llmClient } from "src/llm"
	import { OpenAIEmbeddingClient } from "src/rag/llm/openai"
	import { NodeParser } from "src/rag/node"
	import { RetrieverQueryEngine, type QueryEngine } from "src/rag/query-engine"
	import { EmbeddingVectorRetriever } from "src/rag/retriever"
	import { VectorStoreIndex } from "src/rag/storage"
	import { DumbResponseSynthesizer, type ResponseSynthesizer } from "src/rag/synthesizer"
	import type { LlmDexie, VectorStoreEntry } from "src/storage/db"
	import { writeDebugInfo } from "src/utils/debug"
	import {
		appStore,
		isLlmWorkspace,
		readWorkspaceContext,
		settingsStore,
	} from "src/utils/obsidian"
	import type { ComponentEvents } from "svelte"
	import NoteLinks from "./NoteLinks.svelte"
	import QuestionAndAnswer from "./QuestionAndAnswer.svelte"
	import TailwindCss from "./TailwindCSS.svelte"
	import type { EmbeddedFileInfo } from "./types"

	export let workspaceFile: TFile
	export let db: LlmDexie

	let workspaceContext: string | null = null
	const metadata = $appStore.metadataCache.getFileCache(workspaceFile)
	const isWorkspace = metadata != null && isLlmWorkspace(metadata)
	if (metadata) {
		workspaceContext = readWorkspaceContext(metadata)
	}

	const nodeParser = new NodeParser(NodeParser.defaultConfig())
	const embeddingClient = new OpenAIEmbeddingClient($settingsStore.openAIApiKey)
	const vectorStore = new VectorStoreIndex(db)
	const retriever = new EmbeddingVectorRetriever(vectorStore, embeddingClient)
	const completionOptions = {
		temperature: 0.1,
		maxTokens: 512,
	}
	let synthesizer: ResponseSynthesizer
	let queryEngine: QueryEngine
	let conversation: ConversationStore
	$: {
		synthesizer = new DumbResponseSynthesizer(
			$llmClient,
			completionOptions,
			$settingsStore.systemPrompt,
			workspaceContext,
		)
		queryEngine = new RetrieverQueryEngine(retriever, synthesizer, workspaceFile.path)
		conversation = conversationStore(queryEngine, $llmClient, completionOptions)
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
				const file = $appStore.vault.getFileByPath(filePath)!
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
				const file = $appStore.vault.getFileByPath(link)!
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
			const file = $appStore.vault.getFileByPath(path)
			if (!file) {
				continue
			}
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
		const file = $appStore.vault.getFileByPath(event.detail.path)
		if (!file) {
			return
		}
		const text = await $appStore.vault.cachedRead(file)
		for (const node of nodeParser.parse(text, file.path)) {
			const embedding = await embeddingClient.embedNode(node)
			await vectorStore.addNode(node, embedding, workspaceFile.path)
		}
	}
</script>

<TailwindCss />
<div class="flex h-full w-full flex-col">
	{#if isWorkspace}
		<NoteLinks
			links={$links || []}
			on:link-click={onLinkClick}
			on:link-rebuild={onLinkRebuild}
			on:rebuild-all={rebuildAll}
		/>
		<QuestionAndAnswer
			conversation={$conversation}
			on:message-submit={async (e) => {
				conversation.submitMessage(e.detail)
			}}
			on:source-click={onLinkClick}
			on:debug-click={(e) => writeDebugInfo($appStore, e.detail)}
			on:new-conversation-click={conversation.resetConversation}
		/>
	{:else}
		<div>
			<h4>Not a workspace yet</h4>
			<p>
				{workspaceFile.basename} is not an LLM workspace yet. Update its frontmatter and try
				again.
			</p>
		</div>
	{/if}
</div>
