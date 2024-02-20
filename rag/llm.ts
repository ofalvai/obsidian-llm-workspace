import OpenAI from "openai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { Node } from "./node"

const SELF_QUERY_PROMPT = `
Your goal is to rewrite the user's question into search keywords.
`
const EXAMPLES = [
	{
		input: "How do I make a pie?",
		output: "make a pie",
	},
	{
		input: "What were the major contributions of Joseph Swan to the development of the incandescent light bulb?",
		output: "Joseph Swan's contribution to development of incandescent light bulb",
	},
	{
		input: "What is the difference between a solid and a liquid?",
		output: "solid and liquid difference",
	},
	{
		input: "What are the odds for slot machines?",
		output: "slot machine odds",
	},
]

const EMBEDDING_MODEL = "text-embedding-3-small"

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
}

export interface ChatCompletionClient {
	createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage>
}

export interface QueryEmbedding {
	originalQuery: string
	improvedQuery: string
	embedding: number[]
}

export class OpenAIChatCompletionClient implements ChatCompletionClient {
	private client: OpenAI
	private options: CompletionOptions

	constructor(apiKey: string, options: CompletionOptions) {
		this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
		this.options = options
	}

	async createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage> {
		const response = await this.client.chat.completions.create({
			model: this.options.model,
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
		})

		return {
			content: response.choices[0].message.content!,
			role: Role.Assistant,
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
			...EXAMPLES.flatMap((example) => {
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
			model: "gpt-3.5-turbo-1106",
			temperature: 0.1,
		})
		return completion.choices[0].message.content!
	}
}
