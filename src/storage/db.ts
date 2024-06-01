import { Dexie, type Table } from "dexie"
import type { WorkspaceQuestion } from "src/llm-features/workspace-questions"
import type { Node } from "src/rag/node"
import type { FilePath } from "src/utils/obsidian"

export interface NoteDerivedData {
	path: FilePath
	summary?: string
	keyTopics?: string[]
}

export interface VectorStoreEntry {
	node: Node
	includedInWorkspace: FilePath[]
	embedding: number[]
}

export interface WorkspaceStoreEntry {
	workspaceFile: FilePath
	links: FilePath[]
	derivedQuestions: WorkspaceQuestion[]
}

export class LlmDexie extends Dexie {
	noteDerivedData!: Table<NoteDerivedData>
	vectorStore!: Table<VectorStoreEntry>
	workspace!: Table<WorkspaceStoreEntry>

	constructor(vaultId: string) {
		// TODO: rename this
		super(`llm-plugin/cache/${vaultId}`)
		this.version(1).stores({
			noteDerivedData: "path", // indexed props
			vectorStore: "++, *includedInWorkspace, node.parent", // indexed props
			workspace: "workspaceFile, *links", // indexed props
		})
	}

	// TODO: move these to a separate class
	async getNoteDerivedData(path: string): Promise<NoteDerivedData | undefined> {
		return this.noteDerivedData.get(path)
	}

	async deleteNoteDerivedData(path: string): Promise<void> {
		return this.noteDerivedData.delete(path)
	}

	async updateNoteSummary(path: string, summary: string): Promise<void> {
		const dataInDB = await this.getNoteDerivedData(path)
		if (dataInDB) {
			await this.noteDerivedData.update(path, {
				summary: summary,
			})
		} else {
			await this.noteDerivedData.add({
				path: path,
				summary: summary,
			})
		}
	}

	async updateNoteKeyTopics(path: string, topics: string[]): Promise<void> {
		const dataInDB = await this.getNoteDerivedData(path)
		if (dataInDB) {
			await this.noteDerivedData.update(path, {
				keyTopics: topics,
			})
		} else {
			await this.noteDerivedData.add({
				path: path,
				keyTopics: topics,
			})
		}
	}
}
