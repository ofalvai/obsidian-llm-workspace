import type { Retriever } from "./retriever"
import type { QueryResponse, ResponseSynthesizer } from "./synthesizer"
import type { Node } from "./node"

export interface QueryEngine {
	query(query: string, attachedContent: Node[]): AsyncGenerator<QueryResponse>
}

export class RetrieverQueryEngine implements QueryEngine {
	private retriever: Retriever
	private synthesizer: ResponseSynthesizer
	private workspaceFilePath: string

	constructor(retriever: Retriever, synthesizer: ResponseSynthesizer, workspaceFilePath: string) {
		this.retriever = retriever
		this.synthesizer = synthesizer
		this.workspaceFilePath = workspaceFilePath
	}

	async *query(query: string, attachedContent: Node[]): AsyncGenerator<QueryResponse> {
		const result = await this.retriever.retrieve(query, this.workspaceFilePath)
		const nodes = [
			...result.nodes,
			...attachedContent.map((node) => {
				return {
					node: node,
					similarity: 1,
				}
			}),
		]
		yield* this.synthesizer.synthesize(query, nodes, result.improvedQuery)
	}
}

export class SingleNoteQueryEngine implements QueryEngine {
	private synthesizer: ResponseSynthesizer
	private content: string
	private notePath: string

	constructor(synthesizer: ResponseSynthesizer, content: string, notePath: string) {
		this.synthesizer = synthesizer
		this.content = content
		this.notePath = notePath
	}

	async *query(query: string, attachedContent: Node[]): AsyncGenerator<QueryResponse> {
		const nodes = [
			{
				node: {
					content: this.content,
					parent: this.notePath,
					createdAt: new Date().valueOf(),
				},
				similarity: 1,
			},
			...attachedContent.map((node) => {
				return {
					node: node,
					similarity: 1,
				}
			}),
		]
		yield* this.synthesizer.synthesize(query, nodes, query)
	}
}
