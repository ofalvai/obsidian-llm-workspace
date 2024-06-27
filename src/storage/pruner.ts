import { Vault } from "obsidian"
import type { LlmDexie } from "./db"

export class Pruner {
	private vault: Vault
	private db: LlmDexie

	constructor(vault: Vault, db: LlmDexie) {
		this.vault = vault
		this.db = db
	}

	async prune(): Promise<number> {
		// Things to remove:
		// - Persisted workspaces that are no longer workspace files (frontmatter removed)
		// - Embeddings of files that are no longer linked in any workspace (this should run after the above!)
		// - Embeddings of files that no longer exist

		let danglingWorkspaceCount = 0
		for (const workspace of await this.db.workspace.toArray()) {
			const fileExists = await this.vault.adapter.exists(workspace.workspaceFile)
			if (!fileExists) {
				await this.db.workspace.delete(workspace.workspaceFile)
				console.log(`Pruned dangling workspace ${workspace.workspaceFile}.`)
				danglingWorkspaceCount++
			}
		}

		const workspaces = new Set(
			(await this.db.workspace.toArray()).map((ws) => ws.workspaceFile),
		)

		let danglingFilePaths = []
		for (const entry of await this.db.vectorStore.toArray()) {
			const fileExists = await this.vault.adapter.exists(entry.node.parent)
			const workspacesExist = entry.includedInWorkspace.some((ws) => workspaces.has(ws))
			if (!fileExists || !workspacesExist) {
				danglingFilePaths.push(entry.node.parent)
				console.log(`Pruned dangling vector store entry of ${entry.node.parent}.`)
			}
		}
		const danglingVectorStoreEntryCount = await this.db.vectorStore
			.where("node.parent")
			.anyOf(danglingFilePaths)
			.delete()

		console.log(
			`Pruned ${danglingWorkspaceCount} dangling workspaces and ${danglingVectorStoreEntryCount} dangling vector store entries.`,
		)
		return danglingWorkspaceCount + danglingVectorStoreEntryCount
	}
}
