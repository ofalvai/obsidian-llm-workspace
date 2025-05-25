import OpenAI from "openai"
import { messageWithAttachmens, SELF_QUERY_EXAMPLES, SELF_QUERY_PROMPT } from "src/config/prompts"
import { nodeRepresentation, type Node } from "../node"
import {
	type ChatCompletionClient,
	type ChatMessage,
	type ChatStreamEvent,
	type CompletionOptions,
	type EmbeddingClient,
	type QueryEmbedding,
	type StreamingChatCompletionClient,
	type Temperature,
} from "./common"

export const testConnection = async (apiKey: string, baseUrl?: string): Promise<boolean> => {
	const client = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true })
	const list = await client.models.list()
	return list.data.length > 0
}

export class OpenAIChatCompletionClient implements StreamingChatCompletionClient {
	private client: OpenAI
	private apiKey: string
	private model: string

	constructor(apiKey: string, model: string, baseUrl?: string) {
		this.client = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true })
		this.apiKey = apiKey
		this.model = model
	}

	get displayName(): string {
		return `OpenAI ${this.model}`
	}

	async *createStreamingChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): AsyncGenerator<ChatStreamEvent> {
		if (this.apiKey === "") throw new Error("OpenAI API key is not set")

		const stream = await this.client.chat.completions.create({
			model: this.model,
			stream: true,
			messages: messages.map((message) => {
				return {
					role: message.role,
					content: messageWithAttachmens(message.content, message.attachedContent),
				}
			}),
			stream_options: { include_usage: true },
			max_completion_tokens: options.maxTokens,
			temperature: temperature(options.temperature),
		})

		let inputTokens = 0
		let outputTokens = 0
		let cachedInputTokens = 0
		yield { type: "start" }
		for await (const chunk of stream) {
			if (chunk.usage) {
				inputTokens += chunk.usage.prompt_tokens
				outputTokens += chunk.usage.completion_tokens
				cachedInputTokens += chunk.usage.prompt_tokens_details?.cached_tokens ?? 0
			}
			if (chunk.choices.length > 0) {
				yield { content: chunk.choices[0].delta.content ?? "", type: "delta" }
			}
		}
		yield {
			type: "stop",
			usage: { inputTokens, outputTokens, cachedInputTokens },
			temperature: temperature(options.temperature),
		}
	}

	async createChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): Promise<ChatMessage> {
		if (this.apiKey === "") throw new Error("OpenAI API key is not set")

		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: messages.map((message) => {
				return {
					role: message.role,
					content: messageWithAttachmens(message.content, message.attachedContent),
				}
			}),
			max_completion_tokens: options.maxTokens,
			temperature: temperature(options.temperature),
		})

		return {
			content: response.choices[0].message.content!,
			role: "assistant",
			attachedContent: [],
		}
	}

	async createJSONCompletion<T>(
		systemPrompt: string,
		userPrompt: string,
		options: CompletionOptions,
	): Promise<T> {
		if (this.apiKey === "") throw new Error("OpenAI API key is not set")

		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userPrompt,
				},
			],
			response_format: { type: "json_object" },
			max_completion_tokens: options.maxTokens,
			temperature: temperature(options.temperature),
		})

		try {
			return JSON.parse(response.choices[0].message.content!) as T
		} catch (error) {
			throw new Error(
				`LLM response could not be parsed to JSON schema: ${error}\nResponse: ${response.choices[0].message.content}`,
			)
		}
	}
}

function temperature(t: Temperature): number {
	switch (t) {
		case "balanced":
			return 0.5
		case "creative":
			return 1
		case "precise":
			return 0.2
	}
}

export class OpenAIEmbeddingClient implements EmbeddingClient {
	private openaiClient: OpenAI
	private chatClient: ChatCompletionClient
	private apiKey: string
	private embeddingModel: string

	constructor(apiKey: string, embeddingModel: string, chatClient: ChatCompletionClient, baseUrl?: string) {
		this.openaiClient = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true })
		this.chatClient = chatClient
		this.apiKey = apiKey
		this.embeddingModel = embeddingModel
	}

	async embedNode(node: Node): Promise<number[]> {
		if (this.apiKey === "")
			throw new Error(
				"OpenAI API key is not set. Note embeddings always use the OpenAI API and need an API key regardless of the LLM setting.",
			)

		const response = await this.openaiClient.embeddings.create({
			input: nodeRepresentation(node),
			model: this.embeddingModel,
		})

		return response.data[0].embedding
	}

	async embedQuery(query: string): Promise<QueryEmbedding> {
		if (this.apiKey === "")
			throw new Error(
				"OpenAI API key is not set. Embeddings always use the OpenAI API and need an API key regardless of the LLM setting.",
			)

		const improvedQuery = await this.improveQuery(query)
		const response = await this.openaiClient.embeddings.create({
			input: improvedQuery,
			model: this.embeddingModel,
		})
		return {
			originalQuery: query,
			improvedQuery: improvedQuery,
			embedding: response.data[0].embedding,
		}
	}

	private async improveQuery(query: string): Promise<string> {
		const messages: ChatMessage[] = [
			{
				role: "system",
				content: SELF_QUERY_PROMPT,
				attachedContent: [],
			},
			...SELF_QUERY_EXAMPLES.flatMap<ChatMessage>((example) => {
				return [
					{ role: "user", content: example.input, attachedContent: [] },
					{ role: "assistant", content: example.output, attachedContent: [] },
				]
			}),
			{
				role: "user",
				content: query,
				attachedContent: [],
			},
		]

		const completion = await this.chatClient.createChatCompletion(messages, {
			temperature: "precise",
			maxTokens: 500,
		})
		return completion.content
	}
}
