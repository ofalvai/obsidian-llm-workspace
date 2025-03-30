import { DEFAULT_SYSTEM_PROMPT } from "./prompts"
import type { AnthropicSettings, OllamaSettings, OpenAISettings, Provider } from "./providers"

export interface LlmPluginSettings {
	systemPrompt: string
	noteContextMinChars: number
	chunkSize: number
	retrievedNodeCount: number

	questionAndAnswerModel: ModelConfiguration
	noteContextModel: ModelConfiguration

	promptFolder: string

	providerSettings: Record<Provider, OllamaSettings | OpenAISettings | AnthropicSettings>
}

export interface ModelConfiguration {
	provider: Provider
	model: string
}

export type Feature = "questionAndAnswer" | "noteContext"

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

	promptFolder: "Resources/LLM/Prompts",

	providerSettings: {
		OpenAI: {
			apiKey: "",
		},
		Anthropic: {
			apiKey: "",
		},
		Ollama: {
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
