import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Node } from "./node";

const selfQueryPrompt = `
Your goal is to rewrite the user's question into search keywords.
`;
const examples = [
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
];

export interface EmbeddingClient {
	embedNode(node: Node): Promise<number[]>;
	embedQuery(query: string): Promise<number[]>;
}

export enum Role {
	System = 0,
	User = 1,
	Assistant = 2
}

export interface ChatMessage {
	content: string;
	role: Role;
}

export interface CompletionOptions {
	model: string,
	temperature: number,
}

export interface ChatCompletionClient {
	createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage>
}

export class OpenAIChatCompletionClient implements ChatCompletionClient {
	private client: OpenAI;
	private options: CompletionOptions;

	constructor(apiKey: string, options: CompletionOptions) {
		this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
		this.options = options;
	}

	async createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage> {
		const response = await this.client.chat.completions.create({
			model: this.options.model,
			messages: [
				{
					role: "system",
					content: systemPrompt
				},
				{
					role: "user",
					content: userPrompt
				}
			]
		})

		return {
			content: response.choices[0].message.content!,
			role: Role.Assistant
		}
	}
}

export class OpenAIEmbeddingClient implements EmbeddingClient {
	private client: OpenAI;

	constructor(apiKey: string) {
		this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
	}

	async embedNode(node: Node): Promise<number[]> {
		const response = await this.client.embeddings.create({
			input: node.content,
			model: "text-embedding-ada-002"
		});

		return response.data[0].embedding;
	}

	async embedQuery(query: string): Promise<number[]> {
		const improvedQuery = await this.improveQuery(query);
		// TODO: return improved query for the UI
		console.log("Improved query:", improvedQuery);
		const response = await this.client.embeddings.create({
			input: improvedQuery,
			model: "text-embedding-ada-002"
		});
		return response.data[0].embedding;
	}

	private async improveQuery(query: string): Promise<string> {
		const messages = [
			{
				role: 'system',
				content: selfQueryPrompt,
			},
			...examples.flatMap((example) => {
				return [
					{ role: 'user', content: example.input },
					{ role: 'assistant', content: example.output },
				];
			}),
			{
				role: "user",
				content: query,
			}
		] as ChatCompletionMessageParam[];

		const completion = await this.client.chat.completions.create({
			messages,
			model: "gpt-3.5-turbo-1106",
			temperature: 0.1,
		});
		return completion.choices[0].message.content!;
	}
}
