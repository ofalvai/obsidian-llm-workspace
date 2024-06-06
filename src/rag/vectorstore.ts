import type { LlmDexie, VectorStoreEntry } from "src/storage/db"
import type { Node } from "./node"
import type { FilePath } from "src/utils/obsidian"

export interface NodeSimilarity {
	node: Node
	
	// cosine similarity between the query and the node, in the [0..1] range
	similarity: number
}

export class VectorStoreIndex {
	private db: LlmDexie

	constructor(db: LlmDexie) {
		this.db = db
	}

	async addNode(node: Node, embedding: number[], workspaceFilePath: string): Promise<void> {
		await this.db.vectorStore.add({
			node: node,
			includedInWorkspace: [workspaceFilePath],
			embedding: embedding,
		})
	}

	async query(
		queryEmbedding: number[],
		workspaceFilePath: string,
		limit: number
	): Promise<NodeSimilarity[]> {
		const vectorStoreEntries = await this.db.vectorStore
			.where("includedInWorkspace")
			.equals(workspaceFilePath)
			.toArray()

		const topNodes = vectorStoreEntries
			.sort((a, b) => {
				return (
					cosineSimilarity(b.embedding, queryEmbedding) -
					cosineSimilarity(a.embedding, queryEmbedding)
				)
			})
			.slice(0, limit)
			.map((indexEntry) => {
				return {
					similarity: cosineSimilarity(indexEntry.embedding, queryEmbedding),
					node: indexEntry.node,
				}
			})
		return topNodes
	}

	async updateFilePath(old: FilePath, new_: FilePath): Promise<void> {
		await this.db.vectorStore.where("node.parent").equals(old).modify({ "node.parent": new_ })
	}

	async deleteFiles(...path: FilePath[]): Promise<number> {
		return await this.db.vectorStore.where("node.parent").anyOf(path).delete()
	}

	async updateWorkspacePath(old: FilePath, new_: FilePath): Promise<void> {
		await this.db.vectorStore
			.where("includedInWorkspace")
			.equals(old)
			.modify((entry: VectorStoreEntry) => {
				entry.includedInWorkspace = entry.includedInWorkspace.map((path) =>
					path === old ? new_ : path
				)
			})
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	// Assuming both vectors are normalized to [0..1]
	let dotProduct = 0
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i]
	}
	return dotProduct
}
