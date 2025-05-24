import path from "node:path"
import { type App, type CachedMetadata, type View } from "obsidian"
import type { LlmPluginSettings } from "src/config/settings"
import LlmPlugin from "src/main"
import { writable } from "svelte/store"

export type FilePath = string

const frontmatterKeyCategory = "category"
const frontmatterKeyContext = "context"
const frontmatterValueWorkspace = "LLM workspace"

export function isLlmWorkspace(metadata: CachedMetadata | null): boolean {
	if (!metadata) return false
	const frontmatter = metadata.frontmatter
	if (!frontmatter) return false

	if (!(frontmatterKeyCategory in frontmatter)) {
		return false
	}

	if (frontmatter[frontmatterKeyCategory] instanceof Array) {
		return frontmatter[frontmatterKeyCategory].includes(frontmatterValueWorkspace)
	}
	return frontmatter[frontmatterKeyCategory] === frontmatterValueWorkspace
}

export function readWorkspaceContext(metadata: CachedMetadata | null): string | null {
	if (!metadata) return null
	if (!metadata.frontmatter) return null

	if (frontmatterKeyContext in metadata.frontmatter) {
		return metadata.frontmatter[frontmatterKeyContext]
	}
	return null
}

export function isPlaintextFile(file: FilePath): boolean {
	// This is not a complete list, but Obsidian itself doesn't handle all plaintext file types, so this is fine.
	return [".md", ".txt", ".markdown"].includes(path.extname(file))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addWorkspaceProperty(frontmatter: any) {
	if (!frontmatter) {
		frontmatter = {}
	}
	frontmatter[frontmatterKeyCategory] = frontmatterValueWorkspace
}

// TODO: this is just an in-memory store, it could get out of sync with the actual settings
export const settingsStore = writable<LlmPluginSettings>()
export const appStore = writable<App>()
export const viewStore = writable<View>()
export const pluginStore = writable<LlmPlugin>()
