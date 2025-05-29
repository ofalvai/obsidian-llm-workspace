import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import type { Provider, ProviderSettings } from "./providers"

export interface LlmPluginSettings {
	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: ModelConfiguration
	noteContextModel: ModelConfiguration
	embeddingModel: ModelConfiguration

	promptFolder: string

	providerSettings: ProviderSettings
}

export interface ModelConfiguration {
	provider: Provider
	model: string
}

export type Feature = "questionAndAnswer" | "noteContext" | "embedding"

export const DEFAULT_SETTINGS: LlmPluginSettings = {
	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	noteContextMinChars: 500,
	chunkSize: 1000,
	retrievedNodeCount: 10,

	questionAndAnswerModel: {
		provider: "OpenAI",
		model: "gpt-4.1-mini-2025-04-14",
	},
	noteContextModel: {
		provider: "OpenAI",
		model: "gpt-4.1-mini-2025-04-14",
	},
	embeddingModel: {
		provider: "OpenAI",
		model: "text-embedding-3-small",
	},

	promptFolder: "Resources/LLM/Prompts",

	providerSettings: {
		openai: {
			apiKey: "",
		},
		anthropic: {
			apiKey: "",
		},
		ollama: {
			url: "",
		},
		openaiCompatible: {
			baseUrl: "",
			apiKey: "",
		},
	},
}

export const MODEL_CONFIGS: ModelConfiguration[] = [
	{ provider: "OpenAI", model: "gpt-4.1-mini-2025-04-14" },
	{ provider: "OpenAI", model: "gpt-4.1-2025-04-14" },
	{ provider: "Anthropic", model: "claude-3-5-haiku-20241022" },
	{ provider: "Anthropic", model: "claude-3-7-sonnet-20250219" },
	{ provider: "Anthropic", model: "claude-sonnet-4-20250514" },
	{ provider: "Anthropic", model: "claude-opus-4-20250514" },
]

export const EMBEDDING_MODEL_CONFIGS: ModelConfiguration[] = [
	{ provider: "OpenAI", model: "text-embedding-3-small" },
	{ provider: "OpenAI", model: "text-embedding-3" },
]
