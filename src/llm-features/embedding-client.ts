import type { LlmPluginSettings } from "src/config/settings"
import { OllamaClient } from "src/rag/llm/ollama/client"
import { derived, type Writable } from "svelte/store"
import type { EmbeddingClient } from "../rag/llm/common"
import { OpenAIEmbeddingClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"

export const embeddingClient = derived<Writable<LlmPluginSettings>, EmbeddingClient>(
	settingsStore,
	($settingsStore) => {
		const modelConfig = $settingsStore.embeddingModel
		const provider = modelConfig.provider
		switch (provider) {
			case "OpenAI":
				return new OpenAIEmbeddingClient(
					$settingsStore.providerSettings.openai.apiKey,
					modelConfig.model,
				)
			case "Ollama":
				return new OllamaClient(
					$settingsStore.providerSettings.ollama.url,
					modelConfig.model,
				)
			default:
				throw new Error("Unrecognized provider: " + provider)
		}
	},
)
