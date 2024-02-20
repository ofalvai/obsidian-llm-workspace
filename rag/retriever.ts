import { EmbeddingClient } from "./llm"
import { NodeSimilarity, VectorStoreIndex } from "./storage"

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

const defaultRetrieverOptions: RetrieverOptions = {
	limit: 10,
}

export class EmbeddingVectorRetriever implements Retriever {
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

	async retrieve(query: string, workspaceFilePath: string): Promise<RetrieverResult> {
		const queryEmbedding = await this.embeddingClient.embedQuery(query)
		const retrievedNodes = await this.index.query(
			queryEmbedding.embedding,
			workspaceFilePath,
			this.options.limit
		)
		return {
			nodes: retrievedNodes,
			improvedQuery: queryEmbedding.improvedQuery,
		}
	}
}
