import type { TFile, TFolder } from "obsidian"

export interface EmbeddedFileInfo {
	name: string
	parent: TFolder | null
	path: string
	nodeCount: number
	lastProcessed: number | undefined
}

export interface KeyTopic {
	name: string
	file: TFile | null
}
