import { createContext } from "preact"
import { App, CachedMetadata } from "obsidian"
import { LlmPluginSettings } from "main"

export const AppContext = createContext<App | undefined>(undefined)

export const PluginSettingsContext = createContext<
	LlmPluginSettings | undefined
>(undefined)

export type NotePath = string


const frontmatterKeyCategory = "category"
const frontmatterValueWorkspace = "LLM workspace"

export function isLlmWorkspace(metadata: CachedMetadata): boolean {
	const frontmatter = metadata.frontmatter
	if (!frontmatter) return false

	return frontmatter[frontmatterKeyCategory] === frontmatterValueWorkspace
}
