import { defaultSynthesisUserPrompt } from "src/config/prompts"
import type { ChatCompletionClient, CompletionOptions } from "./llm/common"
import type { NodeSimilarity } from "./storage"

export interface QueryResponse {
	text: string
	sources: NodeSimilarity[]
	debugInfo: DebugInfo
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
		improvedQuery: string,
	): Promise<QueryResponse>
}

export class DumbResponseSynthesizer implements ResponseSynthesizer {
	private completionClient: ChatCompletionClient
	private completionOptions: CompletionOptions
	private systemPrompt: string
	private workspaceContext: string | null

	constructor(
		completionClient: ChatCompletionClient,
		completionOptions: CompletionOptions,
		systemPrompt: string,
		workspaceContext: string | null,
	) {
		this.completionClient = completionClient
		this.completionOptions = completionOptions
		this.systemPrompt = systemPrompt
		this.workspaceContext = workspaceContext
	}

	async synthesize(
		query: string,
		nodes: NodeSimilarity[],
		improvedQuery: string,
	): Promise<QueryResponse> {
		let context = nodes
			.reverse() // TODO: knowledge is better recalled towards the end of window?
			.map((n) => `${n.node.parent}\n${n.node.content}`)
			.join("\n\n")
		if (this.workspaceContext) {
			context += "\n\n" + this.workspaceContext
		}
		const userPrompt = defaultSynthesisUserPrompt(context, query)
		const systemPrompt = this.systemPrompt
		const result = await this.completionClient.createChatCompletion([
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		], this.completionOptions)

		const response: QueryResponse = {
			text: result.content,
			sources: nodes,
			debugInfo: {
				systemPrompt: systemPrompt,
				userPrompt: userPrompt,
				originalQuery: query,
				improvedQuery: improvedQuery,
				createdAt: Date.now(),
			},
		}
		return response
	}
}
