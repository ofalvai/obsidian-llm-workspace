import { requestUrl } from "obsidian";
import { Role, type ChatCompletionClient, type ChatMessage, type CompletionOptions } from "./common";


// We are using the REST API directly because the Anthropic SDK refuses to run
// in the browser context: https://github.com/anthropics/anthropic-sdk-typescript/issues/28
export class AnthropicChatCompletionClient implements ChatCompletionClient {
	private options: CompletionOptions
	private apiKey: string

	constructor(apiKey: string, options: CompletionOptions) {
		this.apiKey = apiKey
		this.options = options
	}

	async createChatCompletion(userPrompt: string, systemPrompt: string): Promise<ChatMessage> {
		try {
			const response = await requestUrl({
				url: "https://api.anthropic.com/v1/messages",
				method: "POST",
				contentType: "application/json",
				headers: {
					"anthropic-version": "2023-06-01",
					"x-api-key": this.apiKey,
				},
				body: JSON.stringify({
					model: this.options.model,
					temperature: this.options.temperature,
					max_tokens: this.options.maxTokens,
					system: systemPrompt,
					messages: [
						{
							role: "user",
							content: userPrompt,
						},
					],
				}),
				throw: false, // We handle the error ourselves, default handling swallows the error
			})
			if (response.status < 200 || response.status >= 400) {
				return Promise.reject(response.text)
			}
			const message = response.json as Message
	
			return {
				content: message.content[0].text,
				role: Role.Assistant,
			}
		} catch (e) {
			return Promise.reject(e)
		}
	}
}

interface Message {
	id: string
	model: string
	content: MessageContent[]
}

interface MessageContent {
	text: string
	type: "text"
}
