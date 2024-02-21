import { defaultSynthesisUserPrompt } from "config/prompts"
import { ChatCompletionClient } from "./llm"
import { NodeSimilarity } from "./storage"

export interface QueryResponse {
	text: string
	sources: NodeSimilarity[]
	debugInfo?: DebugInfo
}

// TODO: add inpput/output token usage
// TODO: add response string
// TODO: add response time
export interface DebugInfo {
	systemPrompt: string
	userPrompt: string
	originalQuery: string
	improvedQuery: string
	createdAt: number
}

export interface ResponseSynthesizer {
	synthesize(
		query: string,
		nodes: NodeSimilarity[],
		improvedQuery: string
	): Promise<QueryResponse>
}

export class DumbResponseSynthesizer implements ResponseSynthesizer {
	private completionClient: ChatCompletionClient
	private systemPrompt: string
	private debug: boolean

	constructor(completionClient: ChatCompletionClient, systemPrompt: string, debug: boolean) {
		this.completionClient = completionClient
		this.systemPrompt = systemPrompt
		this.debug = debug
	}

	async synthesize(
		query: string,
		nodes: NodeSimilarity[],
		improvedQuery: string
	): Promise<QueryResponse> {
		const context = nodes
			.reverse() // TODO: knowledge is better recalled towards the end of window?
			.map((n) => `${n.node.parent}\n${n.node.content}`)
			.join("\n\n")
		const userPrompt = defaultSynthesisUserPrompt(context, query)
		const systemPrompt = this.systemPrompt
		const result = await this.completionClient.createChatCompletion(userPrompt, systemPrompt)

		const response: QueryResponse = {
			text: result.content,
			sources: nodes,
		}

		if (this.debug) {
			response.debugInfo = {
				systemPrompt: systemPrompt,
				userPrompt: userPrompt,
				originalQuery: query,
				improvedQuery: improvedQuery,
				createdAt: Date.now(),
			}
		}

		return response
	}
}
