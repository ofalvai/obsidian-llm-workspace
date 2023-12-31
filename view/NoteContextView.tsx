import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { NoteContext } from "component/NoteContext";
import { AppContext, PluginSettingsContext } from "utils/obsidian";
import { LlmPluginSettings } from "main";
import { LlmDexie } from "storage/db";

export const VIEW_TYPE_NOTE_CONTEXT = "llm-note-context-view";

export class NoteContextView extends ItemView {
	root: Root | null = null;

	settings: LlmPluginSettings;

	db: LlmDexie;

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
		this.root = createRoot(this.containerEl.children[1]);

		this.root.render(
			<StrictMode>
				<AppContext.Provider value={this.app}>
					<PluginSettingsContext.Provider value={this.settings}>
						<NoteContext db={this.db} />
					</PluginSettingsContext.Provider>
				</AppContext.Provider>
			</StrictMode>
		);
	}

	async onClose() {
		this.root?.unmount();
	}

}
