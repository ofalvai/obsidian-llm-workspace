import { OllamaEmbeddingClient } from "src/rag/llm/ollama/embedding-client"
import { derived } from "svelte/store"
import { OpenAIEmbeddingClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"
import { globalLlmClient } from "./llm-client"

export const embeddingClient = derived(
	[settingsStore, globalLlmClient],
	([$settingsStore, $llmClient]) => {
		const modelConfig = $settingsStore.embeddingModel
		const provider = modelConfig.provider
		switch (provider) {
			case "OpenAI":
				return new OpenAIEmbeddingClient(
					$settingsStore.providerSettings.openai.apiKey,
					modelConfig.model,
					$llmClient,
				)
			case "Ollama":
				return new OllamaEmbeddingClient(
					$settingsStore.providerSettings.ollama.url,
					modelConfig.model,
					$llmClient,
				)
			case "OpenAI-compatible":
				return new OpenAIEmbeddingClient(
					$settingsStore.providerSettings.openaiCompatible.apiKey,
					modelConfig.model,
					$llmClient,
					$settingsStore.providerSettings.openaiCompatible.baseUrl,
				)
			default:
				throw new Error("Unrecognized provider: " + provider)
		}
	},
)
