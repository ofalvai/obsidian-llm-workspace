import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { NoteContext } from "component/NoteContext";
import { AppContext, PluginSettingsContext } from "utils/obsidian";
import { LlmPluginSettings } from "main";
import { LlmDexie } from "storage/db";
import { render } from "preact";
import { WorkspaceRAG } from "component/RAGComponent";

export const VIEW_TYPE_WORKSPACE = "llm-workspace-view";

export class WorkspaceView extends ItemView {
	settings: LlmPluginSettings;

	db: LlmDexie;

	constructor(leaf: WorkspaceLeaf, settings: LlmPluginSettings, db: LlmDexie) {
		super(leaf);
		this.settings = settings;
		this.db = db;
	}

	navigation = false;

	getViewType() {
		return VIEW_TYPE_WORKSPACE;
	}

	getDisplayText() {
		return "LLM Workspace";
	}

	async onOpen() {
		const file = this.app.workspace.getActiveFile()
		if (!file) {
			new Notice("Open a file and try again")
			return
		}
		// TODO: filter for non-Markdown files
		render(
			<AppContext.Provider value={this.app}>
				<PluginSettingsContext.Provider value={this.settings}>
					<WorkspaceRAG file={file} db={this.db} />
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
