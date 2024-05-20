import type { Vault, Workspace } from "obsidian"
import type { EmbeddedFileInfo } from "src/component/types"
import type { ChatCompletionClient, CompletionOptions } from "src/rag/llm/common"

const fileCount = 10
const fileTruncateLimit = 1000 // characters, not tokens
const questionsPrompt = `Your task is to generate a list of proactive questions based on the given context.
The context is a sample of documents about a specific research topic.
For each question, you should consider the following:
1. What is the main theme of the question? Pick a theme that is at most 3 words long. The theme should use plain language, no need to escape characters.
2. What is an appropriate question to explore the provided documents? It should be a full sentence, ending with a question mark.
Generate AT MOST 6 questions. If you can't think of any more questions, you can provide fewer.
Response format: JSON with the following schema:
{
	"questions": [
		{
			"content": "How do the different technologies compare (X, Y, Z) in terms of W?",
			"theme": "comparison"
		},
		{
			"content": "How did the invention of X influences Y?",
			"theme": "impact"
		}
	]
}
Remember, certain characters need to be escaped in JSON strings.
`

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
		maxTokens: 1024,
	}
	const result = await client.createJSONCompletion<WorkspaceQuestionHolder>(
		questionsPrompt,
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
