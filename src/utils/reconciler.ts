import { type Subscription, liveQuery } from "dexie"
import { App, type CachedMetadata, type EventRef, TAbstractFile, TFile, TFolder } from "obsidian"
import type { LlmDexie, WorkspaceStoreEntry } from "src/storage/db"
import { type FilePath, isLlmWorkspace } from "./obsidian"
import { VectorStoreIndex } from "src/rag/storage"
import { deleteNoteDerivedData } from "src/storage/note-context"

// ObsidianNoteReconciler is responsible for keeping the database in sync with changes in the Obsidian vault.
// It listens to file and metadata changes and updates the relevant DB collections accordingly.
// Note: it doesn't clean up node embeddings even if the original note is deleted or no longer referenced from the workspace.
// This is because recreating embeddings costs real money while wasting a few kilobytes in the DB is fine.
export class ObsidianNoteReconciler {
	private db: LlmDexie
	private app: App
	private vectorStore: VectorStoreIndex

	private obsidianEventRefs: EventRef[] = []

	private workspaces: WorkspaceStoreEntry[] = []
	private workspaceSubscription: Subscription | undefined

	constructor(app: App, db: LlmDexie, vectorStore: VectorStoreIndex) {
		this.app = app
		this.db = db
		this.vectorStore = vectorStore
	}

	subscribeToChanges() {
		this.workspaceSubscription = liveQuery(() => this.db.workspace.toArray()).subscribe({
			next: (workspaces) => {
				this.workspaces = workspaces
			},
			error: (err) => console.error(err),
		})

		this.obsidianEventRefs.push(
			this.app.vault.on("delete", this.onFileDelete),
			this.app.vault.on("rename", this.onFileRename),
			this.app.metadataCache.on("changed", this.onMetadataChange),
		)
	}

	unsubscribeFromChanges() {
		this.workspaceSubscription?.unsubscribe()

		this.obsidianEventRefs.forEach((eventRef) => {
			this.app.vault.offref(eventRef)
		})
	}

	private onFileDelete = (f: TAbstractFile) => {
		if (f instanceof TFolder) {
			// For folder deletions, it's called once for the folder and N times for the children
			// We don't care about the folder, we'll process the file events.
			return
		}

		setTimeout(async () => await this.processFileDelete(f.path), 0)
	}

	private onFileRename = (f: TAbstractFile, oldPath: string) => {
		// This is also fired for file moves across folders.

		if (f instanceof TFolder) {
			// For folder moves, it's called once for the folder and N times for the children
			// We don't care about the folder, we'll process the file events.
			return
		}

		setTimeout(async () => await this.processFileMove(oldPath, f.path), 0)
	}

	private onMetadataChange = (file: TFile, _data: string, cache: CachedMetadata) => {
		const trackedWorkspace = this.workspaces.find((w) => w.workspaceFile === file.path)
		if (trackedWorkspace) {
			if (!isLlmWorkspace(cache)) {
				// Frontmatter field was removed, same as deleting the workspace file
				setTimeout(async () => await this.processWorkspaceDelete(file.path), 0)
				return
			}

			const trackedLinks = trackedWorkspace.links
			const newLinks =
				cache.links
					?.map((l) =>
						this.app.metadataCache.getFirstLinkpathDest(
							l.link,
							trackedWorkspace.workspaceFile,
						),
					)
					?.filter((l): l is Exclude<typeof l, null> => l !== null)
					?.map((l) => l.path) ?? []
			const added = newLinks.filter((l) => !trackedLinks.includes(l))
			const removed = trackedLinks.filter((l) => !newLinks.includes(l))
			if (added.length > 0) {
				for (const link of added) {
					setTimeout(
						async () =>
							await this.processWorkspaceLinkAdd(
								trackedWorkspace.workspaceFile,
								link,
							),
						0,
					)
				}
			}
			if (removed.length > 0) {
				for (const link of removed) {
					setTimeout(
						async () =>
							await this.processWorkspaceLinkRemove(
								trackedWorkspace.workspaceFile,
								link,
							),
						0,
					)
				}
			}
		} else {
			// Not watching changes to non-workspace files yet
		}
	}

	private processFileDelete = async (path: FilePath) => {
		if (this.isWorkspaceFile(path)) {
			await this.processWorkspaceDelete(path)
		} else {
			await this.vectorStore.deleteFiles(path)
		}

		await deleteNoteDerivedData(this.db, path)
	}

	private processFileMove = async (old: FilePath, new_: FilePath) => {
		if (this.isWorkspaceFile(old)) {
			console.log(`Processing workspace move: ${old} -> ${new_}`)
			this.db.transaction("rw", this.db.vectorStore, this.db.workspace, async () => {
				await this.vectorStore.updateWorkspacePath(old, new_)
				await this.db.workspace
					.where("workspaceFile")
					.equals(old)
					.modify((w) => {
						w.workspaceFile = new_
					})
			})
		} else {
			console.log(`Processing note move: ${old} -> ${new_}`)
			this.db.transaction("rw", this.db.vectorStore, this.db.workspace, async () => {
				await this.vectorStore.updateFilePath(old, new_)
				await this.processLinkUpdateInAllWorkspaces(old, new_)
			})
		}

		await this.db.noteDerivedData.update(old, { path: new_ })
	}

	private async processWorkspaceDelete(path: FilePath) {
		console.log(`Processing workspace delete: ${path}`)
		await this.db.workspace.where("workspaceFile").equals(path).delete()
	}

	private async processWorkspaceLinkAdd(workspacePath: FilePath, linkedNotePath: FilePath) {
		console.log(`Processing workspace link add: ${workspacePath} -> ${linkedNotePath}`)
		await this.db.workspace
			.where("workspaceFile")
			.equals(workspacePath)
			.modify((w: WorkspaceStoreEntry) => {
				if (w.links.includes(linkedNotePath)) {
					return
				}
				w.links.push(linkedNotePath)
			})
	}

	private async processWorkspaceLinkRemove(workspacePath: FilePath, linkedNotePath: FilePath) {
		console.log(`Processing workspace link remove: ${workspacePath} -> ${linkedNotePath}`)
		await this.db.workspace
			.where("workspaceFile")
			.equals(workspacePath)
			.modify((w: WorkspaceStoreEntry) => {
				w.links = w.links.filter((l) => l !== linkedNotePath)
			})
	}

	private async processLinkUpdateInAllWorkspaces(old: FilePath, new_: FilePath) {
		console.log(`Processing link update in all workspaces: ${old} -> ${new_}`)
		await this.db.workspace
			.where("links")
			.equals(old)
			.modify((w: WorkspaceStoreEntry) => {
				w.links = w.links.map((l) => (l === old ? new_ : l))
			})
	}

	private isWorkspaceFile(path: FilePath): boolean {
		return this.workspaces.some((w) => w.workspaceFile === path)
	}
}
