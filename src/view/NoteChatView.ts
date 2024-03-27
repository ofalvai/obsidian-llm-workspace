import type { LlmPluginSettings } from "src/config/settings"
import { ItemView, Notice, TFile, WorkspaceLeaf, type ViewStateResult } from "obsidian"
import { LlmDexie } from "src/storage/db"
import { appStore, settingsStore, viewStore } from "src/utils/obsidian"
import NoteChat from "src/component/NoteChat.svelte"

export const VIEW_TYPE_NOTE_CHAT = "llm-note-chat-view"

export type NoteChatViewState = {
	// Path of the note file this view is associated with.
	// This could be an empty string or an invalid path, so it should be always checked.
	filePath: string
}

export class NoteChatView extends ItemView {
	settings: LlmPluginSettings

	db: LlmDexie

	filePath?: string

	component!: NoteChat
	viewTitle = "LLM note chat"
	navigation = false

	constructor(leaf: WorkspaceLeaf, settings: LlmPluginSettings, db: LlmDexie) {
		super(leaf)
		this.settings = settings
		this.db = db
	}

	getViewType() {
		return VIEW_TYPE_NOTE_CHAT
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

		this.addAction("file-input", "Open note", () => {
			if (this.filePath) {
				this.app.workspace.openLinkText(this.filePath, "", "tab")
			}
		})

		// setState() is called after onOpen(), so we can't create the component here yet
	}

	async onClose() {
		this.component?.$destroy()
	}

	async setState(state: NoteChatViewState, result: ViewStateResult): Promise<void> {
		this.filePath = state.filePath

		// Recreate the component because it depends on the file path
		this.createComponent()

		return super.setState(state, result)
	}

	getState(): NoteChatViewState {
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
		this.component = new NoteChat({
			target: this.contentEl,
			props: {
				file: file,
			},
		})
		this.viewTitle = `${file.basename} (LLM note chat)`
	}
}
