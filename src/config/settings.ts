import { PluginSettingTab, App, Setting, Notice, Modal } from "obsidian"
import type LlmPlugin from "src/main"
import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import { Pruner } from "src/storage/pruner"
import { logger } from "src/utils/logger"
import OllamaSettingsDialog from "src/component/settings/OllamaSettingsDialog.svelte"
import { mount, unmount } from "svelte"
import OpenAiSettingsDialog from "src/component/settings/OpenAISettingsDialog.svelte"
import AnthropicSettingsDialog from "src/component/settings/AnthropicSettingsDialog.svelte"

export type Provider = "OpenAI" | "Anthropic" | "Ollama"

export interface LlmPluginSettings {
	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: ModelConfiguration
	noteContextModel: ModelConfiguration

	promptFolder: string

	providerSettings: Record<Provider, OllamaSettings | OpenAISettings | AnthropicSettings>
}

export interface ModelConfiguration {
	provider: Provider
	model: string
}

export interface OllamaSettings {
	url: string
}

export interface OpenAISettings {
	apiKey: string
}

export interface AnthropicSettings {
	apiKey: string
}

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: {
		provider: "OpenAI",
		model: "gpt-4o-mini-2024-07-18",
	},
	noteContextModel: {
		provider: "OpenAI",
		model: "gpt-4o-mini-2024-07-18",
	},

	promptFolder: "Resources/LLM/Prompts",

	providerSettings: {
		OpenAI: {
			apiKey: "",
		},
		Anthropic: {
			apiKey: "",
		},
		Ollama: {
			url: "",
		},
	},
}

const MODEL_CONFIGS: ModelConfiguration[] = [
	{ provider: "OpenAI", model: "gpt-4-turbo-2024-04-09" },
	{ provider: "OpenAI", model: "gpt-4o-2024-08-06" },
	{ provider: "OpenAI", model: "gpt-4o-mini-2024-07-18" },
	{ provider: "Anthropic", model: "claude-3-haiku-20240307" },
	{ provider: "Anthropic", model: "claude-3-sonnet-20240229" },
	{ provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
	{ provider: "Anthropic", model: "claude-3-opus-20240229" },
]

type ProviderSettingsComponent =
	| typeof OllamaSettingsDialog
	| typeof OpenAiSettingsDialog
	| typeof AnthropicSettingsDialog

const PROVIDERS_WITH_CUSTOM_SETTINGS: Map<Provider, ProviderSettingsComponent> = new Map([
	["Ollama", OllamaSettingsDialog],
])

export class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	openProviderSettingsModal(component: ProviderSettingsComponent, provider: Provider, doModelSelection: boolean, currentModel: string | null): void {
		const modal = new Modal(this.app)
		modal.setTitle(`${provider} settings`)
		const closeDialog = () => modal.close()
		const componentInstance = mount(component, {
			target: modal.contentEl,
			props: {
				currentModel,
				doModelSelection,
				closeDialog
			},
		})

		modal.onClose = () => {
			unmount(componentInstance)
		}

		modal.open()
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("Provider settings")
			.setDesc("Settings for the different LLM providers")
			.addButton((button) => {
				button.setButtonText("OpenAI").onClick(() => {
					this.openProviderSettingsModal(OpenAiSettingsDialog, "OpenAI", false, null)
				})
			})
			.addButton((button) => {
				button.setButtonText("Anthropic").onClick(() => {
					this.openProviderSettingsModal(AnthropicSettingsDialog, "Anthropic", false, null)
				})
			})
			.addButton((button) => {
				button.setButtonText("Ollama").onClick(() => {
					this.openProviderSettingsModal(OllamaSettingsDialog, "Ollama", false, null)
				})
			})

		const modelSetting = new Setting(containerEl)
			.setName("Model for conversations")
			.setDesc("The model used to answer questions in the LLM workspace view")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.modelConfigToDropdownOptions())
					.setValue(modelConfigToDropdownValue(this.plugin.settings.questionAndAnswerModel))
					.onChange(async (value) => {
						const modelConfig = dropdownValueToModelConfig(value)
						if (modelConfig) {
							this.plugin.settings.questionAndAnswerModel = modelConfig
							await this.plugin.saveSettings()
						} else if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
							this.openProviderSettingsModal(PROVIDERS_WITH_CUSTOM_SETTINGS.get(value as Provider)!, value as Provider, true, null)
						}

						if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
							modelSettingsContainer.style.display = "flex"
							modelSettingsButton.textContent =
								value[0].toUpperCase() + value.slice(1) + " settings"
						} else {
							modelSettingsContainer.style.display = "none"
						}
					})
			})

		const selectedModelProvider = this.plugin.settings.questionAndAnswerModel.provider
		const modelSettingsContainer = document.createElement("div")
		modelSettingsContainer.style.marginBottom = "var(--size-4-4)"
		modelSettingsContainer.style.justifyContent = "flex-end"
		const modelSettingsButton = document.createElement("button")
		modelSettingsButton.textContent = selectedModelProvider + " settings"
		modelSettingsButton.onclick = () => {
			const provider = this.plugin.settings.questionAndAnswerModel.provider
			const component = PROVIDERS_WITH_CUSTOM_SETTINGS.get(provider)
			if (!component) {
				console.error(
					`No settings component found for model ${this.plugin.settings.questionAndAnswerModel}`,
				)
				return
			}
			this.openProviderSettingsModal(component, provider, true, this.plugin.settings.questionAndAnswerModel.model)
		}
		modelSettingsContainer.appendChild(modelSettingsButton)
		modelSetting.settingEl.insertAdjacentElement("afterend", modelSettingsContainer)
		modelSettingsContainer.style.display = PROVIDERS_WITH_CUSTOM_SETTINGS.has(selectedModelProvider)
			? "flex"
			: "none"

		// new Setting(containerEl)
		// 	.setName("Model for note context")
		// 	.setDesc("The model used to generate note context (summary, key topics)")
		// 	.addDropdown((dropdown) => {
		// 		dropdown
		// 			.addOptions(providerOptions())
		// 			.setValue(this.plugin.settings.noteContextModel)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.noteContextModel = value
		// 				await this.plugin.saveSettings()
		// 			})
		// 	})

		new Setting(containerEl)
			.setName("Prompt folder location")
			.setDesc(
				"Files in this folder will be available as prompts. Type @ in the chat input to open the prompt selector.",
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.promptFolder)
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
			.setDesc(
				"For most file change events in your vault, the plugin's database is kept in sync automatically. However, some vault changes don't remove plugin data immediately to avoid expensive LLM API calls in case it's needed again (such as building embeddings). This button manually prunes the plugin database.",
			)
			.addButton((button) => {
				button.setButtonText("Prune").onClick(async () => {
					const pruner = new Pruner(this.app.vault, this.plugin.db)
					const count = await pruner.prune()
					new Notice(`Pruned ${count} database entries.`, 0)
				})
			})

		new Setting(containerEl)
			.setName("Enable logging")
			.setDesc("Enable logging to the developer console.")
			.addToggle((toggle) => {
				toggle.setValue(logger.isEnabled()).onChange(async (value) => {
					logger.toggleLogging(value)
				})
			})

		new Setting(containerEl).setName("API keys").setHeading()

		// const openaiApiKeyDesc = document.createDocumentFragment()
		// const openaiLink = document.createElement("a")
		// openaiLink.href = "https://platform.openai.com"
		// openaiLink.textContent = "platform.openai.com"
		// openaiApiKeyDesc.append(
		// 	"Required when using workspace chat mode, even if a different LLM provider is used for answering questions (document embedding always uses the OpenAI API).",
		// 	document.createElement("br"),
		// 	"Create a key at ",
		// 	openaiLink,
		// )
		// new Setting(containerEl)
		// 	.setName("OpenAI API key")
		// 	.setDesc(openaiApiKeyDesc)
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("sk-")
		// 			.setValue(this.plugin.settings.openAIApiKey)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.openAIApiKey = value
		// 				await this.plugin.saveSettings()
		// 			}),
		// 	)

		// const anthropicApiKeyDesc = document.createDocumentFragment()
		// const anthropicLink = document.createElement("a")
		// anthropicLink.href = "https://console.anthropic.com"
		// anthropicLink.textContent = "console.anthropic.com"
		// anthropicApiKeyDesc.append(
		// 	"Required when using an Anthropic model.",
		// 	document.createElement("br"),
		// 	"Create a key at ",
		// 	anthropicLink,
		// )
		// new Setting(containerEl)
		// 	.setName("Anthropic API key")
		// 	.setDesc(anthropicApiKeyDesc)
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("sk-ant-")
		// 			.setValue(this.plugin.settings.anthropicApikey)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.anthropicApikey = value
		// 				await this.plugin.saveSettings()
		// 			}),
		// 	)

		new Setting(containerEl).setName("Retrieval parameters").setHeading()

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

	modelConfigToDropdownOptions(): Record<string, string> {
		const selectableModels = MODEL_CONFIGS.reduce((acc: { [key: string]: string }, model: ModelConfiguration) => {
			acc[model.model] = model.model
			return acc
		}, {})

		for (const provider of PROVIDERS_WITH_CUSTOM_SETTINGS.keys()) {
			console.log("hello " + provider)
			selectableModels[provider] = provider
		}
		return selectableModels
	}
}

function dropdownValueToModelConfig(key: string): ModelConfiguration | null {
	return MODEL_CONFIGS.find((model) => model.model === key) || null
}

function modelConfigToDropdownValue(config: ModelConfiguration): string {
	if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(config.provider)) {
		return config.provider
	} else {
		return config.model
	}
}
