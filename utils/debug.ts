import type { DebugInfo } from "rag/synthesizer"

export function debugInfoToMarkdown(debugInfo: DebugInfo): string {
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
