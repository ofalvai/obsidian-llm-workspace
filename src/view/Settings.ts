import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian"
import AnthropicSettingsDialog from "src/component/settings/AnthropicSettingsDialog.svelte"
import EmbeddingChangeDialog from "src/component/settings/EmbeddingChangeDialog.svelte"
import OllamaSettingsDialog from "src/component/settings/OllamaSettingsDialog.svelte"
import OpenAiSettingsDialog from "src/component/settings/OpenAISettingsDialog.svelte"
import type { DialogProps } from "src/component/settings/types"
import type { Provider } from "src/config/providers"
import {
	EMBEDDING_MODEL_CONFIGS,
	MODEL_CONFIGS,
	type Feature,
	type ModelConfiguration,
} from "src/config/settings"
import type LlmPlugin from "src/main"
import { VectorStoreIndex } from "src/rag/vectorstore"
import { Pruner } from "src/storage/pruner"
import { logger } from "src/utils/logger"
import { pluginStore } from "src/utils/obsidian"
import { mount, unmount, type Component } from "svelte"

const PROVIDER_COMPONENT_MAP: Map<Provider, Component<DialogProps>> = new Map([
	["Ollama", OllamaSettingsDialog],
	["OpenAI", OpenAiSettingsDialog],
	["Anthropic", AnthropicSettingsDialog],
])

const PROVIDERS_WITH_CUSTOM_SETTINGS = new Set<Provider>(["Ollama"])

export class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		pluginStore.set(this.plugin)

		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("Provider settings")
			.setDesc("Settings for the different LLM providers")
			.addButton((button) => {
				button.setButtonText("OpenAI").onClick(() => {
					this.openProviderSettingsModal("OpenAI", null)
				})
			})
			.addButton((button) => {
				button.setButtonText("Anthropic").onClick(() => {
					this.openProviderSettingsModal("Anthropic", null)
				})
			})
			.addButton((button) => {
				button.setButtonText("Ollama").onClick(() => {
					this.openProviderSettingsModal("Ollama", null)
				})
			})

		const chatModelSetting = new Setting(containerEl)
			.setName("Model for conversations")
			.setDesc("The model used to answer questions in the LLM workspace view")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelConfigToDropdownOptions(MODEL_CONFIGS))
					.setValue(
						modelConfigToDropdownValue(this.plugin.settings.questionAndAnswerModel),
					)
					.onChange(async (value) => {
						await this.handleModelChange(value, "questionAndAnswer")

						if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
							chatModelExtraSettingsEl.style.display = "flex"
						} else {
							chatModelExtraSettingsEl.style.display = "none"
						}
					})
			})

		const chatModelExtraSettingsEl = document.createElement("div")
		chatModelSetting.settingEl.insertAdjacentElement("afterend", chatModelExtraSettingsEl)
		this.initModelExtraSettings("questionAndAnswer", chatModelExtraSettingsEl)

		const noteContextModelSetting = new Setting(containerEl)
			.setName("Model for note context")
			.setDesc("The model used to generate note context (summary, key topics)")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelConfigToDropdownOptions(MODEL_CONFIGS))
					.setValue(modelConfigToDropdownValue(this.plugin.settings.noteContextModel))
					.onChange(async (value) => {
						await this.handleModelChange(value, "noteContext")

						if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
							noteContextModelExtraSettingsEl.style.display = "flex"
						} else {
							noteContextModelExtraSettingsEl.style.display = "none"
						}
					})
			})
		const noteContextModelExtraSettingsEl = document.createElement("div")
		noteContextModelSetting.settingEl.insertAdjacentElement(
			"afterend",
			noteContextModelExtraSettingsEl,
		)
		this.initModelExtraSettings("noteContext", noteContextModelExtraSettingsEl)

		const embeddingModelSetting = new Setting(containerEl)
			.setName("Model for document embedding")
			.setDesc(
				"The model used to compute embeddings of documents and finding relevant ones for the conversation.",
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(modelConfigToDropdownOptions(EMBEDDING_MODEL_CONFIGS))
					.setValue(modelConfigToDropdownValue(this.plugin.settings.embeddingModel))
					.onChange(async (value) => {
						const vectorStore = new VectorStoreIndex(this.plugin.db)
						const onConfirm = async () => {
							await vectorStore.deleteAllFiles()
							modal.close()
							await this.handleModelChange(value, "embedding")
						}
						const modal = new Modal(this.app)
						modal.setTitle("Danger zone")

						const componentInstance = mount(EmbeddingChangeDialog, {
							target: modal.contentEl,
							props: {
								onConfirm,
								stats: await vectorStore.stats(),
								currentModelConfig: this.plugin.settings.embeddingModel,
							},
						})
						modal.onClose = () => unmount(componentInstance)
						modal.open()


						if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
							embeddingModelExtraSettingsEl.style.display = "flex"
						} else {
							embeddingModelExtraSettingsEl.style.display = "none"
						}
					})
			})
		const embeddingModelExtraSettingsEl = document.createElement("div")
		embeddingModelSetting.settingEl.insertAdjacentElement(
			"afterend",
			embeddingModelExtraSettingsEl,
		)
		this.initModelExtraSettings("embedding", embeddingModelExtraSettingsEl)

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

	initModelExtraSettings = (feature: Feature, container: HTMLElement) => {
		container.style.marginBottom = "var(--size-4-4)"
		container.style.justifyContent = "flex-end"
		const providerSettingsButton = document.createElement("button")
		providerSettingsButton.textContent = "Additional settings"
		providerSettingsButton.onclick = () => {
			const currentSetting = this.modelConfigOfFeature(feature)
			this.openProviderSettingsModal(currentSetting.provider, feature)
		}

		container.appendChild(providerSettingsButton)
		container.style.display = PROVIDERS_WITH_CUSTOM_SETTINGS.has(
			this.modelConfigOfFeature(feature).provider,
		)
			? "flex"
			: "none"
	}

	openProviderSettingsModal(provider: Provider, feature: Feature | null): void {
		let currentModelOfFeature = null
		// If we are in the context of a feature, and the feature's current setting is this same provider,
		// we open the modal with the current model
		if (feature && this.modelConfigOfFeature(feature).provider == provider) {
			currentModelOfFeature = this.modelConfigOfFeature(feature).model
		}

		const modal = new Modal(this.app)
		modal.setTitle(`${provider} settings`)
		const closeDialog = () => modal.close()

		const component = PROVIDER_COMPONENT_MAP.get(provider)
		if (!component) {
			console.error(`No component found for provider: ${provider}`)
			return
		}
		const componentInstance = mount(component, {
			target: modal.contentEl,
			props: {
				currentModel: currentModelOfFeature,
				feature,
				closeDialog,
			},
		})
		modal.onClose = () => unmount(componentInstance)
		modal.open()
	}

	handleModelChange = async (value: string, feature: Feature) => {
		const allConfigs = feature == "embedding" ? EMBEDDING_MODEL_CONFIGS : MODEL_CONFIGS
		const modelConfig = dropdownValueToModelConfig(allConfigs, value)
		if (modelConfig) {
			switch (feature) {
				case "questionAndAnswer":
					this.plugin.settings.questionAndAnswerModel = modelConfig
					break
				case "noteContext":
					this.plugin.settings.noteContextModel = modelConfig
					break
				case "embedding":
					this.plugin.settings.embeddingModel = modelConfig
					break
				default:
					throw new Error(
						`Unsupported feature encountered when changing model of feature ${feature}: ${modelConfig}`,
					)
			}
			await this.plugin.saveSettings()
		} else if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(value as Provider)) {
			this.openProviderSettingsModal(value as Provider, feature)
		}
	}

	modelConfigOfFeature = (feature: Feature): ModelConfiguration => {
		let selectedModelProvider = null
		switch (feature) {
			case "questionAndAnswer":
				selectedModelProvider = this.plugin.settings.questionAndAnswerModel
				break
			case "noteContext":
				selectedModelProvider = this.plugin.settings.noteContextModel
				break
			case "embedding":
				selectedModelProvider = this.plugin.settings.embeddingModel
				break
		}
		return selectedModelProvider
	}
}

// key: unique ID
// value: display label
function modelConfigToDropdownOptions(configs: ModelConfiguration[]): Record<string, string> {
	const selectableModels = configs.reduce(
		(acc: { [key: string]: string }, config: ModelConfiguration) => {
			acc[config.model] = config.model
			return acc
		},
		{},
	)

	for (const provider of PROVIDERS_WITH_CUSTOM_SETTINGS.keys()) {
		selectableModels[provider] = provider
	}
	return selectableModels
}

function dropdownValueToModelConfig(
	configs: ModelConfiguration[],
	key: string,
): ModelConfiguration | null {
	return configs.find((model) => model.model === key) || null
}

function modelConfigToDropdownValue(config: ModelConfiguration): string {
	if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(config.provider)) {
		return config.provider
	} else {
		return config.model
	}
}
