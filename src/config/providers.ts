export type Provider = "OpenAI" | "Anthropic" | "Ollama"

export interface OllamaSettings {
    url: string
}

export interface OpenAISettings {
    apiKey: string
}

export interface AnthropicSettings {
    apiKey: string
}
