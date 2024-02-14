import { useLiveQuery } from "dexie-react-hooks";
import { Notice, TFile } from "obsidian";
import { useContext, useMemo, useState } from "preact/hooks";
import { OpenAIChatCompletionClient, OpenAIEmbeddingClient } from "rag/llm";
import { Node, NodeParser } from "rag/node";
import { RetrieverQueryEngine } from "rag/query-engine";
import { EmbeddingVectorRetriever } from "rag/retriever";
import { VectorStoreIndex } from "rag/storage";
import { DumbResponseSynthesizer, QueryResponse } from "rag/synthesizer";
import { LlmDexie } from "storage/db";
import { AppContext, PluginSettingsContext, isLlmWorkspace } from "utils/obsidian";

export const WorkspaceRAG = (props: { db: LlmDexie, file: TFile }) => {
	const app = useContext(AppContext);
	const settings = useContext(PluginSettingsContext);
	if (!app || !settings) {
		return <></>
	}

	const isWorkspace = useMemo(() => {
		if (!props.file || !app) return false
		const metadata = app.metadataCache.getFileCache(props.file)
		if (!metadata) return false
		return isLlmWorkspace(metadata)
	}, [props.file]);

	// TODO: memoize all of this
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
			// TODO: this is a relative path and works only accidentally
			// https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks
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

	// TODO: cross-reference with the vector store
	// - check if the note is fully embedded
	// - how many nodes it's split into
	// - last update time
	const links = useLiveQuery(async () => {
		const workspace = await props.db.workspace.where("workspaceFile").equals(props.file.path).first()
		return workspace?.links ?? []
	}, [props.file.path], []);

	return <div>
		{!isWorkspace && <NonWorkspaceView file={props.file} />}
		{isWorkspace && <WorkspaceDetails file={props.file} links={links} onRebuild={onRebuild} />}
		{isWorkspace && <QuestionAndAnswer
			file={props.file}
			isLoading={isLoading}
			onQuestionSubmit={onQuestionSubmit}
			queryResponse={queryResponse}
		/>}
	</div>
}

const NonWorkspaceView = (props: { file: TFile }) => {
	return <div>
		<h4>Not a workspace yet</h4>
		<p>{props.file.basename} is not an LLM workspace yet. Update its frontmatter and try again.</p>
	</div>
}

const WorkspaceDetails = (props: { file: TFile, links: string[], onRebuild: () => void }) => {
	return <div>
		<p>File: {props.file.basename}</p>
		<NoteLinks file={props.file} links={props.links} />
		<button onClick={props.onRebuild}>Rebuild embedding DB</button>
	</div>
}

const NoteLinks = (props: { file: TFile, links: string[] }) => {
	return <div>
		<h6>Linked notes</h6>
		<ul>
			{props.links.map(link => <li key={link}>{link}</li>)}
		</ul>
		{props.links.length === 0 && <p>No links</p>}
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
				{props.queryResponse.sources.map(node => <li>{node.parent}</li>)}
			</ol>
		</div>}
	</div>
}
