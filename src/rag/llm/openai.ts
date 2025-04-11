import OpenAI from "openai"
import { get } from "svelte/store"
import type { LlmPluginSettings } from "../../config/settings.ts"
import { settingsStore } from "src/utils/obsidian"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { messageWithAttachments, SELF_QUERY_EXAMPLES, SELF_QUERY_PROMPT } from "src/config/prompts"
import { nodeRepresentation, type Node } from "../node"
import {
	type ChatMessage,
	type ChatStreamEvent,
	type CompletionOptions,
	type EmbeddingClient,
	type QueryEmbedding,
	type StreamingChatCompletionClient,
	type Temperature,
} from "./common"


export class OpenAIChatCompletionClient implements StreamingChatCompletionClient {
	private client: OpenAI
	private apiKey: string
	private model: string

	constructor(apiKey: string, model: string, baseURL?: string) {
		this.client = new OpenAI({
			apiKey,
			baseURL: get(settingsStore).customModelUrl || undefined,
			dangerouslyAllowBrowser: true 
		})
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
					content: messageWithAttachments(message.content, message.attachedContent),
				}
			}),
			stream_options: { include_usage: true },
			max_tokens: options.maxTokens,
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
					content: messageWithAttachments(message.content, message.attachedContent),
				}
			}),
			max_tokens: options.maxTokens,
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
			max_tokens: options.maxTokens,
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

const IMPROVE_QUERY_MODEL = get(settingsStore)?.noteContextModel || "gpt-4o-mini-2024-07-18"
const IMPROVE_QUERY_TEMP = 0.1
const EMBEDDING_MODEL = "text-embedding-3-small"
const customEmbeddingModel = get(settingsStore)?.customEmbeddingModelName || EMBEDDING_MODEL

export class OpenAIEmbeddingClient implements EmbeddingClient {
	private client: OpenAI | undefined
	private apiKey: string
	private model: string
	private improveQueryModel: string
	private baseURL: string | undefined

	constructor(
		apiKey: string,
		improveQueryModel: string,
		baseURL: string = "" // Initialize with an empty string
	) {
		this.apiKey = apiKey;  // Store API key
		this.improveQueryModel = improveQueryModel // Chat model for RAG query improvement
		this.baseURL = baseURL;
		this.model = customEmbeddingModel || EMBEDDING_MODEL; // use default value initially
		this.initialize() // Start the initialization process
	}

	private async initialize() {
		await this.applySettings()
		await this.initializeClient()
	}

    private async applySettings() {
		this.apiKey = get(settingsStore).customEmbeddingModelApiKey || this.apiKey
		this.improveQueryModel = get(settingsStore).noteContextModel || this.improveQueryModel
		this.model = get(settingsStore).customEmbeddingModelName || this.model
		this.baseURL = get(settingsStore).customEmbeddingModelUrl || this.baseURL
    }

	public async initializeClient() {
        this.client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL, dangerouslyAllowBrowser: true })
        console.log("[Embedding] Initialized client with base URL:", this.baseURL)
	}

	async embedNode(node: Node): Promise<number[]> {
		if (!this.client) {
			throw new Error("OpenAI client not initialized yet.  Please wait for settings to load.")
		}

		console.log("[Embedding] Using model:", this.model) // debugging line
		console.log("[Embedding] Using base URL:", this.baseURL) // debugging line
		console.log("[Embedding] Using API Key:", this.apiKey) // debugging line
		console.log("[Embedding] Using improveQueryModel:", this.improveQueryModel) // debugging line

		if (this.apiKey === "") {
			throw new Error(
				"OpenAI API key is not set. Embeddings always use the OpenAI API and need an API key regardless of the LLM setting.",
			)
		}

		const response = await this.client.embeddings.create({
			input: nodeRepresentation(node),
			model: this.model,
		})

		return response.data[0].embedding;
	}

	async embedQuery(query: string): Promise<QueryEmbedding> {
		if (!this.client) {
			throw new Error("OpenAI client not initialized yet. Please wait for settings to load.")
		}
		if (this.apiKey === "") {
			throw new Error(
				"OpenAI API key is not set. Embeddings always use the OpenAI API and need an API key regardless of the LLM setting.",
			)
		}

		const improvedQuery = await this.improveQuery(query);
		const response = await this.client.embeddings.create({
			input: improvedQuery,
			model: this.model,
		})

		return {
			originalQuery: query,
			improvedQuery: improvedQuery,
			embedding: response.data[0].embedding,
		}
	}

	private async improveQuery(query: string): Promise<string> {
		const messages = [
			{
				role: "system",
				content: SELF_QUERY_PROMPT,
			},
			...SELF_QUERY_EXAMPLES.flatMap((example) => {
				return [
					{ role: "user", content: example.input },
					{ role: "assistant", content: example.output },
				];
			}),
			{
				role: "user",
				content: query,
			},
		] as ChatCompletionMessageParam[];

		if (!this.client) {
			throw new Error("OpenAI client not initialized yet. Please wait for settings to load.");
		}
		const completion = await this.client.chat.completions.create({
			messages,
			model: this.improveQueryModel,
			temperature: IMPROVE_QUERY_TEMP,
		})

		return completion.choices[0].message.content!;
	}
}
