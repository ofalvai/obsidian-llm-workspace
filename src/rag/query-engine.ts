import type { Retriever } from "./retriever"
import type { QueryResponse, ResponseSynthesizer } from "./synthesizer"

export interface QueryEngine {
	query(query: string, workspaceFilePath: string): Promise<QueryResponse>
}

export class RetrieverQueryEngine {
	private retriever: Retriever
	private synthesizer: ResponseSynthesizer

	constructor(retriever: Retriever, synthesizer: ResponseSynthesizer) {
		this.retriever = retriever
		this.synthesizer = synthesizer
	}

	async query(query: string, workspaceFilePath: string): Promise<QueryResponse> {
		const result = await this.retriever.retrieve(query, workspaceFilePath)
		return this.synthesizer.synthesize(query, result.nodes, result.improvedQuery)
	}
}
