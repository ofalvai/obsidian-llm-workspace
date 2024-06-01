<script lang="ts">
	import { liveQuery } from "dexie"
	import { Notice, TFile } from "obsidian"
	import { conversationStore, type ConversationStore } from "src/llm-features/conversation"
	import { llmClient } from "src/llm-features/client"
	import {
		workspaceQuestions,
		type WorkspaceQuestion,
	} from "src/llm-features/workspace-questions"
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
	import { writable } from "svelte/store"
	import TailwindCss from "../TailwindCSS.svelte"
	import QuestionAndAnswer from "../chat/QuestionAndAnswer.svelte"
	import type { EmbeddedFileInfo } from "../types"
	import IndexedFiles from "./IndexedFiles.svelte"
	import Questions from "./Questions.svelte"
	import type { CompletionOptions, EmbeddingClient, Temperature } from "src/rag/llm/common"
	import Error from "../Error.svelte"
	import ConfigValue from "../chat/ConfigValue.svelte"
	import ConversationStyle from "../chat/ConversationStyle.svelte"

	export let workspaceFile: TFile
	export let db: LlmDexie

	let indexingError: any | null = null

	let workspaceContext: string | null = null
	const metadata = $appStore.metadataCache.getFileCache(workspaceFile)
	const isWorkspace = metadata != null && isLlmWorkspace(metadata)
	if (metadata) {
		workspaceContext = readWorkspaceContext(metadata)
	}

	const vectorStore = new VectorStoreIndex(db)
	const completionOptions: CompletionOptions = {
		temperature: "balanced",
		maxTokens: 512,
	}
	const setTemperature = (t: Temperature) => {
		completionOptions.temperature = t
	}
	// TODO: refactor all of this into a derived store
	let nodeParser: NodeParser
	let embeddingClient: EmbeddingClient
	let retriever: EmbeddingVectorRetriever
	let synthesizer: ResponseSynthesizer
	let queryEngine: QueryEngine
	let conversation: ConversationStore
	$: {
		nodeParser = new NodeParser({
			chunkSize: $settingsStore.chunkSize,
			paragraphSeparator: "\n\n",
		})
		embeddingClient = new OpenAIEmbeddingClient($settingsStore.openAIApiKey)
		retriever = new EmbeddingVectorRetriever(vectorStore, embeddingClient, {
			limit: $settingsStore.retrievedNodeCount,
		})
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

		const filePaths = [workspace.workspaceFile, ...workspace.links]
		const vectorStoreResults: VectorStoreEntry[][] = await Promise.all(
			filePaths.map(async (path) => {
				// TODO: return a lighter object without the full string content and embedding vector
				return db.vectorStore.where("node.parent").equals(path).toArray()
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

		return filePaths.map((path) => {
			const embeddingInfo = embeddedFileMap.get(path)
			if (embeddingInfo) {
				if (embeddingInfo.path != path) {
					console.warn(
						`Mismatch between path of vector store entry and workspace link:\nPath from vector store entry: ${embeddingInfo.path}\nPath from workspace: ${path}`,
					)
				}
				return embeddingInfo
			} else {
				const file = $appStore.vault.getFileByPath(path)!
				return {
					name: file.basename,
					parent: file.parent,
					path: path,
					nodeCount: 0,
					lastProcessed: undefined,
				}
			}
		})
	})

	const workspaceData = liveQuery(async () => {
		return db.workspace.where("workspaceFile").equals(workspaceFile.path).first()
	})
	const isLoadingQuestions = writable(false)
	const buildQuestions = async () => {
		isLoadingQuestions.set(true)
		try {
			const questions = await workspaceQuestions($llmClient, $appStore.vault, $links)
			await db.workspace.update(workspaceFile.path, { derivedQuestions: questions })
		} catch (e) {
			console.error("Failed to build questions", e)
		} finally {
			isLoadingQuestions.set(false)
		}
	}
	const selectQuestion = async (question: WorkspaceQuestion) => {
		conversation.resetConversation()
		conversation.submitMessage(question.content)
	}

	const rebuildAll = async () => {
		// Collect all linked files
		// Note: we can't use `app.metadataCache.getFileCache(workspaceFile).links` because
		// it doesn't contain the full path of the linked file
		let linkedFilePaths: string[] = [workspaceFile.path]
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

		try {
			indexingError = null

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
		} catch (e) {
			console.error("Failed to rebuild linked files", e)
			indexingError = e
		}
	}

	const onLinkClick = (path: string) => {
		$appStore.workspace.openLinkText(path, "", "tab")
	}
	const onLinkRebuild = async (fileInfo: EmbeddedFileInfo) => {
		indexingError = null
		try {
			await vectorStore.deleteFiles(fileInfo.path)
			const file = $appStore.vault.getFileByPath(fileInfo.path)
			if (!file) {
				return
			}
			const text = await $appStore.vault.cachedRead(file)
			for (const node of nodeParser.parse(text, file.path)) {
				const embedding = await embeddingClient.embedNode(node)
				await vectorStore.addNode(node, embedding, workspaceFile.path)
			}
		} catch (e) {
			console.error("Failed to rebuild linked file", e)
			indexingError = e
		}
	}
</script>

<TailwindCss />
<div class="flex h-full w-full flex-col pb-32">
	{#if isWorkspace}
		<IndexedFiles
			links={$links || []}
			{onLinkClick}
			{onLinkRebuild}
			onRebuildAll={rebuildAll}
		/>
		{#if indexingError}
			<Error body={indexingError} />
		{/if}
		<QuestionAndAnswer
			conversation={$conversation}
			displaySources={true}
			onMessageSubmit={async (msg) => {
				conversation.submitMessage(msg)
			}}
			onSourceClick={(path) => onLinkClick(path)}
			onDebugClick={(resp) => writeDebugInfo($appStore, resp)}
			onNewConversation={conversation.resetConversation}
		>
			<div slot="empty">
				<Questions
					questions={$workspaceData?.derivedQuestions ?? []}
					isLoading={$isLoadingQuestions}
					onRegenerate={buildQuestions}
					onQuestionSelect={async (q) => selectQuestion(q)}
				/>
				<div>
					<div class="font-medium">Configuration</div>
					<ConfigValue iconId="bot" label="LLM" value={$llmClient.displayName} />
					<ConfigValue
						iconId="separator-horizontal"
						label="Chunk size"
						value="{$settingsStore.chunkSize} characters"
					/>
					<ConfigValue
						iconId="files"
						label="Number of chunks in context"
						value={$settingsStore.retrievedNodeCount.toString()}
					/>
					<ConversationStyle
						temperature={completionOptions.temperature}
						onChange={(t) => setTemperature(t)}
					/>
				</div>
			</div>
		</QuestionAndAnswer>
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
