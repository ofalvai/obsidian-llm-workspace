import { Vault } from "obsidian"
import type { LlmDexie } from "./db"
import { logger } from "src/utils/logger"

export class Pruner {
	private vault: Vault
	private db: LlmDexie

	constructor(vault: Vault, db: LlmDexie) {
		this.vault = vault
		this.db = db
	}

	async prune(): Promise<number> {
		const startTime = Date.now()

		// Things to remove:
		// - Persisted workspaces that are no longer workspace files (frontmatter removed)
		// - Embeddings of files that are no longer linked in any workspace (this should run after the above!)
		// - Embeddings of files that no longer exist
		// - Derived data of files that no longer exist (the reconciler deletes these, but a file could be deleted without Obsidian running)

		const danglingWorkspacePaths = []
		for (const workspace of await this.db.workspace.toArray()) {
			const fileExists = await this.vault.adapter.exists(workspace.workspaceFile)
			if (!fileExists) {
				logger.info(`Pruned dangling workspace ${workspace.workspaceFile}.`)
				danglingWorkspacePaths.push(workspace.workspaceFile)
			}
		}
		const danglingWorkspaceCount = await this.db.workspace
			.where("workspaceFile")
			.anyOf(danglingWorkspacePaths)
			.delete()

		const workspaces = new Set(
			(await this.db.workspace.toArray()).map((ws) => ws.workspaceFile),
		)

		const danglingFilePaths = []
		for (const entry of await this.db.vectorStore.toArray()) {
			const fileExists = await this.vault.adapter.exists(entry.node.parent)
			const workspacesExist = entry.includedInWorkspace.some((ws) => workspaces.has(ws))
			if (!fileExists || !workspacesExist) {
				danglingFilePaths.push(entry.node.parent)
				logger.info(`Pruned dangling vector store entry of ${entry.node.parent}.`)
			}
		}
		const danglingVectorStoreEntryCount = await this.db.vectorStore
			.where("node.parent")
			.anyOf(danglingFilePaths)
			.delete()

		const danglingDerivedDataFiles = []
		for (const derivedData of await this.db.noteDerivedData.toArray()) {
			const fileExists = await this.vault.adapter.exists(derivedData.path)
			if (!fileExists) {
				logger.info(`Pruned dangling derived data of ${derivedData.path}.`)
				danglingDerivedDataFiles.push(derivedData.path)
			}
		}
		const danglingDerivedDataCount = await this.db.noteDerivedData
			.where("path")
			.anyOf(danglingDerivedDataFiles)
			.delete()

		logger.info(`Pruned ${danglingWorkspaceCount} dangling workspaces`)
		logger.info(`Pruned ${danglingVectorStoreEntryCount} dangling vector store entries`)
		logger.info(`Pruned ${danglingDerivedDataCount} dangling note derived data`)
		logger.info(`Operation took ${Date.now() - startTime}ms`)

		return danglingWorkspaceCount + danglingVectorStoreEntryCount + danglingDerivedDataCount
	}
}
