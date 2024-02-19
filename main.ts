import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian"
import { VectorStoreIndex } from "rag/storage"
import { LlmDexie } from "storage/db"
import { ObsidianNoteReconciler } from "utils/reconciler"
import { NoteContextView, VIEW_TYPE_NOTE_CONTEXT } from "view/NoteContextView"
import { VIEW_TYPE_WORKSPACE, WorkspaceView } from "view/WorkspaceView"

export interface LlmPluginSettings {
	openAIApiKey: string
	systemPrompt: string
}

const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
	systemPrompt: `You are ObsidianGPT, an assistant answering questions about information in my personal knowledgebase. My knowledgebase contains both original thoughts and references to other people's work on the internet and in books. I also keep track of projects and tasks there.
Your answers should be precise and fact-based, but you are encouraged to be opinionated as long as they are marked as such. I prefer short and clear answers. You can be direct and honest with me, there is no need to preface your response with displaimers and warnings. You can assume I'm an expert in all subject matter. Cite sources whenever possible, and include URLs if possible.
If possible, try to highlight implicit connections in the provided context that are otherwise hidden.`,
}

export default class LlmPlugin extends Plugin {
	settings: LlmPluginSettings
	db: LlmDexie
	reconciler: ObsidianNoteReconciler

	async onload() {
		await this.loadSettings()

		this.db = new LlmDexie(this.app.appId ?? this.app.vault.getName())

		const index = new VectorStoreIndex(this.db)
		this.reconciler = new ObsidianNoteReconciler(this.app, this.db, index)
		this.reconciler.subscribeToChanges()

		this.registerView(
			VIEW_TYPE_NOTE_CONTEXT,
			(leaf) => new NoteContextView(leaf, this.settings, this.db)
		)
		this.registerView(
			VIEW_TYPE_WORKSPACE,
			(leaf) => new WorkspaceView(leaf, this.settings, this.db)
		)

		this.addSettingTab(new LlmSettingTab(this.app, this))

		this.addCommand({
			id: "activate-context-view",
			name: "Context of current note",
			callback: () => {
				this.activateContextView()
			},
		})

		this.addCommand({
			id: "activate-workspace-view",
			name: "Activate workspace",
			callback: () => {
				this.activateWorkspaceView()
			},
		})
	}

	onunload() {
		this.reconciler.unsubscribeFromChanges()
	}

	async activateContextView() {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_CONTEXT)

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0]
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false)
			await leaf.setViewState({
				type: VIEW_TYPE_NOTE_CONTEXT,
				active: true,
			})
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf)
	}

	// TODO: rethink multiple instances of this view type
	async activateWorkspaceView() {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKSPACE)

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0]
		} else {
			// Our view could not be found in the root split,
			//
			leaf = workspace.getLeaf("split", "vertical")
			await leaf.setViewState({
				type: VIEW_TYPE_WORKSPACE,
				active: true,
			})
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc("Get one at platform.openai.com")
			.addText((text) =>
				text
					.setPlaceholder("sk-")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value
						await this.plugin.saveSettings()
					})
			)

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("The instructions and extra context included in all LLM queries.")
			.addTextArea((textarea) => {
				textarea
					.setPlaceholder("System prompt")
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value
						await this.plugin.saveSettings()
					})
				textarea.inputEl.rows = 10
				textarea.inputEl.style.width = "100%"
			})
	}
}
