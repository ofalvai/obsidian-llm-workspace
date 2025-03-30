export type Provider = "OpenAI" | "Anthropic" | "Ollama"

export interface ProviderSettings {
	openai: OpenAISettings
	anthropic: AnthropicSettings
	ollama: OllamaSettings
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
