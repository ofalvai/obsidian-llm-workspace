import type { Node } from "../node"

export interface EmbeddingClient {
	embedNode(node: Node): Promise<number[]>
	embedQuery(query: string): Promise<QueryEmbedding>
}

export enum Role {
	System = 0,
	User = 1,
	Assistant = 2,
}

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
	createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage>
}

export interface QueryEmbedding {
	originalQuery: string
	improvedQuery: string
	embedding: number[]
}




