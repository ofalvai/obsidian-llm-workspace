import { Notice, Plugin, WorkspaceLeaf } from "obsidian"
import { DEFAULT_SETTINGS, LlmSettingTab, type LlmPluginSettings } from "src/config/settings"
import { VectorStoreIndex } from "src/rag/storage"
import { LlmDexie } from "src/storage/db"
import { ObsidianNoteReconciler } from "src/utils/reconciler"
import { NoteContextView, VIEW_TYPE_NOTE_CONTEXT } from "src/view/NoteContextView"
import { VIEW_TYPE_WORKSPACE, WorkspaceView } from "src/view/WorkspaceView"
import { settingsStore } from "./utils/obsidian"
import { NoteChatView, VIEW_TYPE_NOTE_CHAT } from "./view/NoteChatView"

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

		this.registerViews()

		this.addSettingTab(new LlmSettingTab(this.app, this))

		this.registerCommands()

		this.registerMenuEntries()
	}

	onunload() {
		this.reconciler.unsubscribeFromChanges()
	}

	async launchContextView() {
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

	async launchWorkspaceView(notePath: string) {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const workspaceLeaves = workspace.getLeavesOfType(VIEW_TYPE_WORKSPACE)
		if (workspaceLeaves.length > 0) {
			// Create another leaf as a tab in the root split's right split
			// @ts-ignore: https://github.com/obsidianmd/obsidian-api/issues/160
			const containerOfChatViews = workspaceLeaves[0].parent
			leaf = workspace.createLeafInParent(containerOfChatViews, workspaceLeaves.length)
		} else {
			// Our view could not be found in the root split
			leaf = workspace.getLeaf("split", "vertical")
		}

		await leaf.setViewState({
			type: VIEW_TYPE_WORKSPACE,
			active: true,
			state: {
				filePath: notePath,
			},
		})

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf)
	}

	async launchNoteChatView(notePath: string) {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const chatViewLeaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_CHAT)
		if (chatViewLeaves.length > 0) {
			// Create another leaf as a tab in the root split's right split
			// @ts-ignore: https://github.com/obsidianmd/obsidian-api/issues/160
			const containerOfChatViews = chatViewLeaves[0].parent
			leaf = workspace.createLeafInParent(containerOfChatViews, chatViewLeaves.length)
		} else {
			// Our view could not be found in the root split, create a new leaf
			// and split the root split vertically
			leaf = workspace.getLeaf("split", "vertical")
		}
		await leaf.setViewState({
			type: VIEW_TYPE_NOTE_CHAT,
			active: true,
			state: {
				filePath: notePath,
			},
		})

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

	registerViews() {
		this.registerView(
			VIEW_TYPE_NOTE_CONTEXT,
			(leaf) =>
				new NoteContextView(
					leaf,
					this.settings,
					this.db,
					(path) => this.launchNoteChatView(path),
					(path) => this.launchWorkspaceView(path),
				),
		)
		this.registerView(
			VIEW_TYPE_WORKSPACE,
			(leaf) => new WorkspaceView(leaf, this.settings, this.db),
		)
		this.registerView(
			VIEW_TYPE_NOTE_CHAT,
			(leaf) => new NoteChatView(leaf, this.settings, this.db),
		)
	}

	registerCommands() {
		this.addCommand({
			id: "activate-context-view",
			name: "Open context panel",
			callback: () => this.launchContextView(),
		})

		this.addCommand({
			id: "activate-workspace-view",
			name: "Open active note as LLM workspace",
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile()
				if (!activeFile) {
					new Notice("Open a note first and try again")
					return
				}
				this.launchWorkspaceView(activeFile.path)
			},
		})

		this.addCommand({
			id: "activate-note-chat-view",
			name: "Chat with active note",
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile()
				if (!activeFile) {
					new Notice("Open a note first and try again")
					return
				}
				this.launchNoteChatView(activeFile.path)
			},
		})
	}

	registerMenuEntries() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle("Chat with note")
					item.setIcon("message-square")
					item.onClick(() => {
						this.launchNoteChatView(editor.path)
					})
				})
				menu.addItem((item) => {
					item.setTitle("Open as LLM workspace")
					item.setIcon("library-big")
					item.onClick(() => {
						this.launchWorkspaceView(editor.path)
					})
				})
			}),
		)
	}
}
