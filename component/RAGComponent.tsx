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

export type WorkspaceProps = {
	workspaceFile: TFile
	db: LlmDexie
}
export const Workspace = ({ db, workspaceFile }: WorkspaceProps) => {
	const app = useContext(AppContext)
	const settings = useContext(PluginSettingsContext)
	if (!app || !settings) {
		return <></>
	}

	const isWorkspace = useMemo(() => {
		if (!workspaceFile || !app) return false
		const metadata = app.metadataCache.getFileCache(workspaceFile)
		if (!metadata) return false
		return isLlmWorkspace(metadata)
	}, [workspaceFile])

	// TODO: memoize all of this
	const nodeParser = new NodeParser(NodeParser.defaultConfig())
	const embeddingClient = new OpenAIEmbeddingClient(settings.openAIApiKey)
	const vectorStore = new VectorStoreIndex(db)
	const retriever = new EmbeddingVectorRetriever(vectorStore, embeddingClient)
	const completionClient = new OpenAIChatCompletionClient(settings.openAIApiKey, {
		model: "gpt-3.5-turbo-1106",
		temperature: 0.1,
	})
	const synthesizer = new DumbResponseSynthesizer(completionClient, settings.systemPrompt)
	const queryEngine = new RetrieverQueryEngine(retriever, synthesizer)

	const [queryResponse, setQueryResponse] = useState<QueryResponse | undefined>(undefined)
	const [isLoading, setLoading] = useState(false)
	const onQuestionSubmit = async (q: string) => {
		setLoading(true)
		try {
			const response = await queryEngine.query(q, workspaceFile.path)
			setQueryResponse(response)
		} catch (e) {
			console.error(e)
		} finally {
			setLoading(false)
		}
	}
	const onRebuildAll = async () => {
		// Collect all linked files
		// Note: we can't use `app.metadataCache.getFileCache(workspaceFile).links` because
		// it doesn't contain the full path of the linked file
		let linkedFilePaths: string[] = []
		if (workspaceFile.path in app.metadataCache.resolvedLinks) {
			const linksOfFile = app.metadataCache.resolvedLinks[workspaceFile.path]
			linkedFilePaths = Object.keys(linksOfFile)
		} else {
			linkedFilePaths = []
		}

		if (linkedFilePaths.length === 0) {
			new Notice("Workspace has no linked notes")
			return
		}

		await vectorStore.deleteFiles(...linkedFilePaths)

		for (const path of linkedFilePaths) {
			// TODO: test for non-markdown files
			// TODO: batched iteration
			const file = app.vault.getAbstractFileByPath(path) as TFile
			const text = await app.vault.cachedRead(file)
			for (const node of nodeParser.parse(text, file.path)) {
				const embedding = await embeddingClient.embedNode(node)
				await vectorStore.addNode(node, embedding, workspaceFile.path)
			}
		}
	}

	const onLinkClick = (path: string) => {
		app.workspace.openLinkText(path, "", "tab")
	}

	const onLinkRebuild = async (link: EmbeddedFileInfo) => {
		await vectorStore.deleteFiles(link.path)
		const file = app.vault.getAbstractFileByPath(link.path) as TFile
		const text = await app.vault.cachedRead(file)
		for (const node of nodeParser.parse(text, file.path)) {
			const embedding = await embeddingClient.embedNode(node)
			await vectorStore.addNode(node, embedding, workspaceFile.path)
		}
	}

	const links = useLiveQuery(
		async () => {
			const workspace = await db.workspace
				.where("workspaceFile")
				.equals(workspaceFile.path)
				.first()

			if (!workspace) {
				console.error("Workspace not found", workspaceFile.path)
				return []
			}

			const vectorStoreResults: VectorStoreEntry[][] = await Promise.all(
				workspace.links.map(async (link) => {
					// TODO: return a lighter object without the full string content and embedding vector
					return await db.vectorStore.where("node.parent").equals(link).toArray()
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
		[workspaceFile.path],
		[]
	)

	return (
		<div>
			{!isWorkspace && <NonWorkspaceView file={workspaceFile} />}
			{isWorkspace && (
				<WorkspaceDetails
					file={workspaceFile}
					links={links}
					onRebuildAll={onRebuildAll}
					onLinkClick={onLinkClick}
					onLinkRebuild={onLinkRebuild}
				/>
			)}
			{isWorkspace && (
				<QuestionAndAnswer
					file={workspaceFile}
					isLoading={isLoading}
					onQuestionSubmit={onQuestionSubmit}
					onSourceClick={onLinkClick}
					queryResponse={queryResponse}
				/>
			)}
		</div>
	)
}
