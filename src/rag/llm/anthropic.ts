import { requestUrl, type RequestUrlResponse } from "obsidian"
import {
	type ChatMessage,
	type ChatStreamEvent,
	type CompletionOptions,
	type StreamingChatCompletionClient,
	type Temperature,
} from "./common"
import { iterSSEMessages } from "../../utils/sse"
import { nodeStreamingFetch } from "src/utils/node"
import { messageWithAttachmens } from "src/config/prompts"

interface Message {
	id: string
	model: string
	content: MessageContent[]
	usage: Usage
}

interface MessageContent {
	text: string
	type: "text"
}

interface Usage {
	input_tokens?: number
	output_tokens?: number
}

type StreamEvent =
	| MessageStartEvent
	| ContentBlockStartEvent
	| ContentBlockDeltaEvent
	| MessageDelta
	| MessageStopEvent

interface MessageStartEvent {
	type: "message_start"
	message: Message
}

interface ContentBlockStartEvent {
	type: "content_block_start"
	// Ignoring rest of the fields because text seems to be always empty
}

interface ContentBlockDeltaEvent {
	type: "content_block_delta"
	delta: ContentDelta
}

interface ContentDelta {
	type: string
	text: string
}

interface MessageDelta {
	type: "message_delta"
	usage: Usage
}

interface MessageStopEvent {
	type: "message_stop"
}

// We are using the REST API directly because the Anthropic SDK refuses to run
// in the browser context: https://github.com/anthropics/anthropic-sdk-typescript/issues/28
export class AnthropicChatCompletionClient implements StreamingChatCompletionClient {
	private apiKey: string
	private model: string

	constructor(apiKey: string, model: string) {
		this.apiKey = apiKey
		this.model = model
	}

	get displayName(): string {
		return `Anthropic ${this.model}`
	}

	async *createStreamingChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): AsyncGenerator<ChatStreamEvent> {
		if (this.apiKey === "") throw new Error("Anthropic API key is not set")

		if (messages.length == 0) {
			throw new Error(
				"At least one message is required and first message must be the system role",
			)
		}

		if (messages[0].role !== "system") {
			throw new Error("First message must be the system role, got " + messages[0].role)
		}

		const resp = await nodeStreamingFetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"anthropic-version": "2023-06-01",
				"x-api-key": this.apiKey,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				stream: true,
				model: this.model,
				temperature: temperature(options.temperature),
				max_tokens: options.maxTokens,
				system: messages[0].content,
				messages: messages.slice(1).map((message) => {
					return {
						role: message.role,
						content: messageWithAttachmens(message.content, message.attachedContent),
					}
				}),
			}),
		})

		let inputTokenCount = 0
		let outputTokenCount = 0

		// Modern Node Readable is an async iterable, we
		// can use `for await` to read from it.
		const stream = iterSSEMessages(resp)
		for await (const event of stream) {
			if (!event.data) {
				continue
			}
			const data = JSON.parse(event.data) as StreamEvent
			switch (data.type) {
				case "message_start":
					if (data.message.usage.input_tokens) {
						inputTokenCount += data.message.usage.input_tokens
					}
					yield { type: "start" }
					break
				case "content_block_delta":
					yield { content: data.delta.text, type: "delta" }
					break
				case "message_delta":
					if (data.usage.output_tokens) {
						outputTokenCount = data.usage.output_tokens
					}
					break
				case "message_stop":
					yield {
						type: "stop",
						usage: { inputTokens: inputTokenCount, outputTokens: outputTokenCount },
						temeperature: temperature(options.temperature),
					}
					break
			}
		}
	}

	async createChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): Promise<ChatMessage> {
		if (this.apiKey === "") throw new Error("Anthropic API key is not set")

		if (messages.length == 0) {
			throw new Error(
				"At least one message is required and first message must be the system role",
			)
		}

		if (messages[0].role !== "system") {
			throw new Error("First message must be the system role, got " + messages[0].role)
		}
		try {
			const response = await this.makeRequest(messages, options, false)
			const newMessage = (await response.json) as Message
			return {
				content: newMessage.content[0].text,
				role: "assistant",
				attachedContent: [],
			}
		} catch (e) {
			return Promise.reject(e)
		}
	}

	async createJSONCompletion<T>(
		systemPrompt: string,
		userPrompt: string,
		options: CompletionOptions,
	): Promise<T> {
		if (this.apiKey === "") throw new Error("Anthropic API key is not set")

		const messages: ChatMessage[] = [
			{ role: "system", content: systemPrompt, attachedContent: [] },
			{ role: "user", content: userPrompt, attachedContent: [] },
			{ role: "assistant", content: "{", attachedContent: [] }, // force valid JSON output
		]
		const response = await this.makeRequest(messages, options, false)
		const newMessage = (await response.json) as Message
		try {
			return JSON.parse("{" + newMessage.content[0].text) as T
		} catch (e) {
			throw new Error(
				`LLM response could not be parsed to JSON schema: ${e}\nResponse: {${newMessage.content[0].text}`,
			)
		}
	}

	async makeRequest(
		messages: ChatMessage[],
		options: CompletionOptions,
		stream: boolean,
	): Promise<RequestUrlResponse> {
		// Anthropic API doesn't set CORS headers correctly, so we can't use the new fetch API here.
		// Obsidian's requestUrl() doesn't enforce CORS.
		const response = await requestUrl({
			url: "https://api.anthropic.com/v1/messages",
			method: "POST",
			contentType: "application/json",
			headers: {
				"anthropic-version": "2023-06-01",
				"x-api-key": this.apiKey,
			},
			body: JSON.stringify({
				stream: stream,
				model: this.model,
				temperature: temperature(options.temperature),
				max_tokens: options.maxTokens,
				system: messages[0].content,
				messages: messages.slice(1).map((message) => {
					return {
						role: message.role,
						content: messageWithAttachmens(message.content, message.attachedContent),
					}
				}),
			}),
			throw: false, // We handle the error ourselves, default handling swallows the error
		})
		if (response.status < 200 || response.status >= 400) {
			return Promise.reject(response.text)
		}
		return response
	}
}

function temperature(t: Temperature): number {
	switch (t) {
		case "balanced":
			return 0.5
		case "creative":
			return 0.9
		case "precise":
			return 0.1
	}
}
