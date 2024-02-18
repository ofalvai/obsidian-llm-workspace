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
import { EmbeddedFileInfo, NoteLinks } from "./NoteLinks"
import { NonWorkspaceView, WorkspaceDetails } from "./WorkspaceDetails"
import { QuestionAndAnswer } from "./QuestionAndAnswer"

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
		app.workspace.openLinkText(link.path, "", "tab")
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
