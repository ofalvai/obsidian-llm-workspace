import { get, writable, type Readable } from "svelte/store"
import type { Conversation } from "../rag/conversation"
import type { ChatMessage, CompletionOptions, StreamingChatCompletionClient } from "../rag/llm/common"
import type { QueryEngine } from "../rag/query-engine"

export type ConversationStore = Readable<Conversation | null> & {
	submitMessage: (newMessage: string) => Promise<void>
	resetConversation: () => void
}

export const conversationStore = (
	queryEngine: QueryEngine,
	chatClient: StreamingChatCompletionClient,
	completionOptions: CompletionOptions,
): ConversationStore => {
	const store = writable<Conversation | null>(null)

	const resetConversation = () => store.set(null)

	const submitMessage = async (newMessage: string) => {
		let conversation = get(store)

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
				for await (const update of queryEngine.query(newMessage)) {
					conversation.queryResponse = update
					conversation.isLoading = true
					store.set(conversation)
				}
				conversation.isLoading = false
				store.set(conversation)
			} catch (e) {
				console.error(e)
				conversation.isLoading = false
				conversation.error = e
				store.set(conversation)
			}
		} else {
			conversation.additionalMessages.push({
				role: "user",
				content: newMessage,
			})
			conversation.isLoading = true
			store.set(conversation)

			const messages: ChatMessage[] = [
				{
					role: "system",
					content: conversation.queryResponse.systemPrompt,
				},
				{
					role: "user",
					content: conversation.queryResponse.userPrompt,
				},
				{
					role: "assistant",
					content: conversation.queryResponse.text,
				},
				...conversation.additionalMessages,
			]
			try {
				const stream = chatClient.createStreamingChatCompletion(messages, completionOptions)
				for await (const event of stream) {
					switch (event.type) {
						case "start":
							conversation.isLoading = true
							conversation.additionalMessages.push({
								role: "assistant",
								content: "",
							})
							break
						case "delta":
							conversation.isLoading = true
							if (conversation.additionalMessages.length > 0) {
								conversation.additionalMessages.last()!.content += event.content
							}
							break
						case "stop":
							conversation.isLoading = false
					}
					store.set(conversation)
				}
			} catch (e) {
				console.error(e)
				conversation.isLoading = false
				conversation.error = e
				store.set(conversation)
			}
		}
	}

	return {
		subscribe: store.subscribe,
		submitMessage,
		resetConversation,
	}
}
