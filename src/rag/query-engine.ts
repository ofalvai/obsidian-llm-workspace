import type { Retriever } from "./retriever"
import type { QueryResponse, ResponseSynthesizer } from "./synthesizer"

export interface QueryEngine {
	query(query: string): AsyncGenerator<QueryResponse>
}

export class RetrieverQueryEngine {
	private retriever: Retriever
	private synthesizer: ResponseSynthesizer
	private workspaceFilePath: string

	constructor(retriever: Retriever, synthesizer: ResponseSynthesizer, workspaceFilePath: string) {
		this.retriever = retriever
		this.synthesizer = synthesizer
		this.workspaceFilePath = workspaceFilePath
	}

	async *query(query: string): AsyncGenerator<QueryResponse> {
		const result = await this.retriever.retrieve(query, this.workspaceFilePath)
		yield *this.synthesizer.synthesize(query, result.nodes, result.improvedQuery)
	}
}

export class SingleNoteQueryEngine {

	private synthesizer: ResponseSynthesizer
	private content: string
	private notePath: string

	constructor(synthesizer: ResponseSynthesizer, content: string, notePath: string) {
		this.synthesizer = synthesizer
		this.content = content
		this.notePath = notePath
	}

	async *query(query: string): AsyncGenerator<QueryResponse> {
		const node = {
			node: {
				content: this.content,
				parent: this.notePath,
				createdAt: new Date().valueOf(),
			},
			similarity: 1,
		}
		yield *this.synthesizer.synthesize(query, [node], query)
	}
}
