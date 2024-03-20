import { requestUrl } from "obsidian"
import { type ChatCompletionClient, type ChatMessage, type CompletionOptions } from "./common"

// We are using the REST API directly because the Anthropic SDK refuses to run
// in the browser context: https://github.com/anthropics/anthropic-sdk-typescript/issues/28
export class AnthropicChatCompletionClient implements ChatCompletionClient {
	private options: CompletionOptions
	private apiKey: string

	constructor(apiKey: string, options: CompletionOptions) {
		this.apiKey = apiKey
		this.options = options
	}

	async createChatCompletion(messages: ChatMessage[]): Promise<ChatMessage> {
		if (messages.length == 0) {
			throw new Error(
				"At least one message is required and first message must be the system role",
			)
		}

		if (messages[0].role !== "system") {
			throw new Error("First message must be the system role, got " + messages[0].role)
		}
		try {
			const newMessage = await this.makeRequest(messages)
			return {
				content: newMessage.content[0].text,
				role: "assistant",
			}
		} catch (e) {
			return Promise.reject(e)
		}
	}

	async createJSONCompletion<T>(systemPrompt: string, userPrompt: string): Promise<T> {
		const messages: ChatMessage[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
			{ role: "assistant", content: "{" }, // force valid JSON output
		]
		const newMessage = await this.makeRequest(messages)
		try {
			return JSON.parse("{" + newMessage.content[0].text) as T
		} catch (e) {
			throw new Error(
				`LLM response could not be parsed to JSON schema: ${e}\nResponse: ${newMessage.content[0].text}`,
			)
		}
	}

	async makeRequest(messages: ChatMessage[]): Promise<Message> {
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
				system: messages[0].content,
				messages: messages.slice(1).map((message) => {
					return {
						role: message.role,
						content: message.content,
					}
				}),
			}),
			throw: false, // We handle the error ourselves, default handling swallows the error
		})
		if (response.status < 200 || response.status >= 400) {
			return Promise.reject(response.text)
		}
		return response.json as Message
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
