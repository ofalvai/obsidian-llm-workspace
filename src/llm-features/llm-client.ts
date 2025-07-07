import type { ProviderSettings } from "src/config/providers"
import type { LlmPluginSettings, ModelConfiguration } from "src/config/settings"
import { OllamaClient } from "src/rag/llm/ollama/client"
import { derived, type Writable } from "svelte/store"
import { AnthropicChatCompletionClient } from "../rag/llm/anthropic"
import type { StreamingChatCompletionClient } from "../rag/llm/common"
import { OpenAIChatCompletionClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"

export const globalLlmClient = derived<Writable<LlmPluginSettings>, StreamingChatCompletionClient>(
	settingsStore,
	($settingsStore) =>
		createLlmClient($settingsStore.questionAndAnswerModel, $settingsStore.providerSettings),
)

export const noteContextLlmClient = derived<
	Writable<LlmPluginSettings>,
	StreamingChatCompletionClient
>(settingsStore, ($settingsStore) => {
	const modelConfig = $settingsStore.noteContextModel
	return createLlmClient(modelConfig, $settingsStore.providerSettings)
})

export const createLlmClient = (
	modelConfig: ModelConfiguration,
	providerSettings: ProviderSettings,
): StreamingChatCompletionClient => {
	const provider = modelConfig.provider
	switch (provider) {
		case "OpenAI":
			return new OpenAIChatCompletionClient(providerSettings.openai.apiKey, modelConfig.model)
		case "Anthropic":
			return new AnthropicChatCompletionClient(
				providerSettings.anthropic.apiKey,
				modelConfig.model,
			)
		case "Ollama":
			return new OllamaClient(providerSettings.ollama.url, modelConfig.model)
		case "OpenAI-compatible":
			return new OpenAIChatCompletionClient(
				providerSettings.openaiCompatible.apiKey,
				modelConfig.model,
				providerSettings.openaiCompatible.baseUrl,
			)
		default:
			throw new Error("Unrecognized provider: " + provider)
	}
}
