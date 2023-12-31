import { LlmDexie } from "storage/db";
import { EmbeddingClient } from "./llm";
import { Node } from "./node";

export interface NodeSimilarity {
	similarity: number;
	node: Node;
}

export class VectorStoreIndex {
	private db: LlmDexie;

	constructor(db: LlmDexie) {
		this.db = db;
	}

	static async buildWithNodes(
		nodes: Node[],
		workspaceFilePath: string,
		embeddingClient: EmbeddingClient,
		db: LlmDexie
	): Promise<VectorStoreIndex> {
		const index = new VectorStoreIndex(db);

		// TODO: batched iteration
		for (const node of nodes) {
			const embedding = await embeddingClient.embedNode(node);
			await index.addNode(node, embedding, workspaceFilePath);
		}

		return index;
	}

	async addNode(
		node: Node,
		embedding: number[],
		workspaceFilePath: string
	): Promise<void> {
		await this.db.vectorStore.add({
			node: node,
			includedInWorkspace: [workspaceFilePath],
			embedding: embedding,
		});
	}

	async query(
		queryEmbedding: number[],
		workspaceFilePath: string,
		limit: number
	): Promise<NodeSimilarity[]> {
		const vectorStoreEntries = await this.db.vectorStore
			.where("includedInWorkspace")
			.equals(workspaceFilePath)
			.toArray();

		const topNodes = vectorStoreEntries
			.sort((a, b) => {
				return (
					cosineSimilarity(b.embedding, queryEmbedding) -
					cosineSimilarity(a.embedding, queryEmbedding)
				);
			})
			.slice(0, limit)
			.map((indexEntry) => {
				return {
					similarity: cosineSimilarity(
						indexEntry.embedding,
						queryEmbedding
					),
					node: indexEntry.node,
				};
			});
		return topNodes;
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	// Assuming both vectors are normalized to [0..1]
	let dotProduct = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
	}
	return dotProduct;
}
