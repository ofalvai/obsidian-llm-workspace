<script lang="ts">
	import { liveQuery } from "dexie"
	import { Notice, TFile } from "obsidian"
	import { DEFAULT_SETTINGS, type LlmPluginSettings } from "src/config/settings"
	import type { Conversation } from "src/rag/conversation"
	import { AnthropicChatCompletionClient } from "src/rag/llm/anthropic"
	import type { ChatCompletionClient, ChatMessage } from "src/rag/llm/common"
	import { OpenAIChatCompletionClient, OpenAIEmbeddingClient } from "src/rag/llm/openai"
	import { NodeParser } from "src/rag/node"
	import { RetrieverQueryEngine } from "src/rag/query-engine"
	import { EmbeddingVectorRetriever } from "src/rag/retriever"
	import { VectorStoreIndex } from "src/rag/storage"
	import {
		DumbResponseSynthesizer
	} from "src/rag/synthesizer"
	import type { LlmDexie, VectorStoreEntry } from "src/storage/db"
	import { debugInfoToMarkdown } from "src/utils/debug"
	import {
		appStore,
		isLlmWorkspace,
		readWorkspaceContext,
		settingsStore,
	} from "src/utils/obsidian"
	import type { ComponentEvents } from "svelte"
	import { derived, type Writable } from "svelte/store"
	import NoteLinks from "./NoteLinks.svelte"
	import QuestionAndAnswer from "./QuestionAndAnswer.svelte"
	import TailwindCss from "./TailwindCSS.svelte"
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

	const nodeParser = new NodeParser(NodeParser.defaultConfig())
	const embeddingClient = new OpenAIEmbeddingClient($settingsStore.openAIApiKey)
	const vectorStore = new VectorStoreIndex(db)
	const retriever = new EmbeddingVectorRetriever(vectorStore, embeddingClient)
	let llmClient = derived<Writable<LlmPluginSettings>, ChatCompletionClient>(
		settingsStore,
		($settingsStore) => {
			console.log("Recreating LLM client")
			const model = $settingsStore.questionAndAnswerModel
			if (model.startsWith("gpt")) {
				return new OpenAIChatCompletionClient($settingsStore.openAIApiKey, model)
			} else if (model.startsWith("claude")) {
				return new AnthropicChatCompletionClient($settingsStore.anthropicApikey, model)
			} else {
				throw new Error("Invalid model: " + model)
			}
		},
	)
	const completionOptions = {
		temperature: 0.1,
		maxTokens: 512,
	}
	const systemPrompt = $settingsStore.systemPrompt
		? $settingsStore.systemPrompt
		: DEFAULT_SETTINGS.systemPrompt
	const synthesizer = new DumbResponseSynthesizer(
		$llmClient,
		completionOptions,
		systemPrompt,
		workspaceContext,
	)
	const queryEngine = new RetrieverQueryEngine(retriever, synthesizer)

	let isLoading = false
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
	let conversation: Conversation | null = null
	const onMessageSubmit = async (newMessage: string) => {
		if (!conversation || !conversation.queryResponse) {
			conversation = {
				initialUserQuery: newMessage,
				queryResponse: null,
				additionalMessages: [],
			}
			isLoading = true
			try {
				const response = await queryEngine.query(newMessage, workspaceFile.path)
				conversation = {
					...conversation,
					queryResponse: response,
				}
			} catch (e) {
				console.error(e)
			} finally {
				isLoading = false
			}
		} else {
			conversation = {
				...conversation,
				additionalMessages: [
					...conversation.additionalMessages,
					{
						role: "user",
						content: newMessage,
					},
				],
			}
			const messages: ChatMessage[] = [
				{
					role: "system",
					content: conversation.queryResponse!.debugInfo.systemPrompt,
				},
				{
					role: "user",
					content: conversation.queryResponse!.debugInfo.userPrompt,
				},
				{
					role: "assistant",
					content: conversation.queryResponse!.text,
				},
				...conversation.additionalMessages,
			]
			isLoading = true
			try {
				const response = await $llmClient.createChatCompletion(messages, completionOptions)
				conversation = {
					...conversation,
					additionalMessages: [
						...conversation.additionalMessages,
						{
							role: response.role,
							content: response.content,
						},
					],
				}
			} catch (e) {
				console.error(e)
			} finally {
				isLoading = false
			}
		}
	}
	const onNewConversationClick = (
		event: ComponentEvents<QuestionAndAnswer>["new-conversation-click"],
	) => {
		conversation = null
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
			{conversation}
			{isLoading}
			on:message-submit={async (e) => {
				onMessageSubmit(e.detail)
			}}
			on:source-click={onLinkClick}
			on:debug-click={onDebugClick}
			on:new-conversation-click={onNewConversationClick}
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
