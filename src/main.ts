import { DEFAULT_SETTINGS, type LlmPluginSettings, LlmSettingTab } from "src/config/settings"
import { Plugin, WorkspaceLeaf } from "obsidian"
import { VectorStoreIndex } from "src/rag/storage"
import { LlmDexie } from "src/storage/db"
import { ObsidianNoteReconciler } from "src/utils/reconciler"
import { NoteContextView, VIEW_TYPE_NOTE_CONTEXT } from "src/view/NoteContextView"
import { VIEW_TYPE_WORKSPACE, WorkspaceView } from "src/view/WorkspaceView"
import { settingsStore } from "./utils/obsidian"

export default class LlmPlugin extends Plugin {
	settings!: LlmPluginSettings
	db!: LlmDexie
	reconciler!: ObsidianNoteReconciler

	async onload() {
		await this.loadSettings()

		this.db = new LlmDexie(this.app.appId ?? this.app.vault.getName())

		const index = new VectorStoreIndex(this.db)
		this.reconciler = new ObsidianNoteReconciler(this.app, this.db, index)
		this.reconciler.subscribeToChanges()

		this.registerView(
			VIEW_TYPE_NOTE_CONTEXT,
			(leaf) => new NoteContextView(leaf, this.settings, this.db),
		)
		this.registerView(
			VIEW_TYPE_WORKSPACE,
			(leaf) => new WorkspaceView(leaf, this.settings, this.db),
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
			if (!leaf) return
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
			// Our view could not be found in the root split
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
		settingsStore.set(this.settings)
	}

	async saveSettings() {
		await this.saveData(this.settings)
		settingsStore.set(this.settings)
	}
}
