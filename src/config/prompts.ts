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
