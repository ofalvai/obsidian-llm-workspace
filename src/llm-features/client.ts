import type { LlmPluginSettings } from "src/config/settings"
import { OllamaChatCompletionClient } from "src/rag/llm/ollama/client"
import { derived, type Writable } from "svelte/store"
import type {
	AnthropicSettings,
	OllamaSettings,
	OpenAISettings,
} from "../config/providers"
import { AnthropicChatCompletionClient } from "../rag/llm/anthropic"
import type { StreamingChatCompletionClient } from "../rag/llm/common"
import { OpenAIChatCompletionClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"

export const llmClient = derived<Writable<LlmPluginSettings>, StreamingChatCompletionClient>(
	settingsStore,
	($settingsStore) => {
		const modelConfig = $settingsStore.questionAndAnswerModel
		const provider = modelConfig.provider
		switch (provider) {
			case "OpenAI":
				return new OpenAIChatCompletionClient(
					($settingsStore.providerSettings.OpenAI as OpenAISettings).apiKey,
					modelConfig.model,
				)
			case "Anthropic":
				return new AnthropicChatCompletionClient(
					($settingsStore.providerSettings.Anthropic as AnthropicSettings).apiKey,
					modelConfig.model,
				)
			case "Ollama":
				return new OllamaChatCompletionClient(
					($settingsStore.providerSettings.Ollama as OllamaSettings).url,
					modelConfig.model,
				)
			default:
				throw new Error("Unrecognized provider: " + provider)
		}
	},
)
