import { defaultSynthesisUserPrompt } from "src/config/prompts"
import type { CompletionOptions, StreamingChatCompletionClient } from "./llm/common"
import type { NodeSimilarity } from "./storage"

export interface QueryResponse {
	text: string

	sources: NodeSimilarity[]

	systemPrompt: string
	userPrompt: string

	// Debug info is not present while the response is being streamed
	debugInfo?: DebugInfo
}

// TODO: add response string
// TODO: add response time
export interface DebugInfo {
	originalQuery: string
	improvedQuery: string
	createdAt: number
	inputTokens?: number
	outputTokens?: number
	temperature: number
}

export interface ResponseSynthesizer {
	synthesize(
		query: string,
		nodes: NodeSimilarity[],
		improvedQuery: string,
	): AsyncGenerator<QueryResponse>
}

export class DumbResponseSynthesizer implements ResponseSynthesizer {
	private completionClient: StreamingChatCompletionClient
	private completionOptions: CompletionOptions
	private systemPrompt: string
	private workspaceContext: string | null

	constructor(
		completionClient: StreamingChatCompletionClient,
		completionOptions: CompletionOptions,
		systemPrompt: string,
		workspaceContext: string | null = null,
	) {
		this.completionClient = completionClient
		this.completionOptions = completionOptions
		this.systemPrompt = systemPrompt
		this.workspaceContext = workspaceContext
	}

	async *synthesize(
		query: string,
		nodes: NodeSimilarity[],
		improvedQuery: string,
	): AsyncGenerator<QueryResponse> {
		let context = nodes
			.sort((a, b) => a.similarity - b.similarity) // put the most relevant nodes towards the end of context
			.map((n) => `${n.node.parent}\n${n.node.content}`)
			.join("\n\n---\n\n")
		if (this.workspaceContext) {
			context += "\n\n---\n\n"
			context += "High-level context provided by the user: "
			context += this.workspaceContext
		}
		const userPrompt = defaultSynthesisUserPrompt(context, query)
		const systemPrompt = this.systemPrompt

		const stream = this.completionClient.createStreamingChatCompletion(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			this.completionOptions,
		)

		let aggregatedText = ""
		for await (const event of stream) {
			switch (event.type) {
				case "start": {
					yield {
						text: aggregatedText,
						sources: nodes,
						systemPrompt,
						userPrompt,
					}
					break
				}
				case "delta": {
					aggregatedText += event.content
					yield {
						text: aggregatedText,
						sources: nodes,
						systemPrompt,
						userPrompt,
					}
					break
				}
				case "stop": {
					yield {
						text: aggregatedText,
						sources: nodes,
						systemPrompt,
						userPrompt,
						debugInfo: {
							originalQuery: query,
							improvedQuery: improvedQuery,
							createdAt: Date.now(),
							inputTokens: event.usage?.inputTokens,
							outputTokens: event.usage?.outputTokens,
							temperature: event.temeperature,
						},
					}
				}
			}
		}
	}
}
