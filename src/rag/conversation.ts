import type { ChatMessage } from "./llm/common";
import type { QueryResponse } from "./synthesizer";

export interface Conversation {
	initialUserQuery: string
	queryResponse: QueryResponse | null
	additionalMessages: ChatMessage[]
	isLoading: boolean
	error: any | null
}
