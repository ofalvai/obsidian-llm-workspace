import { TFile } from "obsidian"
import path from "path"
import { useState } from "preact/hooks"
import { DebugInfo, QueryResponse } from "rag/synthesizer"

interface QuestionAndAnswerProps {
	file: TFile
	isLoading: boolean
	queryResponse?: QueryResponse
	debugInfo?: DebugInfo
	onQuestionSubmit: (q: string) => void
	onSourceClick: (path: string) => void
}

export const QuestionAndAnswer = ({
	file,
	isLoading,
	queryResponse,
	onQuestionSubmit,
	onSourceClick,
}: QuestionAndAnswerProps) => {
	const [question, setQuestion] = useState("")
	const onSubmit = (e: SubmitEvent) => {
		if (question) {
			onQuestionSubmit(question)
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
					disabled={isLoading}
					placeholder="Ask a question"
					value={question}
					onInput={onInput}
				/>
				<button type="submit" disabled={isLoading}>
					Send
					{isLoading && "..."}
				</button>
			</form>
			{queryResponse && (
				<div>
					<div class="llm-workspace-completion">{queryResponse.text}</div>
					<SourceList queryResponse={queryResponse} onSourceClick={onSourceClick} />
				</div>
			)}
		</div>
	)
}

type SourceListProps = {
	queryResponse: QueryResponse
	onSourceClick: (path: string) => void
}
type SourceFile = {
	base: string
	path: string
	similarity: number
}
const SourceList = ({ queryResponse, onSourceClick }: SourceListProps) => {
	const fileList: SourceFile[] = []

	for (const source of queryResponse.sources) {
		const existing = fileList.find((f) => f.path === source.node.parent)
		if (existing) {
			existing.similarity = Math.max(existing.similarity, source.similarity)
		} else {
			fileList.push({
				base: path.basename(source.node.parent, path.extname(source.node.parent)),
				path: source.node.parent,
				similarity: source.similarity,
			})
		}
	}

	return (
		<ol>
			{fileList.map((f) => (
				<Source sourceFile={f} onClick={onSourceClick} />
			))}
		</ol>
	)
}

type SourceProps = {
	sourceFile: SourceFile
	onClick: (path: string) => void
}
const Source = ({ sourceFile, onClick }: SourceProps) => {
	const percentage = Math.round(sourceFile.similarity * 100)

	return (
		<li onClick={() => onClick(sourceFile.path)}>
			<a>{sourceFile.base}</a> <span aria-label="Relevance score">({percentage}%)</span>
		</li>
	)
}
