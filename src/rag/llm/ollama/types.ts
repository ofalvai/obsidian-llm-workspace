import type { Role } from "../common"

export interface LocalModels {
	models: Model[]
}

export interface Model {
	name: string
	model: string
	details: ModelDetails
}

interface ModelDetails {
	parameter_size: string
	quantization_level: string
}

export type StreamEvent = ChunkEvent | DoneEvent

export interface ChunkEvent {
	message: Message
	done: false
}

export interface Message {
	role: Role
	content: string
}

export interface DoneEvent {
	done: true
	prompt_eval_count: number
	eval_count: number
}

export interface ChatResponse {
	message: Message
}

export interface EmbeddingResponse {
	embeddings: number[][]	
}
