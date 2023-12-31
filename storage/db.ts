import Dexie, { Table } from "dexie";
import { Node } from "rag/node";

export interface NoteDerivedData {
	path: string;
	summary?: string;
	keyTopics?: string[];
}

export interface VectorStoreEntry {
	node: Node;
	includedInWorkspace: string[];
	embedding: number[];
}

export class LlmDexie extends Dexie {
	noteDerivedData!: Table<NoteDerivedData>;
	vectorStore!: Table<VectorStoreEntry>;

	constructor(vaultId: string) {
		super(`llm-plugin/cache/${vaultId}`);
		this.version(1).stores({
			noteDerivedData: "path", // indexed props
			vectorStore: "++, *includedInWorkspace", // indexed props

			llamaIndexIndexStore: "indexId", // indexed props
			llamaIndexVectorStore: "baseNode.id_, refDocId", // indexed props
		});
	}

	async getNoteDerivedData(
		path: string
	): Promise<NoteDerivedData | undefined> {
		return this.noteDerivedData.get(path);
	}

	async deleteNoteDerivedData(path: string): Promise<void> {
		return this.noteDerivedData.delete(path);
	}

	async updateNoteSummary(path: string, summary: string): Promise<void> {
		const dataInDB = await this.getNoteDerivedData(path);
		if (dataInDB) {
			await this.noteDerivedData.update(path, {
				summary: summary,
			});
		} else {
			await this.noteDerivedData.add({
				path: path,
				summary: summary,
			});
		}
	}

	async updateNoteKeyTopics(path: string, topics: string[]): Promise<void> {
		const dataInDB = await this.getNoteDerivedData(path);
		if (dataInDB) {
			await this.noteDerivedData.update(path, {
				keyTopics: topics,
			});
		} else {
			await this.noteDerivedData.add({
				path: path,
				keyTopics: topics,
			});
		}
	}
}
