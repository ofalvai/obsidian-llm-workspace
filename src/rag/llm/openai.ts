import { COMPLETION_MODEL, COMPLETION_TEMPERATURE, EMBEDDING_MODEL } from "src/config/openai"
import { SELF_QUERY_EXAMPLES, SELF_QUERY_PROMPT } from "src/config/prompts"
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources"
import type { Node } from "../node"
import {
	type ChatCompletionClient,
	type ChatMessage,
	type CompletionOptions,
	type EmbeddingClient,
	type QueryEmbedding,
} from "./common"

export class OpenAIChatCompletionClient implements ChatCompletionClient {
	private client: OpenAI
	private model: string

	constructor(apiKey: string, model: string) {
		this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
		this.model = model
	}

	async createChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<ChatMessage> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: messages.map((message) => {
				return {
					role: message.role,
					content: message.content,
				}
			}),
			max_tokens: options.maxTokens,
			temperature: options.temperature,
		})

		return {
			content: response.choices[0].message.content!,
			role: "assistant",
		}
	}

	async createJSONCompletion<T>(systemPrompt: string, userPrompt: string, options: CompletionOptions): Promise<T> {
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
			temperature: options.temperature,
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

export class OpenAIEmbeddingClient implements EmbeddingClient {
	private client: OpenAI

	constructor(apiKey: string) {
		this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
	}

	async embedNode(node: Node): Promise<number[]> {
		const response = await this.client.embeddings.create({
			input: node.content,
			model: EMBEDDING_MODEL,
		})

		return response.data[0].embedding
	}

	async embedQuery(query: string): Promise<QueryEmbedding> {
		const improvedQuery = await this.improveQuery(query)
		const response = await this.client.embeddings.create({
			input: improvedQuery,
			model: EMBEDDING_MODEL,
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
				]
			}),
			{
				role: "user",
				content: query,
			},
		] as ChatCompletionMessageParam[]

		const completion = await this.client.chat.completions.create({
			messages,
			model: COMPLETION_MODEL,
			temperature: COMPLETION_TEMPERATURE,
		})
		return completion.choices[0].message.content!
	}
}
