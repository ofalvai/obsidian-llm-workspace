import OpenAI from "openai"
import { AnthropicChatCompletionClient } from "rag/llm/anthropic"

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
`

// TODO: refactor all of this to be based on the RAG building blocks

export async function noteSummary(note: string, apiKey: string): Promise<string> {
	const client = new AnthropicChatCompletionClient(apiKey, {
		model: "claude-3-sonnet-20240229",
		temperature: 0.1,
		maxTokens: 512
	})

	const completion = await client.createChatCompletion([
		{ role: "system", content: summaryPrompt },
		{ role: "user", content: note },
	])

	return completion.content
}

// TODO: https://docs.anthropic.com/claude/docs/control-output-format
export async function extractKeyTopics(note: string, apiKey: string): Promise<string[]> {
	const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content: extractKeyTopicsPrompt,
			},
			{ role: "user", content: note },
		],
		model: "gpt-3.5-turbo-1106",
		response_format: { type: "json_object" },
		temperature: 0.3,
	})

	console.info(`Key topics token use: ${completion.usage?.total_tokens}`)

	const response = completion.choices[0].message.content
	try {
		return JSON.parse(response!)["topics"]
	} catch (error) {
		throw new Error(`OpenAI response could not be parsed to schema: ${error}\nResponse: ${response}`)
	}
}
