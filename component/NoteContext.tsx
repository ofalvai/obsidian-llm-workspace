import { useLiveQuery } from "dexie-react-hooks";
import { App, TFile } from "obsidian";
import { useContext, useEffect, useState, useMemo, useCallback } from "preact/hooks"
import { LlmDexie } from "storage/db";
import { extractKeyTopics, noteSummary } from "utils/openai";
import { AppContext, PluginSettingsContext } from "utils/obsidian";

const summaryMinChars = 500;

export const NoteContext = (props: { db: LlmDexie }) => {
	const app = useContext(AppContext);
	const settings = useContext(PluginSettingsContext);
	const [file, setFile] = useState(app?.workspace.getActiveFile() ?? null);

	const [isLoading, setLoading] = useState(false);

	useEffect(() => {
		const onOpen = (file: TFile | null) => {
			setFile(file)
		};
		app?.workspace.on("file-open", onOpen)
		return () => app?.workspace.off("file-open", onOpen);
	}, [app]);

	const derivedData = useLiveQuery(async () => {
		if (!file) {
			return;
		}
		return await props.db.getNoteDerivedData(file?.path)
	}, [file?.path]);

	const fetchSummary = useCallback(async () => {
		if (!file || !app || !settings?.openAIApiKey) {
			return;
		}

		const dataInDB = await props.db.getNoteDerivedData(file.path);
		if (dataInDB?.summary) {
			return;
		}

		const text = await app.vault.cachedRead(file);
		if (text.length < summaryMinChars) {
			return;
		}

		try {
			setLoading(true);

			const summary = await noteSummary(text, settings?.openAIApiKey);
			props.db.updateNoteSummary(file.path, summary);
			setLoading(false);
			return;
		} catch (e) {
			setLoading(false);
			console.error(e);
			return;
		}
	}, [file?.path]);
	useEffect(() => {
		fetchSummary();
	}, [fetchSummary]);

	const fetchTopics = useCallback(async () => {
		if (!file || !app || !settings?.openAIApiKey) {
			return;
		}

		// TODO: force refresh won't work this way
		const dataInDB = await props.db.getNoteDerivedData(file.path);
		if (dataInDB?.keyTopics && dataInDB.keyTopics.length > 0) {
			return;
		}

		try {
			setLoading(true);
			const text = await app.vault.cachedRead(file);
			const topics = await extractKeyTopics(text, settings.openAIApiKey);
			props.db.updateNoteKeyTopics(file.path, topics);
			setLoading(false);
			return;
		} catch (e) {
			setLoading(false);
			console.error(e);
			return;
		}
	}, [file?.path]);
	useEffect(() => {
		fetchTopics();
	}, [fetchTopics]);


	const onRecompute = () => {
		if (!file) return;

		props.db.deleteNoteDerivedData(file.path);
		fetchSummary();
		fetchTopics();
	};

	return <div>
		<h4>{file?.basename}</h4>
		{file && <button onClick={onRecompute}>Recompute</button>}

		{isLoading && <div>Loading...</div>}

		{derivedData?.summary && <>
			<h6>Summary</h6>
			<p>{derivedData.summary}</p>
		</>}

		{derivedData?.keyTopics && derivedData.keyTopics.length > 0 && <>
			<h6>Key topics</h6>
			<ul>
				{/* TODO: unique key */}
				{derivedData.keyTopics.map(topic => <li key={topic}>{topic}</li>)}
			</ul>
		</>}
	</div>;
};


