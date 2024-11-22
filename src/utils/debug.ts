import { type App } from "obsidian"
import type { QueryResponse } from "src/rag/synthesizer"

export async function writeDebugInfo(app: App, response: QueryResponse) {
	const debugFilePath = "LLM workspace debug.md"
	const file = app.metadataCache.getFirstLinkpathDest(debugFilePath, "")
	const markdown = debugInfoToMarkdown(response)
	if (file) {
		await app.fileManager.trashFile(file)
	}
	await app.vault.create(debugFilePath, markdown)

	await app.workspace.openLinkText(debugFilePath, "", "tab")
}

function debugInfoToMarkdown(response: QueryResponse): string {
	if (!response.debugInfo) {
		return ""
	}

	const datetime = window.moment(response.debugInfo.createdAt).format("YYYY-MM-DD HH:mm:ss")

	return `
### ${datetime}

**Original Query**: ${response.retrievalDetails?.originalQuery}
**Query used for embedding**: ${response.retrievalDetails?.improvedQuery}
**Input tokens**: ${response.debugInfo.inputTokens ?? "N/A"}
**Cached input tokens**: ${response.debugInfo.cachedInputTokens ?? "N/A"}
**Output tokens**: ${response.debugInfo.outputTokens ?? "N/A"}
**Temperature**: ${response.debugInfo.temperature}

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
