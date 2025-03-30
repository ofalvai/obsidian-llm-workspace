import { Notice, Plugin, TFolder, WorkspaceLeaf } from "obsidian"
import { DEFAULT_SETTINGS, type LlmPluginSettings } from "src/config/settings"
import { VectorStoreIndex } from "src/rag/vectorstore"
import { LlmDexie } from "src/storage/db"
import { ObsidianNoteReconciler } from "src/utils/reconciler"
import { NoteContextView, VIEW_TYPE_NOTE_CONTEXT } from "src/view/NoteContextView"
import { VIEW_TYPE_WORKSPACE, WorkspaceView } from "src/view/WorkspaceView"
import { settingsStore } from "./utils/obsidian"
import { NoteChatView, VIEW_TYPE_NOTE_CHAT } from "./view/NoteChatView"
import { LlmSettingTab } from "./view/Settings"
import { showSuggestWorkspaceModal } from "./view/SuggestWorkspaceModal"

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
			// @ts-expeect-error: https://github.com/obsidianmd/obsidian-api/issues/160
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
		const persistedSettings = await this.loadData()
		this.settings = Object.assign({}, DEFAULT_SETTINGS, persistedSettings)

		// Migrate old settings to new ones
		if ("anthropicApikey" in persistedSettings) {
			this.settings.providerSettings.anthropic.apiKey = persistedSettings.anthropicApikey
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (this.settings as any).anthropicApikey
			await this.saveSettings()
		}

		if ("openAIApiKey" in persistedSettings) {
			this.settings.providerSettings.openai.apiKey = persistedSettings.openAIApiKey
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (this.settings as any).openAIApiKey
			await this.saveSettings()
		}

		if (typeof persistedSettings.questionAndAnswerModel == "string") {
			const modelString = persistedSettings.questionAndAnswerModel
			this.settings.questionAndAnswerModel = {
				model: modelString,
				provider: modelString.startsWith("gpt-") ? "OpenAI" : "Anthropic",
			}
			await this.saveSettings()
		}

		if (typeof persistedSettings.noteContextModel == "string") {
			const modelString = persistedSettings.noteContextModel
			this.settings.noteContextModel = {
				model: modelString,
				provider: modelString.startsWith("gpt-") ? "OpenAI" : "Anthropic",
			}
			await this.saveSettings()
		}

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
					this,
					this.db,
					(path) => this.launchNoteChatView(path),
					(path) => this.launchWorkspaceView(path),
				),
		)
		this.registerView(
			VIEW_TYPE_WORKSPACE,
			(leaf) => new WorkspaceView(leaf, this.settings, this, this.db),
		)
		this.registerView(
			VIEW_TYPE_NOTE_CHAT,
			(leaf) => new NoteChatView(leaf, this.settings, this, this.db),
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

		this.addCommand({
			id: "open-workspace-suggest-modal",
			name: "Open existing workspace",
			callback: async () => {
				await showSuggestWorkspaceModal(this.app, this.db, (workspace) =>
					this.launchWorkspaceView(workspace),
				)
			},
		})
	}

	registerMenuEntries() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, editor) => {
				if (editor instanceof TFolder) {
					return
				}

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
