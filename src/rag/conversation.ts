import type { ChatCompletionClient, ChatMessage } from "./llm/common";
import type { QueryResponse, ResponseSynthesizer } from "./synthesizer";

export interface Conversation {
	initialUserQuery: string
	queryResponse: QueryResponse | null
	additionalMessages: ChatMessage[]
	isLoading: boolean
}
