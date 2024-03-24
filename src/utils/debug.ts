import { Notice, type App } from "obsidian"
import type { DebugInfo } from "src/rag/synthesizer"

export async function writeDebugInfo(app: App, debugInfo: DebugInfo) {
	const debugFilePath = "LLM workspace debug.md"
	const file = app.metadataCache.getFirstLinkpathDest(debugFilePath, "")
	const markdown = debugInfoToMarkdown(debugInfo)
	if (file) {
		await app.vault.append(file, markdown)
		new Notice("Debug info appended to the end of file")
	} else {
		await app.vault.create(debugFilePath, markdown)
	}

	await app.workspace.openLinkText(debugFilePath, "", "tab")
}

function debugInfoToMarkdown(debugInfo: DebugInfo): string {
	const datetime = window.moment(debugInfo.createdAt).format("YYYY-MM-DD HH:mm:ss")

	return `
### ${datetime}

**Original Query**: ${debugInfo.originalQuery}
**Query used for embedding:**: ${debugInfo.improvedQuery}

#### System Prompt

\`\`\`
${debugInfo.systemPrompt}
\`\`\`

#### User Prompt

\`\`\`
${debugInfo.userPrompt}
\`\`\`
`
}

