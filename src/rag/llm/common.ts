import type { Node } from "../node"

export interface EmbeddingClient {
	embedNode(node: Node): Promise<number[]>
	embedQuery(query: string): Promise<QueryEmbedding>
}

export type Role = "system" | "user" | "assistant"

export interface ChatMessage {
	content: string
	role: Role
}

export interface CompletionOptions {
	model: string
	temperature: number
	maxTokens: number
}

export interface ChatCompletionClient {
	createChatCompletion(messages: ChatMessage[]): Promise<ChatMessage>
}

export interface QueryEmbedding {
	originalQuery: string
	improvedQuery: string
	embedding: number[]
}




