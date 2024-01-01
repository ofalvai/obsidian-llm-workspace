import { EmbeddingClient } from "./llm"
import { NodeSimilarity, VectorStoreIndex } from "./storage"

export interface Retriever {
	retrieve(
		query: string,
		workspaceFilePath: string,
		limit?: number
	): Promise<NodeSimilarity[]>;
}

export interface RetrieverOptions {
	limit: number;
}

const defaultRetrieverOptions: RetrieverOptions = {
	limit: 10,
}

export class EmbeddingVectorRetriever {
	private index: VectorStoreIndex
	private embeddingClient: EmbeddingClient
	private options: RetrieverOptions

	constructor(
		index: VectorStoreIndex,
		embeddingClient: EmbeddingClient,
		options?: RetrieverOptions
	) {
		this.index = index
		this.embeddingClient = embeddingClient
		this.options = options ?? defaultRetrieverOptions
	}

	async retrieve(
		query: string,
		workspaceFilePath: string
	): Promise<NodeSimilarity[]> {
		const queryEmbedding = await this.embeddingClient.embedQuery(query)
		return this.index.query(
			queryEmbedding,
			workspaceFilePath,
			this.options.limit
		)
	}
}
