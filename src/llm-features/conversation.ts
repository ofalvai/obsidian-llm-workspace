import { get, writable, type Readable } from "svelte/store"
import type { Conversation } from "../rag/conversation"
import type {
	ChatMessage,
	CompletionOptions,
	StreamingChatCompletionClient,
} from "../rag/llm/common"
import type { QueryEngine } from "../rag/query-engine"
import type { Node } from "src/rag/node"
import { logger } from "src/utils/logger"

export type ConversationStore = Readable<Conversation | null> & {
	// configure() must be called before any other method. This is a separate call in order to
	// avoid invalidating and re-creating the entire store when the configuration changes.
	// This allows the conversation data to persist across configuration changes.
	configure(
		queryEngine: QueryEngine,
		chatClient: StreamingChatCompletionClient,
		completionOptions: CompletionOptions,
	): void
	submitMessage: (newMessage: string, attachedContent: Node[]) => Promise<void>
	resetConversation: () => void
}

export const conversationStore = (): ConversationStore => {
	const store = writable<Conversation | null>(null)

	const resetConversation = () => store.set(null)

	let activeQueryEngine: QueryEngine | undefined
	let activeChatClient: StreamingChatCompletionClient | undefined
	let activeCompletionOptions: CompletionOptions | undefined

	const configure = (queryEngine: QueryEngine, chatClient: StreamingChatCompletionClient, completionOptions: CompletionOptions) => {
		activeQueryEngine = queryEngine
		activeChatClient = chatClient
		activeCompletionOptions = completionOptions
	}

	const submitMessage = async (newMessage: string, attachedContent: Node[]) => {
		let conversation = get(store)

		if (!activeQueryEngine || !activeChatClient || !activeCompletionOptions) {
			logger.error("Conversation store is not configured with a query engine or chat client.")
			return
		}

		if (!conversation || !conversation.queryResponse) {
			conversation = {
				initialUserQuery: newMessage,
				queryResponse: null,
				additionalMessages: [],
				isLoading: true,
				error: null,
			}
			store.set(conversation)
			try {
				for await (const update of activeQueryEngine.query(newMessage, attachedContent)) {
					conversation.queryResponse = update
					conversation.isLoading = true
					store.set(conversation)
				}
				conversation.isLoading = false
				store.set(conversation)
			} catch (e) {
				logger.error("QueryEngine invoke error", "conversationStore", e)
				conversation.isLoading = false
				if (e instanceof Error && e.message === "Unexpected status code: 401") {
					conversation.error = new Error("Unauthorized. Did you set the right API key?")
				} else {
					conversation.error = e
				}
				store.set(conversation)
			}
		} else {
			conversation.additionalMessages.push({
				role: "user",
				content: newMessage,
				attachedContent: attachedContent,
			})
			conversation.isLoading = true
			store.set(conversation)

			const messagesSoFar: ChatMessage[] = [
				{
					role: "system",
					content: conversation.queryResponse.systemPrompt,
					attachedContent: [],
				},
				{
					role: "user",
					content: conversation.queryResponse.userPrompt,
					attachedContent: [],
				},
				{
					role: "assistant",
					content: conversation.queryResponse.text,
					attachedContent: [],
				},
				...conversation.additionalMessages,
			]
			try {
				const stream = activeChatClient.createStreamingChatCompletion(
					messagesSoFar,
					activeCompletionOptions,
				)
				for await (const event of stream) {
					switch (event.type) {
						case "start":
							conversation.isLoading = true
							conversation.additionalMessages.push({
								role: "assistant",
								content: "",
								attachedContent: [],
							})
							break
						case "delta":
							conversation.isLoading = true
							if (
								conversation.additionalMessages.length > 0 &&
								conversation.additionalMessages.last()!.role === "assistant"
							) {
								conversation.additionalMessages.last()!.content += event.content
							}
							break
						case "stop":
							conversation.isLoading = false
					}
					store.set(conversation)
				}
			} catch (e) {
				conversation.isLoading = false
				conversation.error = e
				store.set(conversation)
			}
		}
	}

	return {
		subscribe: store.subscribe,
		configure,
		submitMessage,
		resetConversation,
	}
}
