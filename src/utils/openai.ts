import OpenAI from "openai"
import { AnthropicChatCompletionClient } from "src/rag/llm/anthropic"

const summaryPrompt = `Summarize the following note in two sentences. Use simple language.
Do not add any context or prefix (such as 'The note outlines...'), just respond with the summary.
`

const extractKeyTopicsPrompt = `Extract key topics and entities from the following note.
Return at most 5 key topics and entities. Each topic should be a few words long. Only provide a key topic if it's indeed important and frequently referenced.
Something referenced only once is not a key topic.
Accuracy and trustworthyness are more important than providing topics at all costs. Some documents doesn't have key topics at all.
Response format: JSON with the following schema:
{
	"topics: [
		"topic1",
		"topic2",
		"topic3"
	]
}
Don't forget to encode special characters according to the JSON format specification.
`

// TODO: refactor all of this to be based on the RAG building blocks

export async function noteSummary(note: string, apiKey: string): Promise<string> {
	const client = new AnthropicChatCompletionClient(apiKey, {
		model: "claude-3-haiku-20240307",
		temperature: 0.1,
		maxTokens: 512,
	})

	const completion = await client.createChatCompletion([
		{ role: "system", content: summaryPrompt },
		{ role: "user", content: note },
	])

	return completion.content
}

export async function extractKeyTopics(note: string, apiKey: string): Promise<string[]> {
	const client = new AnthropicChatCompletionClient(apiKey, {
		model: "claude-3-haiku-20240307",
		temperature: 0.1,
		maxTokens: 1024,
	})

	type topicsSchema = {
		topics: string[]
	}
	const response = await client.createJSONCompletion<topicsSchema>(extractKeyTopicsPrompt, note)
	return response.topics
}
