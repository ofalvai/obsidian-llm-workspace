import { App, Notice, TFile } from "obsidian";
import { useCallback, useContext, useMemo, useState } from "preact/hooks";
import { OpenAIChatCompletionClient, OpenAIEmbeddingClient } from "rag/llm";
import { NodeParser, Node } from "rag/node";
import { RetrieverQueryEngine } from "rag/query-engine";
import { EmbeddingVectorRetriever } from "rag/retriever";
import { VectorStoreIndex } from "rag/storage";
import { DumbResponseSynthesizer, QueryResponse } from "rag/synthesizer";
import { LlmDexie } from "storage/db";
import { AppContext, PluginSettingsContext } from "utils/obsidian";

const frontmatterKeyCategory = "category"
const frontmatterValueWorkspace = "LLM workspace"

export const WorkspaceRAG = (props: { db: LlmDexie, file: TFile }) => {
	const app = useContext(AppContext);
	const settings = useContext(PluginSettingsContext);
	if (!app || !settings) {
		return <></>
	}

	const isWorkspace = useMemo(() => {
		if (!props.file || !app) return false
		return isLlmWorkspace(props.file, app)
	}, [props.file]);

	const embeddingClient = new OpenAIEmbeddingClient(
		settings.openAIApiKey
	);
	const index = new VectorStoreIndex(props.db);
	const retriever = new EmbeddingVectorRetriever(index, embeddingClient);
	const completionClient = new OpenAIChatCompletionClient(
		settings.openAIApiKey,
		{
			model: "gpt-3.5-turbo-1106",
			temperature: 0.1,
		}
	);
	const synthesizer = new DumbResponseSynthesizer(completionClient);
	const queryEngine = new RetrieverQueryEngine(retriever, synthesizer);


	const [queryResponse, setQueryResponse] = useState<QueryResponse | undefined>(undefined)
	const [isLoading, setLoading] = useState(false)
	const onQuestionSubmit = async (q: string) => {
		setLoading(true)
		try {
			const response = await queryEngine.query(q, props.file.path)
			setQueryResponse(response)
		} catch (e) {
			console.error(e)
		} finally {
			setLoading(false)
		}
	}
	const onRebuild = async () => {
		// TODO: delete existing index

		const nodeParser = new NodeParser(NodeParser.defaultConfig());
		const links = app.metadataCache.getFileCache(props.file)?.links ?? [];

		let linkedFilePaths: string[] = []
		if (props.file.path in app.metadataCache.resolvedLinks) {
			const linksOfFile = app.metadataCache.resolvedLinks[props.file.path]
			linkedFilePaths = Object.keys(linksOfFile)
		} else {
			linkedFilePaths = []
		}

		if (linkedFilePaths.length === 0) {
			new Notice("Workspace has no linked notes")
			return
		}

		let nodes: Node[] = [];
		for (const path of linkedFilePaths) {
			// TODO: test for non-markdown files
			const file = await app.vault.getAbstractFileByPath(path) as TFile
			const text = await app.vault.cachedRead(file)
			nodes.push(...nodeParser.parse(text, file.path))
		}

		await VectorStoreIndex.buildWithNodes(
			nodes,
			props.file.path,
			embeddingClient,
			props.db
		);
	}

	return <div>
		{!isWorkspace && <NonWorkspaceView file={props.file} />}
		{isWorkspace && <WorkspaceDetails file={props.file} onRebuild={onRebuild} />}
		{isWorkspace && <QuestionAndAnswer
			file={props.file}
			isLoading={isLoading}
			onQuestionSubmit={onQuestionSubmit}
			queryResponse={queryResponse}
		/>}
	</div>
}

function isLlmWorkspace(file: TFile, app: App): boolean {
	const frontmatter = app?.metadataCache.getFileCache(file)?.frontmatter
	if (!frontmatter) return false;

	return frontmatter[frontmatterKeyCategory] === frontmatterValueWorkspace;
}

const NonWorkspaceView = (props: { file: TFile }) => {
	return <div>
		<h4>Not a workspace yet</h4>
		<p>{props.file.basename} is not an LLM workspace yet. Update its frontmatter and try again.</p>
	</div>
}

const WorkspaceDetails = (props: { file: TFile, onRebuild: () => void }) => {

	return <div>
		<p>File: {props.file.basename}</p>
		<NoteLinks file={props.file} />
		<button onClick={props.onRebuild}>Rebuild embedding DB</button>
	</div>
}

const NoteLinks = (props: { file: TFile }) => {
	const app = useContext(AppContext);
	const links = app?.metadataCache.getFileCache(props.file)?.links ?? [];

	return <div>
		<h6>Linked notes</h6>
		<ul>
			{links.map(link => <li key={link.link}>{link.link}</li>)}
		</ul>
		{links.length === 0 && <p>No links</p>}
	</div>;
}

interface QuestionAndAnswerProps {
	file: TFile
	isLoading: boolean
	queryResponse?: QueryResponse
	onQuestionSubmit: (q: string) => void
}

const QuestionAndAnswer = (props: QuestionAndAnswerProps) => {
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

	return <div>
		<form onSubmit={onSubmit}>
			<input
				type="text"
				disabled={props.isLoading}
				placeholder="Ask a question"
				value={question}
				onInput={onInput} />
			<button
				type="submit"
				disabled={props.isLoading}>
				Send
				{props.isLoading && "..."}
			</button>
		</form>
		{props.queryResponse && <div>
			<p>{props.queryResponse.text}</p>
			<ol>
				{props.queryResponse.sources.map(node => <li>{node.parentFilePath}</li>)}
			</ol>
		</div>}
	</div>
}
