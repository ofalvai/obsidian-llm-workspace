import { ItemView, WorkspaceLeaf } from "obsidian"
import NoteContext from "src/component/NoteContext.svelte"
import type { LlmPluginSettings } from "src/config/settings"
import type LlmPlugin from "src/main"
import { LlmDexie } from "src/storage/db"
import { appStore, pluginStore, settingsStore, viewStore } from "src/utils/obsidian"
import { mount, unmount } from "svelte"

export const VIEW_TYPE_NOTE_CONTEXT = "llm-note-context-view"

export class NoteContextView extends ItemView {
	settings: LlmPluginSettings
	plugin: LlmPlugin

	db: LlmDexie

	component!: Record<string, unknown>

	openNoteChat: (notePath: string) => void
	openWorkspace: (notePath: string) => void

	constructor(
		leaf: WorkspaceLeaf,
		settings: LlmPluginSettings,
		plugin: LlmPlugin,
		db: LlmDexie,
		openNoteChat: (notePath: string) => void,
		openWorkspace: (notePath: string) => void
	) {
		super(leaf)
		this.settings = settings
		this.plugin = plugin
		this.db = db
		this.openNoteChat = openNoteChat
		this.openWorkspace = openWorkspace
	}

	icon = "brain-circuit"

	navigation = false

	getViewType() {
		return VIEW_TYPE_NOTE_CONTEXT
	}

	getDisplayText() {
		return "Note context"
	}

	async onOpen() {
		settingsStore.set(this.settings)
		appStore.set(this.app)
		viewStore.set(this)
		pluginStore.set(this.plugin)

		this.component = mount(NoteContext, {
			target: this.contentEl,
			props: {
				db: this.db,
				onOpenNoteChat: this.openNoteChat,
				onOpenWorkspace: this.openWorkspace,
			},
		})
	}

	async onClose() {
		unmount(this.component)
	}
}
