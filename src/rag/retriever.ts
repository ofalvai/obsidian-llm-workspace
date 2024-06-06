import type { EmbeddingClient } from "./llm/common"
import type { NodeSimilarity, VectorStoreIndex } from "./vectorstore"

export interface Retriever {
	retrieve(query: string, workspaceFilePath: string, limit?: number): Promise<RetrieverResult>
}

export interface RetrieverOptions {
	limit: number
}

export interface RetrieverResult {
	nodes: NodeSimilarity[]
	improvedQuery: string
}

export class EmbeddingVectorRetriever implements Retriever {
	private index: VectorStoreIndex
	private embeddingClient: EmbeddingClient
	private options: RetrieverOptions

	constructor(
		index: VectorStoreIndex,
		embeddingClient: EmbeddingClient,
		options: RetrieverOptions,
	) {
		this.index = index
		this.embeddingClient = embeddingClient
		this.options = options
	}

	async retrieve(query: string, workspaceFilePath: string): Promise<RetrieverResult> {
		const queryEmbedding = await this.embeddingClient.embedQuery(query)
		const retrievedNodes = await this.index.query(
			queryEmbedding.embedding,
			workspaceFilePath,
			this.options.limit,
		)
		return {
			nodes: retrievedNodes,
			improvedQuery: queryEmbedding.improvedQuery,
		}
	}
}
