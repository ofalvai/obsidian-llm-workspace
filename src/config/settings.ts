import { PluginSettingTab, App, Setting } from "obsidian"
import type LlmPlugin from "src/main"

export interface LlmPluginSettings {
	openAIApiKey: string
	anthropicApikey: string
	systemPrompt: string
}

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
	anthropicApikey: "",
	systemPrompt: `You are ObsidianGPT, an assistant answering questions about information in my personal knowledgebase. My knowledgebase contains both original thoughts and references to other people's work on the internet and in books. I also keep track of projects and tasks there.
Your answers should be precise and fact-based, but you are encouraged to be opinionated as long as they are marked as such. I prefer short and clear answers. You can be direct and honest with me, there is no need to preface your response with disclaimers and warnings. You can assume I'm an expert in all subject matter.
If possible, try to highlight implicit connections in the provided context that are otherwise hidden.
Formatting rules:
- Use additional Markdown formatting to highlight the most important parts of the answer. For example, bold, italic, bulleted and numbered lists.`,
}

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
					})
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
