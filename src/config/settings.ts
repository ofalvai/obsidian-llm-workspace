import { PluginSettingTab, App, Setting, Notice } from "obsidian"
import type LlmPlugin from "src/main"
import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import { Pruner } from "src/storage/pruner"
import { logger } from "src/utils/logger"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string

	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: string
	noteContextModel: string

	promptFolder: string
}

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
	anthropicApikey: "",

	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: "gpt-4o-mini-2024-07-18",
	noteContextModel: "gpt-4o-mini-2024-07-18",

	promptFolder: "Resources/LLM/Prompts"
}

const MODELS = [
	"gpt-4-turbo-2024-04-09",
	"gpt-4o-2024-08-06",
	"gpt-4o-mini-2024-07-18",
	"claude-3-5-haiku-20241022",
	"claude-3-5-sonnet-20241022",
	"claude-3-opus-20240229",
	"claude-3-7-sonnet-20250219"
]

export class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("Model for conversationss")
			.setDesc("The model used to answer questions in the LLM workspace view")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelOptions())
					.setValue(this.plugin.settings.questionAndAnswerModel)
					.onChange(async (value) => {
						this.plugin.settings.questionAndAnswerModel = value
						await this.plugin.saveSettings()
					})
			})

		new Setting(containerEl)
			.setName("Model for note context")
			.setDesc("The model used to generate note context (summary, key topics)")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelOptions())
					.setValue(this.plugin.settings.noteContextModel)
					.onChange(async (value) => {
						this.plugin.settings.noteContextModel = value
						await this.plugin.saveSettings()
					})
			})

		new Setting(containerEl)
			.setName("Prompt folder location")
			.setDesc(
				"Files in this folder will be available as prompts. Type @ in the chat input to open the prompt selector.",
			)
			.addText((text) => {
				text
				.setValue(this.plugin.settings.promptFolder)
				.setPlaceholder("Select a folder")
				.onChange(async (value) => {
					this.plugin.settings.promptFolder = value
					await this.plugin.saveSettings()
				})
			})


		new Setting(containerEl)
			.setName("Note context minimum length")
			.setDesc(
				"Don't create note context (summary, key topics) for notes shorter than this many characters.",
			)
			.addSlider((slider) => {
				slider
					.setLimits(0, 1000, 100)
					.setValue(this.plugin.settings.noteContextMinChars)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.noteContextMinChars = value
						await this.plugin.saveSettings()
					})
			})
		
		new Setting(containerEl)
			.setName("Prune database")
			.setDesc("For most file change events in your vault, the plugin's database is kept in sync automatically. However, some vault changes don't remove plugin data immediately to avoid expensive LLM API calls in case it's needed again (such as building embeddings). This button manually prunes the plugin database.")
			.addButton((button) => {
				button.setButtonText("Prune")
					.onClick(async () => {
						const pruner = new Pruner(this.app.vault, this.plugin.db)
						const count = await pruner.prune()
						new Notice(`Pruned ${count} database entries.`, 0)
					})
			})
		
		new Setting(containerEl)
			.setName("Enable logging")
			.setDesc("Enable logging to the developer console.")
			.addToggle((toggle) => {
				toggle
					.setValue(logger.isEnabled())
					.onChange(async (value) => {
						logger.toggleLogging(value)
					})
			})

		new Setting(containerEl)
			.setName("API keys")
			.setHeading()

		const openaiApiKeyDesc = document.createDocumentFragment()
		const openaiLink = document.createElement("a")
		openaiLink.href = "https://platform.openai.com"
		openaiLink.textContent = "platform.openai.com"
		openaiApiKeyDesc.append(
			"Required when using workspace chat mode, even if a different LLM provider is used for answering questions (document embedding always uses the OpenAI API).",
			document.createElement("br"),
			"Create a key at ",
			openaiLink,
		)
		new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc(openaiApiKeyDesc)
			.addText((text) =>
				text
					.setPlaceholder("sk-")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value
						await this.plugin.saveSettings()
					}),
			)

		const anthropicApiKeyDesc = document.createDocumentFragment()
		const anthropicLink = document.createElement("a")
		anthropicLink.href = "https://console.anthropic.com"
		anthropicLink.textContent = "console.anthropic.com"
		anthropicApiKeyDesc.append(
			"Required when using an Anthropic model.",
			document.createElement("br"),
			"Create a key at ",
			anthropicLink,
		)
		new Setting(containerEl)
			.setName("Anthropic API key")
			.setDesc(anthropicApiKeyDesc)
			.addText((text) =>
				text
					.setPlaceholder("sk-ant-")
					.setValue(this.plugin.settings.anthropicApikey)
					.onChange(async (value) => {
						this.plugin.settings.anthropicApikey = value
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Retrieval parameters")
			.setHeading()

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

		new Setting(containerEl)
			.setName("Chunk size")
			.setDesc(
				"Notes are chunked into smaller parts before indexing and during retrieval. This setting controls the maximum size of a chunk (in characters).",
			)
			.addText((text) => {
				text.setPlaceholder("Number of characters")
					.setValue(this.plugin.settings.chunkSize.toString())
					.onChange(async (value) => {
						try {
							const chunkSize = parseInt(value)
							if (isNaN(chunkSize)) {
								throw new Error("Chunk size must be a number")
							}
							this.plugin.settings.chunkSize = chunkSize
							await this.plugin.saveSettings()
						} catch (e) {
							console.error(e)
							new Notice("Chunk size must be a number")
						}
					})
			})

		new Setting(containerEl)
			.setName("Number of chunks in context")
			.setDesc(
				"In workspace chat mode, the most relevant notes are added to the LLM context. This setting controls the number of chunks to include.\nNote: one note does not necessarily equal one chunk, as notes are split into smaller chunks.",
			)
			.addText((text) => {
				text.setPlaceholder("Number of chunks")
					.setValue(this.plugin.settings.retrievedNodeCount.toString())
					.onChange(async (value) => {
						try {
							const nodeCount = parseInt(value)
							if (isNaN(nodeCount)) {
								throw new Error("Chunk count must be a number")
							}
							this.plugin.settings.retrievedNodeCount = nodeCount
							await this.plugin.saveSettings()
						} catch (e) {
							console.error(e)
							new Notice("Chunk count must be a number")
						}
					})
			})
	}
}

function modelOptions(): Record<string, string> {
	return MODELS.reduce((acc: { [key: string]: string }, model: string) => {
		acc[model] = model
		return acc
	}, {})
}
