import { ChatCompletionClient } from "./llm"
import { NodeSimilarity } from "./storage"

export interface QueryResponse {
	text: string
	sources: NodeSimilarity[]
}

export interface ResponseSynthesizer {
	synthesize(query: string, nodes: NodeSimilarity[]): Promise<QueryResponse>
}

const defaultSynthesisUserPrompt = (context: string, query: string) => {
	return `Given the context information and not prior knowledge, answer the query.
Context information is below.
---------------------
${context}
---------------------
Query: ${query}
Answer:`
}

export class DumbResponseSynthesizer implements ResponseSynthesizer {
	private completionClient: ChatCompletionClient
	private systemPrompt: string

	constructor(completionClient: ChatCompletionClient, systemPrompt: string) {
		this.completionClient = completionClient
		this.systemPrompt = systemPrompt
	}

	async synthesize(query: string, nodes: NodeSimilarity[]): Promise<QueryResponse> {
		const context = nodes
			.reverse() // TODO: knowledge is better recalled towards the end of window?
			.map((n) => `${n.node.parent}\n${n.node.content}`)
			.join("\n\n")
		const userPrompt = defaultSynthesisUserPrompt(context, query)
		const systemPrompt = this.systemPrompt
		const response = await this.completionClient.createChatCompletion(userPrompt, systemPrompt)

		return {
			text: response.content,
			sources: nodes,
		}
	}
}
