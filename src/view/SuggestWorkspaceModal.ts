import path from "node:path"
import { App, FuzzySuggestModal } from "obsidian"
import type { LlmDexie } from "src/storage/db"
import type { FilePath } from "src/utils/obsidian"

export async function showSuggestWorkspaceModal(
	app: App,
	db: LlmDexie,
	onSelect: (workspace: FilePath) => void,
) {
	const workspaces = (await db.workspace.toArray()).map((entry) => entry.workspaceFile)

	const modal = new SuggestWorkspaceModal(app, workspaces, onSelect)
	modal.setPlaceholder("Select a workspace to open")
	modal.open()
}

export class SuggestWorkspaceModal extends FuzzySuggestModal<FilePath> {
	private workspaces: FilePath[]
	private onSelect: (workspace: FilePath) => void

	constructor(app: App, workspaceFilePaths: FilePath[], onSelect: (workspace: FilePath) => void) {
		super(app)
		this.workspaces = workspaceFilePaths
		this.onSelect = onSelect
	}

	getItems(): FilePath[] {
		return this.workspaces
	}

	getItemText(workspace: FilePath): string {
		return path.basename(workspace, path.extname(workspace))
	}

	onChooseItem(workspace: FilePath, evt: MouseEvent | KeyboardEvent) {
		this.onSelect(workspace)
	}
}
