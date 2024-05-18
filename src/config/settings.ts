import { PluginSettingTab, App, Setting, Notice } from "obsidian"
import type LlmPlugin from "src/main"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string

	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: string
	noteContextModel: string
}

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
	anthropicApikey: "",

	systemPrompt: `You are ObsidianGPT, an assistant answering questions about information in my personal knowledgebase. My knowledgebase contains both original thoughts and references to other people's work on the internet and in books. I also keep track of projects and tasks there.
Your answers should be precise and fact-based, but you are encouraged to be opinionated as long as they are marked as such. I prefer short and clear answers. You can be direct and honest with me, there is no need to preface your response with disclaimers and warnings. You can assume I'm an expert in all subject matter.
If possible, try to highlight implicit connections in the provided context that are otherwise hidden.
Formatting rules:
- Use additional Markdown formatting to highlight the most important parts of the answer. For example, bold, italic, bulleted and numbered lists.`,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: "gpt-3.5-turbo-0125",
	noteContextModel: "gpt-3.5-turbo-0125",
}

const MODELS = [
	"gpt-3.5-turbo-0125",
	"gpt-4-turbo-2024-04-09",
	"gpt-4o-2024-05-13",
	"claude-3-haiku-20240307",
	"claude-3-sonnet-20240229",
	"claude-3-opus-20240229",
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
			.setName("General settings")
			.setHeading()

		new Setting(containerEl)
			.setName("LLM model for question answering")
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
			.setName("LLM model for note context")
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
