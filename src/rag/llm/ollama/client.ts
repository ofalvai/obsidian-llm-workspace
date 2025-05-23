import { nodeStreamingFetch } from "src/utils/node"
import type {
	ChatMessage,
	ChatStreamEvent,
	CompletionOptions,
	StreamingChatCompletionClient,
	Temperature,
} from "../common"
import type { ChatResponse, StreamEvent } from "./types"

export class OllamaClient implements StreamingChatCompletionClient {
	private url: string
	private model: string

	constructor(url: string, model: string) {
		this.url = url
		this.model = model
	}

	get displayName(): string {
		return `${this.model} via Ollama`
	}

	async *createStreamingChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): AsyncGenerator<ChatStreamEvent> {
		if (this.url === "") {
			throw new Error("Ollama URL is not set")
		}

		if (messages.length == 0) {
			throw new Error(
				"At least one message is required and first message must be the system role",
			)
		}

		if (messages[0].role !== "system") {
			throw new Error("First message must be the system role, got " + messages[0].role)
		}

		const resp = await nodeStreamingFetch(`${this.url}/api/chat`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				stream: true,
				model: this.model,
				messages: messages.map((message) => {
					return {
						role: message.role,
						content: message.content,
					}
				}),
				options: {
					temperature: temperature(options.temperature),
					num_predict: options.maxTokens,
				},
			}),
		})

		// Ollama response stream is not SSE, just a streamed newline-delimited JSON
		// so we need to parse the JSON ourselves
		resp.setEncoding("utf8")
		let streamInProgress = false
		let buffer = ""
		for await (const chunk of resp) {
			buffer += chunk
			const bufferLines = buffer.split("\n")

			// Empty the buffer, except for the last, possibly incomplete line
			buffer = bufferLines.pop() ?? ""

			for (const line of bufferLines) {
				try {
					const event = JSON.parse(line) as StreamEvent
					yield this.convertStreamEvent(event, streamInProgress, options)
					streamInProgress = true
				} catch (error) {
					throw new Error(`Failed to parse Ollama response: ${line}, error: ${error}`)
				}
			}
		}

		// Process any remaining data in the buffer
		if (buffer !== "") {
			for (const part of buffer.split("\n").filter((p) => p !== "")) {
				try {
					const event = JSON.parse(part) as StreamEvent
					yield this.convertStreamEvent(event, streamInProgress, options)
				} catch (error) {
					throw new Error(`Failed to parse Ollama response: ${part}, error: ${error}`)
				}
			}
		}
	}

	convertStreamEvent(
		event: StreamEvent,
		streamInProgress: boolean,
		options: CompletionOptions,
	): ChatStreamEvent {
		if (event.done) {
			return {
				type: "stop",
				temperature: temperature(options.temperature),
				usage: {
					inputTokens: event.eval_count, // updated from data to event
					outputTokens: event.prompt_eval_count, // updated from data to event
					cachedInputTokens: 0, // not implemented
				},
			}
		} else {
			if (!streamInProgress) {
				return { type: "start" }
			}
			return { type: "delta", content: event.message.content } // updated from data to event
		}
	}

	async createChatCompletion(
		messages: ChatMessage[],
		options: CompletionOptions,
	): Promise<ChatMessage> {
		if (this.url === "") {
			throw new Error("Ollama URL is not set")
		}

		if (messages.length == 0) {
			throw new Error(
				"At least one message is required and first message must be the system role",
			)
		}

		if (messages[0].role !== "system") {
			throw new Error("First message must be the system role, got " + messages[0].role)
		}

		try {
			const response = await this.makeChatRequest(messages, options)
			const chatResponse = (await response.json()) as ChatResponse
			return {
				content: chatResponse.message.content,
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
		if (this.url === "") {
			throw new Error("Ollama URL is not set")
		}

		const messages: ChatMessage[] = [
			{ role: "system", content: systemPrompt, attachedContent: [] },
			{ role: "user", content: userPrompt, attachedContent: [] },
			{ role: "assistant", content: "{", attachedContent: [] }, // force valid JSON output
		]

		const response = await this.makeChatRequest(messages, options)
		const chatResponse = (await response.json()) as ChatResponse
		try {
			return JSON.parse("{" + chatResponse.message.content) as T
		} catch (e) {
			throw new Error(
				`LLM response could not be parsed to JSON schema: ${e}\nResponse: {${chatResponse.message.content}`, // updated from newMessage to chatResponse
			)
		}
	}

	private async makeChatRequest(
		messages: ChatMessage[],
		options: CompletionOptions,
	): Promise<Response> {
		const resp = await fetch(`${this.url}/api/chat`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				stream: false,
				model: this.model,
				messages: messages.map((message) => {
					return {
						role: message.role,
						content: message.content,
					}
				}),
				options: {
					temperature: temperature(options.temperature),
					num_predict: options.maxTokens,
				},
			}),
		})

		if (resp.status < 200 || resp.status >= 400) {
			return Promise.reject(resp.text())
		}
		return resp
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
