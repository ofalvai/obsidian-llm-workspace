import { SELF_QUERY_EXAMPLES, SELF_QUERY_PROMPT } from "src/config/prompts"
import { nodeRepresentation, type Node } from "src/rag/node"
import type { ChatCompletionClient, ChatMessage, EmbeddingClient, QueryEmbedding } from "../common"
import type { EmbeddingResponse } from "./types"

export class OllamaEmbeddingClient implements EmbeddingClient {
	private url: string
	private model: string
	private chatClient: ChatCompletionClient

	constructor(url: string, model: string, chatClient: ChatCompletionClient) {
		this.chatClient = chatClient
		this.url = url
		this.model = model
	}

	async embedNode(node: Node): Promise<number[]> {
		if (this.url === "") {
			throw new Error("Ollama URL is not set")
		}

		const resp = await this.makeEmbeddingRequest(nodeRepresentation(node))
		const embeddingResponse = (await resp.json()) as EmbeddingResponse

		if (embeddingResponse.embeddings.length === 0) {
			throw new Error("Ollama returned no embeddings")
		}
		return embeddingResponse.embeddings[0]
	}

	async embedQuery(query: string): Promise<QueryEmbedding> {
		if (this.url === "") {
			throw new Error("Ollama URL is not set")
		}

		const improvedQuery = await this.improveQuery(query)
		const resp = await this.makeEmbeddingRequest(improvedQuery)
		const embeddingResponse = (await resp.json()) as EmbeddingResponse

		if (embeddingResponse.embeddings.length === 0) {
			throw new Error("Ollama returned no embeddings")
		}
		return {
			originalQuery: query,
			improvedQuery: improvedQuery,
			embedding: embeddingResponse.embeddings[0],
		}
	}

	private async makeEmbeddingRequest(input: string): Promise<Response> {
		const resp = await fetch(`${this.url}/api/embed`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				input: input,
				truncate: false,
			}),
		})

		if (resp.status < 200 || resp.status >= 400) {
			const respJson = await resp.json()
			if (respJson.error) {
				return Promise.reject("Ollama response: " + respJson.error)
			}
			return Promise.reject(resp.text)
		}
		return resp
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

		const response = await this.chatClient.createChatCompletion(messages, {
			temperature: "precise",
			maxTokens: 1024,
		})
		return response.content
	}
}
