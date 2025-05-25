import { OllamaEmbeddingClient } from "src/rag/llm/ollama/embedding-client"
import { derived } from "svelte/store"
import { OpenAIEmbeddingClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"
import { llmClient } from "./llm-client"

export const embeddingClient = derived(
	[settingsStore, llmClient],
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
			case "OpenAICompatible":
				return new OpenAIEmbeddingClient(
					$settingsStore.providerSettings.openaiCompatible.apiKey,
					modelConfig.model,
					$llmClient,
					$settingsStore.providerSettings.openaiCompatible.url,
				)
			default:
				throw new Error("Unrecognized provider: " + provider)
		}
	},
)
