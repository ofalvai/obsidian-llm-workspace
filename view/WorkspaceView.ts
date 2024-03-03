import type { LlmPluginSettings } from "config/settings"
import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian"
import { LlmDexie } from "storage/db"
import { appStore, settingsStore, viewStore } from "utils/obsidian"
import Workspace from "component/Workspace.svelte"

export const VIEW_TYPE_WORKSPACE = "llm-workspace-view"

export class WorkspaceView extends ItemView {
	settings: LlmPluginSettings

	db: LlmDexie

	component!: Workspace
	viewTitle = "LLM Workspace"
	navigation = false

	constructor(leaf: WorkspaceLeaf, settings: LlmPluginSettings, db: LlmDexie) {
		super(leaf)
		this.settings = settings
		this.db = db
	}

	getViewType() {
		return VIEW_TYPE_WORKSPACE
	}

	getDisplayText() {
		return this.viewTitle
	}

	getIcon(): string {
		return "sparkles"
	}

	async onOpen() {
		// TODO: filter for non-Markdown files
		const file = this.app.workspace.getActiveFile()
		if (!file) {
			new Notice("Open a file and try again")
			return
		}


		settingsStore.set(this.settings)
		appStore.set(this.app)
		viewStore.set(this)

		this.component = new Workspace({
			target: this.contentEl,
			props: {
				workspaceFile: file,
				db: this.db,		
			},
		})

		await this.updateWorkspaceStore(file)
		this.viewTitle = `${file.basename} (LLM Workspace)`
	}

	async onClose() {
		this.component?.$destroy()
	}

	async updateWorkspaceStore(file: TFile) {
		// TODO: add field to frontmatter if it's missing
		// TODO: this could accidentally create a new workspace if the windows are restored after startup and the active tab is not the workspace note

		const exists =
			(await this.db.workspace.where("workspaceFile").equals(file.path).count()) == 1

		if (exists) {
			return
		}

		const links =
			this.app.metadataCache
				.getFileCache(file)
				?.links?.map((link) => {
					return this.app.metadataCache.getFirstLinkpathDest(link.link, file.path)
				})
				?.filter((l): l is Exclude<typeof l, null> => l !== null)
				?.map((l) => l.path) ?? []

		await this.db.workspace.put({
			workspaceFile: file.path,
			links: links,
		})
	}
}
