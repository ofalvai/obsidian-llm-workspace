import { Node } from "./node";
import { Retriever } from "./retriever";
import { QueryResponse, ResponseSynthesizer } from "./synthesizer";

export interface QueryEngine {
	query(query: string, workspaceFilePath: string): Promise<QueryResponse>;
}

export class RetrieverQueryEngine {
	private retriever: Retriever;
	private synthesizer: ResponseSynthesizer;

	constructor(retriever: Retriever, synthesizer: ResponseSynthesizer) {
		this.retriever = retriever;
		this.synthesizer = synthesizer;
	}

	async query(
		query: string,
		workspaceFilePath: string
	): Promise<QueryResponse> {
		const nodes = await this.retriever.retrieve(query, workspaceFilePath);
		return this.synthesizer.synthesize(query, nodes);
	}
}
