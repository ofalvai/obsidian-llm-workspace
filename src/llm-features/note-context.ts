import { EXTRACT_KEY_TOPICS_PROMPT, SUMMARY_PROMPT } from "src/config/prompts"
import type { ChatCompletionClient, CompletionOptions } from "src/rag/llm/common"

export async function noteSummary(note: string, client: ChatCompletionClient): Promise<string> {
	const options: CompletionOptions = {
		temperature: "precise",
		maxTokens: 512,
	}
	const completion = await client.createChatCompletion(
		[
			{ role: "system", content: SUMMARY_PROMPT },
			{ role: "user", content: note },
		],
		options,
	)

	return completion.content
}

export async function extractKeyTopics(
	note: string,
	client: ChatCompletionClient,
): Promise<string[]> {
	const options: CompletionOptions = {
		temperature: "precise",
		maxTokens: 1024,
	}

	type topicsSchema = {
		topics: string[]
	}
	const response = await client.createJSONCompletion<topicsSchema>(
		EXTRACT_KEY_TOPICS_PROMPT,
		note,
		options,
	)
	return response.topics
}
