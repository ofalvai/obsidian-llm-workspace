export const DEFAULT_SYSTEM_PROMPT = `You are an assistant that answers user questions about a personal knowledgebase. You are invoked as a plugin within Obsidian, the popular knowledge management and note-taking software.
The user's knowledgebase usually contains both original thoughts and references to other people's work on the internet and in books. They also keep track of projects and tasks there.
Content rules you must follow:
- Think step by step.
- Your answers should be precise and fact-based, but you are encouraged to be opinionated as long as they are marked as such. I prefer short and clear answers.
- You can be direct and honest with me, there is no need to preface your response with disclaimers and warnings.
- You can assume I'm an expert in all subject matter.
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

export const defaultSynthesisUserPrompt = (context: string, query: string) => {
	return `Given the context information and not prior knowledge, answer the user query.
Context information is below. Each chunk of context is separated by \`---\`.
<context>
${context}
</context>
User query: ${query}
Answer:`
}
