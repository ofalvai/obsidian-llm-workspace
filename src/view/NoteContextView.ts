import { ItemView, WorkspaceLeaf } from "obsidian";
import { appStore, settingsStore, viewStore } from "src/utils/obsidian";
import { LlmDexie } from "src/storage/db";
import type { LlmPluginSettings } from "src/config/settings";
import NoteContext from "src/component/NoteContext.svelte";

export const VIEW_TYPE_NOTE_CONTEXT = "llm-note-context-view";

export class NoteContextView extends ItemView {
	settings: LlmPluginSettings;

	db: LlmDexie;

	component!: NoteContext

	constructor(leaf: WorkspaceLeaf, settings: LlmPluginSettings, db: LlmDexie) {
		super(leaf);
		this.settings = settings;
		this.db = db;
	}

	icon = "brain-circuit";

	navigation = false;

	getViewType() {
		return VIEW_TYPE_NOTE_CONTEXT;
	}

	getDisplayText() {
		return "Note context";
	}

	async onOpen() {
		settingsStore.set(this.settings);
		appStore.set(this.app);
		viewStore.set(this);

		this.component = new NoteContext({
			target: this.contentEl,
			props: {
				db: this.db,
			},
		});
	}

	async onClose() {
		this.component?.$destroy();
	}
}
