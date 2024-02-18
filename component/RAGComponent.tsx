import { useLiveQuery } from "dexie-react-hooks"
import { Notice, TFile, TFolder } from "obsidian"
import { useContext, useMemo, useState } from "preact/hooks"
import { OpenAIChatCompletionClient, OpenAIEmbeddingClient } from "rag/llm"
import { Node, NodeParser } from "rag/node"
import { RetrieverQueryEngine } from "rag/query-engine"
import { EmbeddingVectorRetriever } from "rag/retriever"
import { VectorStoreIndex } from "rag/storage"
import { DumbResponseSynthesizer, QueryResponse } from "rag/synthesizer"
import { LlmDexie, VectorStoreEntry } from "storage/db"
import { AppContext, PluginSettingsContext, isLlmWorkspace } from "utils/obsidian"
import { ChevronDown, ChevronUp, FileCheck2, FileX2, Folder } from "lucide-preact"

export const WorkspaceRAG = (props: { db: LlmDexie; file: TFile }) => {
	const app = useContext(AppContext)
	const settings = useContext(PluginSettingsContext)
	if (!app || !settings) {
		return <></>
	}

	const isWorkspace = useMemo(() => {
		if (!props.file || !app) return false
		const metadata = app.metadataCache.getFileCache(props.file)
		if (!metadata) return false
		return isLlmWorkspace(metadata)
	}, [props.file])

	// TODO: memoize all of this
	const embeddingClient = new OpenAIEmbeddingClient(settings.openAIApiKey)
	const index = new VectorStoreIndex(props.db)
	const retriever = new EmbeddingVectorRetriever(index, embeddingClient)
	const completionClient = new OpenAIChatCompletionClient(settings.openAIApiKey, {
		model: "gpt-3.5-turbo-1106",
		temperature: 0.1,
	})
	const synthesizer = new DumbResponseSynthesizer(completionClient)
	const queryEngine = new RetrieverQueryEngine(retriever, synthesizer)

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
	const onRebuildAll = async () => {
		// TODO: delete existing index

		const nodeParser = new NodeParser(NodeParser.defaultConfig())
		const links = app.metadataCache.getFileCache(props.file)?.links ?? []

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

		let nodes: Node[] = []
		for (const path of linkedFilePaths) {
			// TODO: test for non-markdown files
			// TODO: this is a relative path and works only accidentally
			// https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks
			const file = (await app.vault.getAbstractFileByPath(path)) as TFile
			const text = await app.vault.cachedRead(file)
			nodes.push(...nodeParser.parse(text, file.path))
		}

		await VectorStoreIndex.buildWithNodes(nodes, props.file.path, embeddingClient, props.db)
	}

	const onLinkClick = (link: EmbeddedFileInfo) => {
		app.workspace.openLinkText(link.path, "", 'tab')
	 }

	const onLinkRebuild = (link: EmbeddedFileInfo) => {
		// TODO
	 }

	const links = useLiveQuery(
		async () => {
			const workspace = await props.db.workspace
				.where("workspaceFile")
				.equals(props.file.path)
				.first()

			if (!workspace) {
				console.error("Workspace not found", props.file.path)
				return []
			}

			const vectorStoreResults: VectorStoreEntry[][] = await Promise.all(
				workspace.links.map(async (link) => {
					// TODO: return a lighter object without the full string content and embedding vector
					return await props.db.vectorStore.where("node.parent").equals(link).toArray()
				})
			)

			const embeddedFileMap = vectorStoreResults.flat().reduce((map, vectorStoreEntry) => {
				const filePath = vectorStoreEntry.node.parent
				if (map.has(filePath)) {
					map.get(filePath)!.nodeCount += 1
				} else {
					const file = app.vault.getAbstractFileByPath(filePath) as TFile
					map.set(filePath, {
						name: file.basename,
						parent: file.parent,
						path: filePath,
						nodeCount: 1,
						lastProcessed: vectorStoreEntry.node.createdAt,
					})
				}
				return map
			}, new Map<String, EmbeddedFileInfo>())

			return workspace.links.map((link) => {
				const embeddingInfo = embeddedFileMap.get(link)
				if (embeddingInfo) {
					if (embeddingInfo.path != link) {
						console.warn(
							`Mismatch between path of vector store entry and workspace link:\nPath from vector store entry: ${embeddingInfo.path}\nPath from workspace: ${link}`
						)
					}
					return embeddingInfo
				} else {
					const file = app.vault.getAbstractFileByPath(link) as TFile
					return {
						name: file.basename,
						parent: file.parent,
						path: link,
						nodeCount: 0,
						lastProcessed: undefined,
					}
				}
			})
		},
		[props.file.path],
		[]
	)

	return (
		<div>
			{!isWorkspace && <NonWorkspaceView file={props.file} />}
			{isWorkspace && (
				<WorkspaceDetails
					file={props.file}
					links={links}
					onRebuildAll={onRebuildAll}
					onLinkClick={onLinkClick}
					onLinkRebuild={onLinkRebuild}
				/>
			)}
			{isWorkspace && (
				<QuestionAndAnswer
					file={props.file}
					isLoading={isLoading}
					onQuestionSubmit={onQuestionSubmit}
					queryResponse={queryResponse}
				/>
			)}
		</div>
	)
}

interface EmbeddedFileInfo {
	name: string
	parent: TFolder | null
	path: string
	nodeCount: number
	lastProcessed: number | undefined
}

const NonWorkspaceView = (props: { file: TFile }) => {
	return (
		<div>
			<h4>Not a workspace yet</h4>
			<p>
				{props.file.basename} is not an LLM workspace yet. Update its frontmatter and try
				again.
			</p>
		</div>
	)
}

type WorkspaceDetailsProps = {
	file: TFile
	links: EmbeddedFileInfo[]
	onRebuildAll: () => void
	onLinkClick: (link: EmbeddedFileInfo) => void
	onLinkRebuild: (link: EmbeddedFileInfo) => void
}
const WorkspaceDetails = ({
	file,
	links,
	onRebuildAll,
	onLinkClick,
	onLinkRebuild,
}: WorkspaceDetailsProps) => {
	return (
		<div>
			<NoteLinks
				file={file}
				links={links}
				onLinkClick={onLinkClick}
				onLinkRebuild={onLinkRebuild}
			/>
			<button onClick={onRebuildAll}>Rebuild embedding DB</button>
		</div>
	)
}

type NoteLinksProps = {
	file: TFile
	links: EmbeddedFileInfo[]
	onLinkClick: (link: EmbeddedFileInfo) => void
	onLinkRebuild: (link: EmbeddedFileInfo) => void
}
const NoteLinks = ({ file, links, onLinkClick, onLinkRebuild }: NoteLinksProps) => {
	return (
		<div>
			<h6>Linked notes</h6>
			<ul>
				{links.map((link) => (
					<NoteLink link={link} onLinkClick={onLinkClick} onRebuild={onLinkRebuild} />
				))}
			</ul>
			{links.length === 0 && <p>No links</p>}
		</div>
	)
}

type NoteLinkProps = {
	link: EmbeddedFileInfo
	onLinkClick: (link: EmbeddedFileInfo) => void
	onRebuild: (link: EmbeddedFileInfo) => void
}
const NoteLink = ({ link, onLinkClick, onRebuild }: NoteLinkProps) => {
	let label = ""
	switch (link.nodeCount) {
		case 0:
			label = "Not indexed yet"
			break
		case 1:
			label = "Indexed as 1 node "
			// TODO: it should periodically re-render to update the timestamp
			label += window.moment(link.lastProcessed).fromNow()
			break
		default:
			label = `Indexed as ${link.nodeCount} nodes `
			label += window.moment(link.lastProcessed).fromNow()
	}
	const [isCollapsed, setCollapsed] = useState(true)
	return (
		<div key={link.path} class="llm-workspace-link-container">
			<div class="llm-workspace-link-header">
				<span
					class="llm-workspace-link-status-icon"
					aria-label={label}
					data-tooltip-position="top"
					data-tooltip-delay="300"
				>
					{link.nodeCount == 0 && (
						<FileX2 size={18} color="var(--background-modifier-error)" />
					)}
					{link.nodeCount > 0 && (
						<FileCheck2 size={18} color="var(--background-modifier-success)" />
					)}
				</span>
				<a class="llm-workspace-link-name" onClick={() => onLinkClick(link)}>{link.name}</a>
				<div
					class="clickable-icon llm-workspace-link-expand"
					onClick={() => setCollapsed(!isCollapsed)}
				>
					{isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
				</div>
			</div>

			<div
				className={"llm-workspace-link-details " + (isCollapsed ? "collapsed" : "expanded")}
			>
				{link.parent && !link.parent.isRoot() && (
					<div class="llm-workspace-link-parent">
						<Folder size={18} class="llm-workspace-link-icon-folder" />
						{link.parent.name}
					</div>
				)}
				<button onClick={() => onRebuild(link)}>Re-index file</button>
			</div>
		</div>
	)
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
