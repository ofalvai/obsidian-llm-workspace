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
		model: "gpt-4o-mini-2024-07-18",
	},
	noteContextModel: {
		provider: "OpenAI",
		model: "gpt-4o-mini-2024-07-18",
	},
	embeddingModel: {
		provider: "OpenAI",
		model: "text-embedding-3-small"
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
	},
}

export const MODEL_CONFIGS: ModelConfiguration[] = [
	{ provider: "OpenAI", model: "gpt-4-turbo-2024-04-09" },
	{ provider: "OpenAI", model: "gpt-4o-2024-08-06" },
	{ provider: "OpenAI", model: "gpt-4o-mini-2024-07-18" },
	{ provider: "Anthropic", model: "claude-3-haiku-20240307" },
	{ provider: "Anthropic", model: "claude-3-sonnet-20240229" },
	{ provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
	{ provider: "Anthropic", model: "claude-3-opus-20240229" },
]

export const EMBEDDING_MODEL_CONFIGS: ModelConfiguration[] = [
	{ provider: "OpenAI", model: "text-embedding-3-small" },
	{ provider: "OpenAI", model: "text-embedding-3" },
]
