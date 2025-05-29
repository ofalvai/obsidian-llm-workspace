import type { LlmDexie, VectorStoreEntry } from "src/storage/db"
import type { Node } from "./node"
import type { FilePath } from "src/utils/obsidian"

export interface NodeSimilarity {
	node: Node

	// cosine similarity between the query and the node, in the [0..1] range
	similarity: number
}

export interface VectorStoreStats {
	nodeCount: number
	workspaceCount: number
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
		limit: number,
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

	async deleteAllFiles(): Promise<void> {
		return await this.db.vectorStore.clear()
	}

	async stats(): Promise<VectorStoreStats> {
		const nodeCount = await this.db.vectorStore.count()
		const workspaceCount = await this.db.vectorStore
			.orderBy("includedInWorkspace")
			.uniqueKeys()
			.then((keys) => keys.length)
		return {
			nodeCount,
			workspaceCount,
		}
	}

	async updateWorkspacePath(old: FilePath, new_: FilePath): Promise<void> {
		await this.db.vectorStore
			.where("includedInWorkspace")
			.equals(old)
			.modify((entry: VectorStoreEntry) => {
				entry.includedInWorkspace = entry.includedInWorkspace.map((path) =>
					path === old ? new_ : path,
				)
			})
	}
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		return 0
	}

	if (a.length === 1) {
		return a[0] * b[0] // For single dimension, just return the product
	}

	let dotProduct = 0
	let magnitudeA = 0
	let magnitudeB = 0

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i]
		magnitudeA += a[i] * a[i]
		magnitudeB += b[i] * b[i]
	}

	magnitudeA = Math.sqrt(magnitudeA)
	magnitudeB = Math.sqrt(magnitudeB)

	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0
	}

	return dotProduct / (magnitudeA * magnitudeB)
}
