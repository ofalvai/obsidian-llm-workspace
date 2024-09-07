import type { Node } from "../node"

export interface EmbeddingClient {
	embedNode(node: Node): Promise<number[]>
	embedQuery(query: string): Promise<QueryEmbedding>
}

export type Role = "system" | "user" | "assistant"

export interface ChatMessage {
	content: string
	role: Role
	attachedContent: Node[]
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
	// Implementation-specific temp number for debugging purposes
	temeperature: number
}

export interface Usage {
	inputTokens: number
	outputTokens: number
}

export type ChatStreamEvent = ChatStartEvent | ChatDeltaEvent | ChatStopEvent

// Temperature is defined as an enum and then mapped to provider-specific values
export type Temperature = "balanced" | "creative" | "precise"

export interface CompletionOptions {
	temperature: Temperature
	maxTokens: number
}

export interface ChatCompletionClient {
	get displayName(): string
	createChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<ChatMessage>
	createJSONCompletion<T>(
		systemPrompt: string,
		userPrompt: string,
		options: CompletionOptions,
	): Promise<T>
}

export type StreamingChatCompletionClient = ChatCompletionClient & {
	createStreamingChatCompletion: (
		messages: ChatMessage[],
		options: CompletionOptions,
	) => AsyncGenerator<ChatStreamEvent>
}

export interface QueryEmbedding {
	originalQuery: string
	improvedQuery: string
	embedding: number[]
}
