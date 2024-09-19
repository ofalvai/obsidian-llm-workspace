import { nodeRepresentation, type Node } from "../rag/node"

export const DEFAULT_SYSTEM_PROMPT = `You are an assistant answering questions about the user's personal knowledgebase. You are invoked as a plugin within Obsidian, the popular knowledge management and note-taking software.
The user's knowledgebase usually contains both original thoughts and references to other people's work on the internet and in books. They also keep track of projects and tasks there.
Content rules you must follow:
- Think step by step.
- Your answers should be precise and grounded in the provided sources, but you are encouraged to be opinionated as long as they are marked as such. User prefers short and clear answers.
- You can be direct and honest with the user, there is no need to preface your response with disclaimers, warnings or filler text.
- You can assume the user is an expert in all subject matter.
- If possible, try to highlight implicit connections in the provided context that is otherwise hidden.
Formatting rules to follow:
- Use additional Markdown formatting to highlight the most important parts of your response. For example: bold, italic, bulleted and numbered lists.`

export const SELF_QUERY_PROMPT = `
Your goal is to rewrite the user's question into search keywords.
`

export const SELF_QUERY_EXAMPLES = [
	{
		input: "How do I make a pie?",
		output: "make a pie",
	},
	{
		input: "What were the major contributions of Joseph Swan to the development of the incandescent light bulb?",
		output: "Joseph Swan's contribution to development of incandescent light bulb",
	},
	{
		input: "What is the difference between a solid and a liquid?",
		output: "solid and liquid difference",
	},
	{
		input: "What are the odds for slot machines?",
		output: "slot machine odds",
	},
]

export const CONTEXT_SEPARATOR = "---***---"

export const defaultSynthesisUserPrompt = (context: string, query: string) => {
	return `Given the context information and not prior knowledge, answer the user query.
Context information is below. Each chunk of context is separated by \`${CONTEXT_SEPARATOR}\`.
<context>
${context}
</context>
User query: ${query}
Answer:`
}

export const messageWithAttachmens = (message: string, attachments: Node[]) => {
	let content = message
	if (attachments.length > 0) {
		content += `\n\nAdditional context is attached below:\n`
		content += attachments.map(a => nodeRepresentation(a)).join(`\n\n${CONTEXT_SEPARATOR}\n\n`)
	}
	return content
}

export const SUMMARY_PROMPT = `Summarize the following note in two sentences. Use simple language.
Do not add any context or prefix (such as 'The note outlines...'), just respond with the summary.
`

export const EXTRACT_KEY_TOPICS_PROMPT = `Extract key topics and entities from the following note.
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

export const WORKSPACE_QUESTIONS_PROMPT = `Your task is to generate a list of proactive questions based on the given context.
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
			"content": "How did the invention of X influence Y?",
			"theme": "impact"
		}
	]
}
Remember, certain characters need to be escaped in JSON strings.
`
