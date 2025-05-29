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

export const testConnection = async (apiKey: string, baseURL?: string): Promise<boolean> => {
	const client = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true })
	const list = await client.models.list()
	return list.data.length > 0
}

export const listAvailableModels = async (baseUrl: string, apiKey: string): Promise<string[]> => {
	const client = new OpenAI({ baseURL: baseUrl, apiKey, dangerouslyAllowBrowser: true })
	try {
		const list = await client.models.list()
		return list.data.map((model) => model.id)
	} catch (error) {
		console.error("Failed to list models from OpenAI-compatible API:", error)
		return []
	}
}

export class OpenAIChatCompletionClient implements StreamingChatCompletionClient {
	private client: OpenAI
	private apiKey: string
	private isCustomBaseURL: boolean
	private model: string

	constructor(apiKey: string, model: string, baseURL?: string) {
		let _baseURL = baseURL
		if (baseURL && !baseURL?.endsWith("/v1")) {
			_baseURL = baseURL + "/v1"
		}
		this.client = new OpenAI({ apiKey, baseURL: _baseURL, dangerouslyAllowBrowser: true })
		this.apiKey = apiKey
		this.isCustomBaseURL = _baseURL !== undefined
		this.model = model
	}

	get displayName(): string {
		return this.isCustomBaseURL
			? `${this.model} via OpenAI-compatible API`
			: `OpenAI ${this.model}`
	}

	async *createStreamingChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): AsyncGenerator<ChatStreamEvent> {
		if (!this.isCustomBaseURL && this.apiKey === "")
			throw new Error("OpenAI API key is not set")

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
		if (!this.isCustomBaseURL && this.apiKey === "")
			throw new Error("OpenAI API key is not set")

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
		if (!this.isCustomBaseURL && this.apiKey === "")
			throw new Error("OpenAI API key is not set")

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
	private isCustomBaseURL: boolean

	constructor(
		apiKey: string,
		embeddingModel: string,
		chatClient: ChatCompletionClient,
		baseURL?: string,
	) {
		this.openaiClient = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true })
		this.chatClient = chatClient
		this.apiKey = apiKey
		this.embeddingModel = embeddingModel
		this.isCustomBaseURL = baseURL !== undefined
	}

	async embedNode(node: Node): Promise<number[]> {
		if (!this.isCustomBaseURL && this.apiKey === "")
			throw new Error("OpenAI API key is not set. Please set it in the plugin settings.")

		const response = await this.openaiClient.embeddings.create({
			input: nodeRepresentation(node),
			model: this.embeddingModel,

			// OpenAI client library automatically converts embeddings to base64 format
			// unless "float" is requested explicitly.
			// This is normally not an issue, but it breaks compatibility with some OpenAI-compatible APIs
			// that still expect float32 arrays.
			// https://github.com/openai/openai-node/pull/1312
			encoding_format: "float",
		})

		return response.data[0].embedding
	}

	async embedQuery(query: string): Promise<QueryEmbedding> {
		if (!this.isCustomBaseURL && this.apiKey === "")
			throw new Error("OpenAI API key is not set. Please set it in the plugin settings.")

		const improvedQuery = await this.improveQuery(query)
		const response = await this.openaiClient.embeddings.create({
			input: improvedQuery,
			model: this.embeddingModel,

			// OpenAI client library automatically converts embeddings to base64 format
			// unless "float" is requested explicitly.
			// This is normally not an issue, but it breaks compatibility with some OpenAI-compatible APIs
			// that still expect float32 arrays.
			// https://github.com/openai/openai-node/pull/1312
			encoding_format: "float",
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
