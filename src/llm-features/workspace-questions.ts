import type { Vault } from "obsidian"
import type { EmbeddedFileInfo } from "src/component/types"
import { WORKSPACE_QUESTIONS_PROMPT } from "src/config/prompts"
import type { ChatCompletionClient, CompletionOptions } from "src/rag/llm/common"

const fileCount = 10
const fileTruncateLimit = 1000 // characters, not tokens

// This type is used just for JSON parsing
type WorkspaceQuestionHolder = {
	questions: WorkspaceQuestion[]
}

export type WorkspaceQuestion = {
	content: string
	theme: string
}

export async function workspaceQuestions(
	client: ChatCompletionClient,
	vault: Vault,
	files: EmbeddedFileInfo[],
): Promise<WorkspaceQuestion[]> {
	const context = await sample(files, vault)

	const options: CompletionOptions = {
		temperature: "creative",
		maxTokens: 4096,
	}
	const result = await client.createJSONCompletion<WorkspaceQuestionHolder>(
		WORKSPACE_QUESTIONS_PROMPT,
		context,
		options,
	)

	return result.questions
}

async function sample(files: EmbeddedFileInfo[], vault: Vault): Promise<string> {
	const sampledFiles = files.sort(() => Math.random() - 0.5).slice(0, fileCount)
	const fileContents = await Promise.all(
		sampledFiles.map(async (fileInfo) => {
			const file = vault.getFileByPath(fileInfo.path)
			if (!file) {
				return ""
			}
			const fullContent = await vault.cachedRead(file)
			if (fullContent.length < fileTruncateLimit) {
				return fullContent
			} else {
				return fullContent.slice(0, fileTruncateLimit) + "... (truncated)"
			}
		}),
	)
	return fileContents.map((note, i) => `### Source ${i + 1}\n\n${note}`).join("\n\n---\n\n")
}
