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

export interface ChatStartEvent {
	type: "start"
	// Placeholder for now, we could add non-content fields here
}

export interface ChatDeltaEvent {
	type: "delta"
	content: string
}

export interface ChatStopEvent {
	type: "stop"
	usage?: Usage
}

export interface Usage {
	inputTokens: number
	outputTokens: number
}

export type ChatStreamEvent = ChatStartEvent | ChatDeltaEvent | ChatStopEvent

export interface CompletionOptions {
	temperature: number
	maxTokens: number
}

export interface ChatCompletionClient {
	get displayName(): string
	createChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<ChatMessage>
	createJSONCompletion<T>(systemPrompt: string, userPrompt: string, options: CompletionOptions): Promise<T>
}

export type StreamingChatCompletionClient = ChatCompletionClient & {
	createStreamingChatCompletion: (messages: ChatMessage[], options: CompletionOptions) => AsyncGenerator<ChatStreamEvent>
}

export interface QueryEmbedding {
	originalQuery: string
	improvedQuery: string
	embedding: number[]
}
