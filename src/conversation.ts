import { get, writable, type Readable } from "svelte/store"
import type { Conversation } from "./rag/conversation"
import type { ChatCompletionClient, ChatMessage, CompletionOptions } from "./rag/llm/common"
import type { QueryEngine } from "./rag/query-engine"

export type ConversationStore = Readable<Conversation | null> & {
	submitMessage: (newMessage: string) => Promise<void>
	resetConversation: () => void
}

export const conversationStore = (
	queryEngine: QueryEngine,
	chatClient: ChatCompletionClient,
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
			}
			store.set(conversation)
			try {
				const response = await queryEngine.query(newMessage)
				conversation.queryResponse = response
				conversation.isLoading = false
				store.set(conversation)
			} catch (e) {
				console.error(e)
				conversation.isLoading = false
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
					content: conversation.queryResponse.debugInfo.systemPrompt,
				},
				{
					role: "user",
					content: conversation.queryResponse.debugInfo.userPrompt,
				},
				{
					role: "assistant",
					content: conversation.queryResponse.text,
				},
				...conversation.additionalMessages,
			]
			try {
				const response = await chatClient.createChatCompletion(messages, completionOptions)
				conversation.additionalMessages.push({
					role: response.role,
					content: response.content,
				})
				conversation.isLoading = false
				store.set(conversation)
			} catch (e) {
				console.error(e)
				conversation.isLoading = false
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

