<script lang="ts">
	import { liveQuery, type Observable } from "dexie"
	import { TFile } from "obsidian"
	import type { LlmDexie, NoteDerivedData } from "storage/db"
	import { readable, writable } from "svelte/store"
	import { appStore, settingsStore } from "utils/obsidian"
	import { extractKeyTopics, noteSummary } from "utils/openai"

	export let db: LlmDexie

	// TODO: add UI that displays when this happens
	const minChars = 500

	let element: HTMLElement | undefined

	const openFile = readable($appStore.workspace.getActiveFile(), (set) => {
		const onOpen = (f: TFile | null) => {
			set(f)
		}
		$appStore.workspace.on("file-open", onOpen)
		return () => $appStore.workspace.off("file-open", onOpen)
	})

	let derivedData: Observable<NoteDerivedData | undefined>
	$: derivedData = liveQuery(async () => {
		if (!$openFile) return

		return await db.getNoteDerivedData($openFile.path)
	})

	let networkLoading = writable(false)
	const fetchSummary = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < minChars) return

		try {
			networkLoading.set(true)
			const summary = await noteSummary(text, $settingsStore?.openAIApiKey)
			await db.updateNoteSummary(f.path, summary)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading.set(false)
		}
	}
	const fetchTopics = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < minChars) return

		try {
			networkLoading.set(true)
			const topics = await extractKeyTopics(text, $settingsStore?.openAIApiKey)
			await db.updateNoteKeyTopics(f.path, topics)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading.set(false)
		}
	}

	openFile.subscribe(async (f) => {
		if (!f || $settingsStore.openAIApiKey === "") return

		if (!element || !element.isShown()) return

		const localData = await db.getNoteDerivedData(f.path)
		if (!localData) {
			fetchSummary(f)
			fetchTopics(f)
		}
	})

	const onRecompute = async () => {
		if (!$openFile) return
		await db.deleteNoteDerivedData($openFile.path)
		fetchTopics($openFile)
		fetchSummary($openFile)
	}
</script>

<h5 bind:this={element}>{$openFile?.basename ?? ""}</h5>
<button on:click={onRecompute}>Recompute</button>

{#if $networkLoading}
	<div>Loading...</div>
{/if}

{#if $derivedData?.summary}
	<h6>Summary</h6>
	<p>{$derivedData.summary}</p>
{/if}

{#if $derivedData?.keyTopics && $derivedData.keyTopics.length > 0}
	<h6>Key topics</h6>
	<ul>
		{#each $derivedData.keyTopics as topic}
			<li>{topic}</li>
		{/each}
	</ul>
{/if}
