import { ChatCompletionClient } from "./llm"
import { Node } from "./node"
import { NodeSimilarity } from "./storage"

export interface QueryResponse {
	text: string;
	sources: NodeSimilarity[];
}

export interface ResponseSynthesizer {
	synthesize(query: string, nodes: NodeSimilarity[]): Promise<QueryResponse>;
}

const defaultSynthesisSystemPrompt =
	"Given the context information and not prior knowledge, answer the query."
const defaultSynthesisUserPrompt = (context: string, query: string) => {
	return `Context information is below.
  ---------------------
  ${context}
  ---------------------
  Query: ${query}
  Answer:`
}

export class DumbResponseSynthesizer implements ResponseSynthesizer {
	private completionClient: ChatCompletionClient

	constructor(completionClient: ChatCompletionClient) {
		this.completionClient = completionClient
	}

	async synthesize(
		query: string,
		nodes: NodeSimilarity[]
	): Promise<QueryResponse> {
		const context = nodes
			.reverse() // knowledge is better recalled towards the end of window
			.map((n) => `${n.node.parent}\n${n.node.content}`)
			.join("\n\n")
		const userPrompt = defaultSynthesisUserPrompt(context, query)
		const systemPrompt = defaultSynthesisSystemPrompt
		const response = await this.completionClient.createChatCompletion(
			userPrompt,
			systemPrompt
		)

		return {
			text: response.content,
			sources: nodes,
		}
	}
}
