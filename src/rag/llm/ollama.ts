import { nodeStreamingFetch } from "src/utils/node"
import type {
	ChatMessage,
	ChatStreamEvent,
	CompletionOptions,
	Role,
	StreamingChatCompletionClient,
	Temperature,
} from "./common"
import { iterSSEMessages } from "src/utils/sse"
import type { RequestUrlResponse } from "obsidian"

interface LocalModels {
	models: Model[]
}

interface Model {
	name: string
	model: string
	details: ModelDetails
}

interface ModelDetails {
	parameter_size: string
	quantization_level: string
}

type StreamEvent = ChunkEvent | DoneEvent

interface ChunkEvent {
	message: Message
	done: false
}

interface Message {
	role: Role
	content: string
}

interface DoneEvent {
	done: true
	prompt_eval_count: number
	eval_count: number
}

export class OllamaChatCompletionClient implements StreamingChatCompletionClient {
	private url: string
	private model: string

	constructor(url: string, model: string) {
		this.url = url
		this.model = model
	}

	get displayName(): string {
		return "${this.model} via Ollama"
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

		const stream = iterSSEMessages(resp)
		let hasStarted = false
		for await (const event of stream) {
			if (!event.data) {
				continue
			}

			const data = JSON.parse(event.data) as StreamEvent
			if (data.done) {
				yield {
					type: "stop",
					temperature: temperature(options.temperature),
					usage: {
						inputTokens: data.eval_count,
						outputTokens: data.prompt_eval_count,
						cachedInputTokens: 0, // not implemented
					},
				}
				break
			} else {
				if (!hasStarted) {
					yield { type: "start" }
					hasStarted = true
				}
				yield { type: "delta", content: data.message.content }
				break
			}
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
			const response = await this.makeRequest(messages, options)
			const newMessage = (await response.json()) as Message
			return {
				content: newMessage.content,
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

		const response = await this.makeRequest(messages, options)
		const newMessage = (await response.json()) as Message
		try {
			return JSON.parse("{" + newMessage.content) as T
		} catch (e) {
			throw new Error(
				`LLM response could not be parsed to JSON schema: ${e}\nResponse: {${newMessage.content}`,
			)
		}
	}

	async makeRequest(messages: ChatMessage[], options: CompletionOptions): Promise<Response> {
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
			return Promise.reject(resp.text)
		}
		return resp
	}
}

export async function listLoadableModels(url: string): Promise<LocalModels> {
	if (!url) {
		return Promise.reject("No URL provided")
	}

	if (url.endsWith("/")) {
		url = url.slice(0, -1)
	}

	const response = await fetch(`${url}/api/tags`)
	const data = (await response.json()) as LocalModels
	return data
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
