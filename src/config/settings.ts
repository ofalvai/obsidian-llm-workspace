import { PluginSettingTab, App, Setting } from "obsidian"
import type LlmPlugin from "src/main"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string

	systemPrompt: string
	noteContextMinChars: number

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

	questionAndAnswerModel: "gpt-3.5-turbo-0125",
	noteContextModel: "gpt-3.5-turbo-0125",
}

const MODELS = [
	"gpt-3.5-turbo-0125",
	"gpt-4-0125-preview",
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
			.setName("OpenAI API key")
			.setDesc("Get one at platform.openai.com") // TODO: make it clickable via DocumentFragment
			.addText((text) =>
				text
					.setPlaceholder("sk-")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName("Anthropic API key")
			.setDesc("Get one at console.anthropic.com")
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
	}
}

function modelOptions(): Record<string, string> {
	return MODELS.reduce((acc: { [key: string]: string }, model: string) => {
		acc[model] = model
		return acc
	}, {})
}
