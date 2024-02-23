import { createContext } from "preact"
import type { App, CachedMetadata, View } from "obsidian"
import type { LlmPluginSettings } from "config/settings"
import { writable } from "svelte/store"

export const AppContext = createContext<App | undefined>(undefined)

export const PluginSettingsContext = createContext<LlmPluginSettings | undefined>(undefined)

export type FilePath = string

const frontmatterKeyCategory = "category"
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

export const settingsStore = writable<LlmPluginSettings>()
export const appStore = writable<App>()
export const viewStore = writable<View>()
