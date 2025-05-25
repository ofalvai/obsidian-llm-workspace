/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { get } from "svelte/store"
import { conversationStore } from "./conversation"
import type { QueryEngine } from "../rag/query-engine"
import type { StreamingChatCompletionClient, ChatStreamEvent } from "../rag/llm/common"
import type { QueryResponse } from "../rag/synthesizer"
import type { Node } from "../rag/node"

// Mock the .last() method on Array prototype for testing
declare global {
	interface Array<T> {
		last(): T | undefined
	}
}

Array.prototype.last = function <T>(this: T[]): T | undefined {
	return this[this.length - 1]
}

describe("conversationStore", () => {
	let mockQueryEngine: QueryEngine
	let mockChatClient: StreamingChatCompletionClient
	let mockCompletionOptions: any

	beforeEach(() => {
		mockQueryEngine = {
			query: vi.fn(),
		}

		mockChatClient = {
			createStreamingChatCompletion: vi.fn(),
			createChatCompletion: vi.fn(),
			createJSONCompletion: vi.fn(),
			displayName: "Mock Client",
		}

		mockCompletionOptions = {
			temperature: "balanced" as const,
			maxTokens: 1000,
		}
	})

	describe("resetConversation", () => {
		it("should reset the conversation to null", () => {
			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			
			store.resetConversation()
			
			expect(get(store)).toBeNull()
		})
	})

	describe("submitMessage - initial query", () => {
		it("should create new conversation and handle successful query", async () => {
			const mockQueryResponse: QueryResponse = {
				text: "This is the response",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			const mockIterator = (async function* () {
				yield mockQueryResponse
			})()

			vi.mocked(mockQueryEngine.query).mockReturnValue(mockIterator)

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			const attachedContent: Node[] = []

			await store.submitMessage("What is the answer?", attachedContent)

			const conversation = get(store)
			expect(conversation).toEqual({
				initialUserQuery: "What is the answer?",
				queryResponse: mockQueryResponse,
				additionalMessages: [],
				isLoading: false,
				error: null,
			})

			expect(mockQueryEngine.query).toHaveBeenCalledWith("What is the answer?", attachedContent)
		})

		it("should handle multiple query updates during streaming", async () => {
			const partialResponse: QueryResponse = {
				text: "Partial",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			const finalResponse: QueryResponse = {
				text: "Complete response",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			const mockIterator = (async function* () {
				yield partialResponse
				yield finalResponse
			})()

			vi.mocked(mockQueryEngine.query).mockReturnValue(mockIterator)

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			
			await store.submitMessage("What is the answer?", [])

			const conversation = get(store)
			expect(conversation?.queryResponse).toEqual(finalResponse)
			expect(conversation?.isLoading).toBe(false)
		})

		it("should handle query engine errors with 401 status", async () => {
			const unauthorizedError = new Error("Unexpected status code: 401")
			// eslint-disable-next-line require-yield
			const mockIterator = (async function* (): AsyncGenerator<QueryResponse> {
				throw unauthorizedError
			})()

			vi.mocked(mockQueryEngine.query).mockReturnValue(mockIterator)

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			
			await store.submitMessage("What is the answer?", [])

			const conversation = get(store)
			expect(conversation?.error?.message).toBe("Unauthorized. Did you set the right API key?")
			expect(conversation?.isLoading).toBe(false)
		})

		it("should handle generic query engine errors", async () => {
			const genericError = new Error("Network error")
			// eslint-disable-next-line require-yield
			const mockIterator = (async function* (): AsyncGenerator<QueryResponse> {
				throw genericError
			})()

			vi.mocked(mockQueryEngine.query).mockReturnValue(mockIterator)

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			
			await store.submitMessage("What is the answer?", [])

			const conversation = get(store)
			expect(conversation?.error).toBe(genericError)
			expect(conversation?.isLoading).toBe(false)
		})
	})

	describe("submitMessage - follow-up messages", () => {
		it("should add follow-up messages and handle streaming response", async () => {
			const initialQueryResponse: QueryResponse = {
				text: "Initial response",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			// Set up initial conversation
			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			const mockInitialIterator = (async function* () {
				yield initialQueryResponse
			})()
			vi.mocked(mockQueryEngine.query).mockReturnValue(mockInitialIterator)
			await store.submitMessage("What is the answer?", [])

			// Mock streaming response for follow-up
			const streamEvents: ChatStreamEvent[] = [
				{ type: "start" },
				{ type: "delta", content: "Follow" },
				{ type: "delta", content: "-up response" },
				{ type: "stop", temperature: 0.7 },
			]

			const mockStreamIterator = (async function* () {
				for (const event of streamEvents) {
					yield event
				}
			})()

			vi.mocked(mockChatClient.createStreamingChatCompletion).mockReturnValue(mockStreamIterator)

			// Submit follow-up message
			await store.submitMessage("Tell me more", [])

			const conversation = get(store)
			expect(conversation?.additionalMessages).toHaveLength(2)
			expect(conversation?.additionalMessages[0]).toEqual({
				role: "user",
				content: "Tell me more",
				attachedContent: [],
			})
			expect(conversation?.additionalMessages[1]).toEqual({
				role: "assistant",
				content: "Follow-up response",
				attachedContent: [],
			})
			expect(conversation?.isLoading).toBe(false)

			// Verify chat client was called with correct message history
			expect(mockChatClient.createStreamingChatCompletion).toHaveBeenCalledWith(
				[
					{
						role: "system",
						content: initialQueryResponse.systemPrompt,
						attachedContent: [],
					},
					{
						role: "user",
						content: initialQueryResponse.userPrompt,
						attachedContent: [],
					},
					{
						role: "assistant",
						content: initialQueryResponse.text,
						attachedContent: [],
					},
					{
						role: "user",
						content: "Tell me more",
						attachedContent: [],
					},
				],
				mockCompletionOptions
			)
		})

		it("should handle delta events when no assistant message exists yet", async () => {
			const initialQueryResponse: QueryResponse = {
				text: "Initial response",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			const mockInitialIterator = (async function* () {
				yield initialQueryResponse
			})()
			vi.mocked(mockQueryEngine.query).mockReturnValue(mockInitialIterator)
			await store.submitMessage("What is the answer?", [])

			// Mock streaming with delta before start (edge case)
			const streamEvents: ChatStreamEvent[] = [
				{ type: "delta", content: "Unexpected delta" },
				{ type: "start" },
				{ type: "delta", content: "Expected content" },
				{ type: "stop", temperature: 0.7 },
			]

			const mockStreamIterator = (async function* () {
				for (const event of streamEvents) {
					yield event
				}
			})()

			vi.mocked(mockChatClient.createStreamingChatCompletion).mockReturnValue(mockStreamIterator)

			await store.submitMessage("Tell me more", [])

			const conversation = get(store)
			expect(conversation?.additionalMessages).toHaveLength(2)
			expect(conversation?.additionalMessages[1]?.content).toBe("Expected content")
		})

		it("should handle streaming errors", async () => {
			const initialQueryResponse: QueryResponse = {
				text: "Initial response",
				sources: [],
				systemPrompt: "You are helpful",
				userPrompt: "What is the answer?",
			}

			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			const mockInitialIterator = (async function* () {
				yield initialQueryResponse
			})()
			vi.mocked(mockQueryEngine.query).mockReturnValue(mockInitialIterator)
			await store.submitMessage("What is the answer?", [])

			// Mock streaming error
			const streamingError = new Error("Streaming failed")
			// eslint-disable-next-line require-yield
			const mockStreamIterator = (async function* (): AsyncGenerator<ChatStreamEvent> {
				throw streamingError
			})()

			vi.mocked(mockChatClient.createStreamingChatCompletion).mockReturnValue(mockStreamIterator)

			await store.submitMessage("Tell me more", [])

			const conversation = get(store)
			expect(conversation?.error).toBe(streamingError)
			expect(conversation?.isLoading).toBe(false)
		})
	})

	describe("store subscription", () => {
		it("should allow subscribing to conversation updates", () => {
			const store = conversationStore(mockQueryEngine, mockChatClient, mockCompletionOptions)
			const mockSubscriber = vi.fn()

			const unsubscribe = store.subscribe(mockSubscriber)
			store.resetConversation()

			expect(mockSubscriber).toHaveBeenCalledWith(null)
			unsubscribe()
		})
	})
})
