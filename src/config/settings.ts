import { PluginSettingTab, App, Setting, Notice } from "obsidian"
import type LlmPlugin from "src/main"
import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import { Pruner } from "src/storage/pruner"
import { logger } from "src/utils/logger"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string
	customModelName: string
	customModelUrl: string
	customModelApiKey: string
	customEmbeddingModelName: string
	customEmbeddingModelUrl: string
	customEmbeddingModelApiKey: string

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
	customModelName: "",
	customModelUrl: "",
	customModelApiKey: "",
	customEmbeddingModelName: "",
	customEmbeddingModelUrl: "",
	customEmbeddingModelApiKey: "",

	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: "",
	noteContextModel: "",

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
		.setName("Model for conversations")
		.setDesc("The model used to answer questions in the LLM workspace view")
		.addDropdown((dropdown) => {
			dropdown
				.addOptions(modelOptions(this.plugin)) // Pass the plugin instance here
				.setValue(this.plugin.settings.questionAndAnswerModel)
				.onChange(async (value) => {
					this.plugin.settings.questionAndAnswerModel = value;
					await this.plugin.saveSettings();
				})
		})

		new Setting(containerEl)
			.setName("Model for note context")
			.setDesc("The model used to generate note context (summary, key topics)")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelOptions(this.plugin))
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

		// New custom model section.	
		new Setting(containerEl)
		.setName("Custom OpenAI-Compatible Endpoint")
		.setDesc("Bring your own model! Connect any OpenAI-compatible LLM")
		.setHeading();
		  
		new Setting(containerEl)
			.setName("Conversation Model Name")
			.setDesc("Refresh the settings menu to display the custom chat model in the dropdown list.")
			.addText((text) => 
				text
					.setPlaceholder("Custom-model")
					.setValue(this.plugin.settings.customModelName)
					.onChange(async (value) => {
						this.plugin.settings.customModelName = value
						await this.plugin.saveSettings()		
			  }),
			)			
		  
		new Setting(containerEl)
			.setName("API Base URL")
			.setDesc("Endpoint URL for the OpenAI-compatible model")
			.addText(text =>
				text
					.setPlaceholder("https://api.custom-llm.com/v1/")
					.setValue(this.plugin.settings.customModelUrl)
					.onChange(async (value) => {
						if (value.endsWith("/v1") && !value.endsWith("/v1/")) {
							value += "/"
						}
						this.plugin.settings.customModelUrl = value
						await this.plugin.saveSettings()
			  }),
			)
		  
		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Key for your custom endpoint")
			.addText(text =>
				text
					.setPlaceholder("sk-custom-...")
					.setValue(this.plugin.settings.customModelApiKey)
					.onChange(async (value) => {
						this.plugin.settings.customModelApiKey = value
						await this.plugin.saveSettings()
			  }),
			)
			
		// Custom embedding model section.
		new Setting(containerEl)
			.setName("Embedding Model Name")
			.addText((text) => 
				text
					.setPlaceholder("Embedding-model")
					.setValue(this.plugin.settings.customEmbeddingModelName)
					.onChange(async (value) => {
						this.plugin.settings.customEmbeddingModelName = value
						await this.plugin.saveSettings()		
			  }),
			)

		new Setting(containerEl)
			.setName("Embedding API Base URL")
			.setDesc("Endpoint URL for the OpenAI-compatible embedding model")
			.addText(text =>
				text
					.setPlaceholder("https://api.custom-llm.com/v1/")
					.setValue(this.plugin.settings.customEmbeddingModelUrl)
					.onChange(async (value) => {
						if (value.endsWith("/v1") && !value.endsWith("/v1/")) {
							value += "/"
						}
						this.plugin.settings.customEmbeddingModelUrl = value
						await this.plugin.saveSettings()
			  }),
			)

		new Setting(containerEl)
			.setName("Embedding API Key")
			.setDesc("Key for your custom embedding endpoint")
			.addText(text =>
				text
					.setPlaceholder("sk-custom-...")
					.setValue(this.plugin.settings.customEmbeddingModelApiKey)
					.onChange(async (value) => {
						this.plugin.settings.customEmbeddingModelApiKey = value
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

// Adds the custom model to the model selection dropdown menu.
function modelOptions(plugin: LlmPlugin): Record<string, string> {
    const models = [...MODELS];
    
    // Adds the custom model name, if provided.
    if (plugin.settings.customModelName) {
        models.push(plugin.settings.customModelName);
    }
    
    return Object.fromEntries(models.map(model => [model, model]));
}
