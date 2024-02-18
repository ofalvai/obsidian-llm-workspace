import { TFile } from "obsidian"
import { useState } from "preact/hooks"
import { QueryResponse } from "rag/synthesizer"

interface QuestionAndAnswerProps {
	file: TFile
	isLoading: boolean
	queryResponse?: QueryResponse
	onQuestionSubmit: (q: string) => void
}


export const QuestionAndAnswer = (props: QuestionAndAnswerProps) => {
	const [question, setQuestion] = useState("")
	const onSubmit = (e: SubmitEvent) => {
		if (question) {
			props.onQuestionSubmit(question)
		}
		e.preventDefault()
	}
	const onInput = (e: InputEvent) => {
		setQuestion((e.target as HTMLInputElement).value)
	}

	return (
		<div>
			<form onSubmit={onSubmit}>
				<input
					type="text"
					disabled={props.isLoading}
					placeholder="Ask a question"
					value={question}
					onInput={onInput}
				/>
				<button type="submit" disabled={props.isLoading}>
					Send
					{props.isLoading && "..."}
				</button>
			</form>
			{props.queryResponse && (
				<div>
					<div class="llm-workspace-completion">{props.queryResponse.text}</div>
					<ol>
						{props.queryResponse.sources.map((node) => (
							<li>{node.parent}</li>
						))}
					</ol>
				</div>
			)}
		</div>
	)
}
