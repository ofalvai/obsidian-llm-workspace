import { ItemView, WorkspaceLeaf } from "obsidian";
import { NoteContext } from "component/NoteContext";
import { AppContext, PluginSettingsContext } from "utils/obsidian";
import { LlmDexie } from "storage/db";
import { render } from "preact";
import { LlmPluginSettings } from "config/settings";

export const VIEW_TYPE_NOTE_CONTEXT = "llm-note-context-view";

export class NoteContextView extends ItemView {
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
		render(
			<AppContext.Provider value={this.app}>
				<PluginSettingsContext.Provider value={this.settings}>
					<NoteContext db={this.db} />
				</PluginSettingsContext.Provider>
			</AppContext.Provider>,
			this.contentEl
		)
	}

	async onClose() {
		// https://stackoverflow.com/questions/50946950/how-to-destroy-root-preact-node
		render(null, this.contentEl)
	}

}
