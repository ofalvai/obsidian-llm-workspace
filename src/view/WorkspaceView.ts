import { ItemView, WorkspaceLeaf, type ViewStateResult } from "obsidian"
import Workspace from "src/component/workspace/Workspace.svelte"
import type { LlmPluginSettings } from "src/config/settings"
import type LlmPlugin from "src/main"
import { LlmDexie } from "src/storage/db"
import {
	addWorkspaceProperty,
	appStore,
	pluginStore,
	settingsStore,
	viewStore,
} from "src/utils/obsidian"
import { mount, unmount } from "svelte"

export const VIEW_TYPE_WORKSPACE = "llm-workspace-view"

export type WorkspaceViewState = {
	// Path of the note file this view is associated with.
	// This could be an empty string or an invalid path, so it should be always checked.
	filePath: string
}

export class WorkspaceView extends ItemView {
	settings: LlmPluginSettings
	plugin: LlmPlugin

	db: LlmDexie

	filePath?: string

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component!: Record<string, any>
	viewTitle = "LLM Workspace"
	navigation = false

	constructor(leaf: WorkspaceLeaf, settings: LlmPluginSettings, plugin: LlmPlugin, db: LlmDexie) {
		super(leaf)
		this.settings = settings
		this.plugin = plugin
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
		settingsStore.set(this.settings)
		appStore.set(this.app)
		viewStore.set(this)
		pluginStore.set(this.plugin)

		this.addAction("file-input", "Open workspace note", () => {
			if (this.filePath) {
				this.app.workspace.openLinkText(this.filePath, "", "tab")
			}
		})

		// setState() is called after onOpen(), so we can't create the component here yet
	}

	async onClose() {
		unmount(this.component)
	}

	async setState(state: WorkspaceViewState, result: ViewStateResult): Promise<void> {
		this.filePath = state.filePath

		await this.updateWorkspaceStore(state.filePath)

		// Recreate the component because it depends on the file path
		this.createComponent()

		return super.setState(state, result)
	}

	getState(): WorkspaceViewState {
		return {
			filePath: this.filePath ?? "",
		}
	}

	private createComponent() {
		const file = this.app.vault.getFileByPath(this.filePath ?? "")
		if (!file) {
			const container = this.containerEl.children[1]
			container.empty()
			container.createEl("p", { text: `File not found: ${this.filePath}` })
			return
		}

		this.component = mount(Workspace, {
			target: this.contentEl,
			props: {
				workspaceFile: file,
				db: this.db,
			},
		})

		this.viewTitle = `${file.basename} (LLM Workspace)`
	}

	async updateWorkspaceStore(filePath: string) {
		const file = this.app.vault.getFileByPath(filePath)
		if (!file) {
			return
		}

		try {
			await this.app.fileManager.processFrontMatter(file, addWorkspaceProperty)
		} catch (e) {
			console.warn("Failed to add workspace property to frontmatter", e)
		}

		const exists =
			(await this.db.workspace.where("workspaceFile").equals(filePath).count()) == 1

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
				?.map((l) => l.path)
				?.unique() ?? []

		await this.db.workspace.put({
			workspaceFile: file.path,
			links: links,
			derivedQuestions: [],
		})
	}
}
