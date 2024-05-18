import { Notice, type App } from "obsidian"
import type { QueryResponse } from "src/rag/synthesizer"

export async function writeDebugInfo(app: App, response: QueryResponse) {
	const debugFilePath = "LLM workspace debug.md"
	const file = app.metadataCache.getFirstLinkpathDest(debugFilePath, "")
	const markdown = debugInfoToMarkdown(response)
	if (file) {
		await app.vault.append(file, markdown)
		new Notice("Debug info appended to the end of file")
	} else {
		await app.vault.create(debugFilePath, markdown)
	}

	await app.workspace.openLinkText(debugFilePath, "", "tab")
}

function debugInfoToMarkdown(response: QueryResponse): string {
	if (!response.debugInfo) {
		return ""
	}

	const datetime = window.moment(response.debugInfo.createdAt).format("YYYY-MM-DD HH:mm:ss")

	return `
### ${datetime}

**Original Query**: ${response.debugInfo.originalQuery}
**Query used for embedding**: ${response.debugInfo.improvedQuery}
**Input token count**: ${response.debugInfo.inputTokens ?? "N/A"}
**Output token count**: ${response.debugInfo.outputTokens ?? "N/A"}

#### System Prompt

\`\`\`
${response.systemPrompt}
\`\`\`

#### User Prompt

\`\`\`
${response.userPrompt}
\`\`\`
`
}

