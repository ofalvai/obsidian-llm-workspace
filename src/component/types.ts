import type { TFolder } from "obsidian"

export interface EmbeddedFileInfo {
	name: string
	parent: TFolder | null
	path: string
	nodeCount: number
	lastProcessed: number | undefined
}
