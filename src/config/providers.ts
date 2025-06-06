export type Provider = "OpenAI" | "Anthropic" | "Ollama" | "OpenAI-compatible"

export interface ProviderSettings {
	openai: OpenAISettings
	anthropic: AnthropicSettings
	ollama: OllamaSettings
	openaiCompatible: OpenAICompatibleSettings
}

export interface OllamaSettings {
	url: string
}

export interface OpenAISettings {
	apiKey: string
}

export interface AnthropicSettings {
	apiKey: string
}

export interface OpenAICompatibleSettings {
	baseUrl: string
	apiKey: string
}
