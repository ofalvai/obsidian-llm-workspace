import type { LlmPluginSettings } from "src/config/settings"
import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian"
import { LlmDexie } from "src/storage/db"
import { appStore, settingsStore, viewStore } from "src/utils/obsidian"
import NoteChat from "src/component/NoteChat.svelte"

export const VIEW_TYPE_NOTE_CHAT = "llm-note-chat-view"

export class NoteChatView extends ItemView {
	settings: LlmPluginSettings

	db: LlmDexie

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
		// TODO: filter for non-Markdown files
		const file = this.app.workspace.getActiveFile()
		if (!file) {
			return
		}
		this.viewTitle = `${file.basename} (LLM note chat)`

		settingsStore.set(this.settings)
		appStore.set(this.app)
		viewStore.set(this)

		this.component = new NoteChat({
			target: this.contentEl,
			props: {
				note: file		
			},
		})

		this.addAction("file-input", "Open note", () => {
			this.app.workspace.openLinkText(file.path, "", "tab")
		})
	}

	async onClose() {
		this.component?.$destroy()
	}
}
