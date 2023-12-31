export {}

// import {
// 	BaseIndexStore,
// 	BaseNode,
// 	GenericFileSystem,
// 	IndexStruct,
// 	Metadata,
// 	VectorStore,
// 	VectorStoreQuery,
// 	VectorStoreQueryMode,
// 	VectorStoreQueryResult,
// 	getTopKEmbeddings,
// 	getTopKEmbeddingsLearner,
// 	getTopKMMREmbeddings,
// } from "llamaindex";
// import { LlmDexie, VectorStoreEntry } from "storage/db";

// export class DexieIndexStore implements BaseIndexStore {
// 	private db: LlmDexie;

// 	constructor(db: LlmDexie) {
// 		this.db = db;
// 	}

// 	getIndexStructs(): Promise<IndexStruct[]> {
// 		return this.db.llamaIndexIndexStore.toArray();
// 	}
// 	async addIndexStruct(indexStruct: IndexStruct): Promise<void> {
// 		// The semantics of `BaseIndexStore.addIndexStruct()` is more like an upsert,
// 		// it's called even if the entry already exists.
// 		console.log("Adding index struct", indexStruct);
// 		await this.db.llamaIndexIndexStore.put(indexStruct);
// 	}

// 	async deleteIndexStruct(key: string): Promise<void> {
// 		await this.db.llamaIndexIndexStore.delete(key);
// 	}
// 	getIndexStruct(
// 		structId?: string | undefined
// 	): Promise<IndexStruct | undefined> {
// 		if (structId) {
// 			return this.db.llamaIndexIndexStore.get(structId);
// 		} else {
// 			return Promise.resolve(undefined);
// 		}
// 	}
// 	persist(
// 		persistPath?: string | undefined,
// 		fs?: GenericFileSystem | undefined
// 	): Promise<void> {
// 		throw new Error("Method not implemented.");
// 	}
// }

// export class DexieVectorStore implements VectorStore {
// 	private db: LlmDexie;

// 	// Store text in the same DB because this is the only way to restore
// 	// a VectorStoreIndex from a VectorStore.
// 	storesText: boolean = true;
// 	isEmbeddingQuery?: boolean | undefined = true; // TODO: what is this?

// 	constructor(db: LlmDexie) {
// 		this.db = db;
// 	}

// 	client() {
// 		throw new Error("Method not implemented.");
// 	}
// 	async add(embeddingResults: BaseNode<Metadata>[]): Promise<string[]> {
// 		const entries = embeddingResults.map((x) => {
// 			return {
// 				baseNode: x,
// 				refDocId: x.sourceNode!.nodeId,
// 			};
// 		});
// 		// The semantics of `VectorStore.add()` is more like an upsert,
// 		// it's called even if the entry already exists.
// 		await this.db.llamaIndexVectorStore.bulkPut(entries);
// 		return embeddingResults.map((x) => x.id_);
// 	}
// 	async delete(refDocId: string, deleteOptions?: any): Promise<void> {
// 		await this.db.llamaIndexVectorStore
// 			.where("refDocId")
// 			.equals(refDocId)
// 			.delete();
// 	}
// 	async query(
// 		query: VectorStoreQuery,
// 		options?: any
// 	): Promise<VectorStoreQueryResult> {
// 		if (query.filters) {
// 			// TODO
// 			throw new Error("Filters are not implemented yet");
// 		}

// 		let allNodes: VectorStoreEntry[];
// 		if (query.docIds) {
// 			allNodes = await this.db.llamaIndexVectorStore
// 				.where("refDocId")
// 				.anyOf(query.docIds)
// 				.toArray();
// 		} else {
// 			allNodes = await this.db.llamaIndexVectorStore.toArray();
// 		}
// 		const nodeEmbeddings = allNodes.map((x) => {
// 			return x.baseNode.embedding!;
// 		});
// 		const nodeIDs = allNodes.map((x) => x.baseNode.id_);

// 		let topSimilarities: number[];
// 		let topDocIDs: string[];
// 		switch (query.mode) {
// 			case VectorStoreQueryMode.MMR:
// 				[topSimilarities, topDocIDs] = getTopKMMREmbeddings(
// 					query.queryEmbedding!,
// 					nodeEmbeddings,
// 					null,
// 					query.similarityTopK,
// 					nodeIDs,
// 					query.mmrThreshold
// 				);
// 				break;
// 			case VectorStoreQueryMode.SVM:
// 			case VectorStoreQueryMode.LINEAR_REGRESSION:
// 			case VectorStoreQueryMode.LOGISTIC_REGRESSION:
// 				[topSimilarities, topDocIDs] = getTopKEmbeddingsLearner(
// 					query.queryEmbedding!,
// 					nodeEmbeddings,
// 					query.similarityTopK,
// 					nodeIDs
// 				);
// 				break;
// 			case VectorStoreQueryMode.DEFAULT:
// 				[topSimilarities, topDocIDs] = getTopKEmbeddings(
// 					query.queryEmbedding!,
// 					nodeEmbeddings,
// 					query.similarityTopK,
// 					nodeIDs
// 				);
// 				break;
// 			default:
// 				throw new Error(`Unsupported query mode: ${query.mode}`);
// 		}
// 		return Promise.resolve({
// 			similarities: topSimilarities,
// 			ids: topDocIDs,
// 		});
// 	}
// }
