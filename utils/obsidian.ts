import type { App, CachedMetadata, View } from "obsidian"
import type { LlmPluginSettings } from "config/settings"
import { writable } from "svelte/store"


export type FilePath = string

const frontmatterKeyCategory = "category"
const frontmatterKeyContext = "context"
const frontmatterValueWorkspace = "LLM workspace"

export function isLlmWorkspace(metadata: CachedMetadata): boolean {
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

export function readWorkspaceContext(metadata: CachedMetadata): string | null {
	if (!metadata.frontmatter) return null

	if (frontmatterKeyContext in metadata.frontmatter) {
		return metadata.frontmatter[frontmatterKeyContext]
	}
	return null
}

export const settingsStore = writable<LlmPluginSettings>()
export const appStore = writable<App>()
export const viewStore = writable<View>()
