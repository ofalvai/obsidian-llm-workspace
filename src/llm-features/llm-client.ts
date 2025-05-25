import type { LlmPluginSettings } from "src/config/settings"
import { OllamaClient } from "src/rag/llm/ollama/client"
import { derived, type Writable } from "svelte/store"
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
					$settingsStore.providerSettings.openai.apiKey,
					modelConfig.model,
				)
			case "Anthropic":
				return new AnthropicChatCompletionClient(
					$settingsStore.providerSettings.anthropic.apiKey,
					modelConfig.model,
				)
			case "Ollama":
				return new OllamaClient(
					$settingsStore.providerSettings.ollama.url,
					modelConfig.model,
				)
			case "OpenAICompatible":
				return new OpenAIChatCompletionClient(
					$settingsStore.providerSettings.openaiCompatible.apiKey,
					modelConfig.model,
					$settingsStore.providerSettings.openaiCompatible.url,
				)
			default:
				throw new Error("Unrecognized provider: " + provider)
		}
	},
)
