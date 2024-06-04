<script lang="ts">
	import { liveQuery } from "dexie"
	import { TFile } from "obsidian"
	import { llmClient } from "src/llm-features/client"
	import { extractKeyTopics, noteSummary } from "src/llm-features/note-context"
	import type { LlmDexie } from "src/storage/db"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import TailwindCss from "./TailwindCSS.svelte"
	import ObsidianIcon from "./obsidian/ObsidianIcon.svelte"
	import {
		deleteNoteDerivedData,
		getNoteDerivedData,
		updateNoteKeyTopics,
		updateNoteSummary,
	} from "src/storage/note-context"
	import Loading from "./obsidian/Loading.svelte"

	let { db }: { db: LlmDexie } = $props()

	let element: HTMLElement | undefined

	let openFile = $state($appStore.workspace.getActiveFile())
	$effect(() => {
		const onOpen = (f: TFile | null) => {
			openFile = f
		}
		$appStore.workspace.on("file-open", onOpen)
		return () => $appStore.workspace.off("file-open", onOpen)
	})

	let noteContextEnabled: Promise<boolean> = $derived.by(async () => {
		if (!openFile) return false
		const contents = await $appStore.vault.cachedRead(openFile)
		return contents.length >= $settingsStore.noteContextMinChars
	})

	let derivedData = $derived.by(() => {
		openFile // https://github.com/sveltejs/svelte/issues/11424
		return liveQuery(async () => {
			if (!openFile) return
			return await getNoteDerivedData(db, openFile.path)
		})
	})

	let keyTopics = $derived.by(() => {
		return (
			$derivedData?.keyTopics?.map((t) => {
				return {
					name: t,
					file: $appStore.metadataCache.getFirstLinkpathDest(t, ""),
				}
			}) ?? []
		)
	})

	let networkLoading = $state(false)
	const updateSummary = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < $settingsStore.noteContextMinChars) return

		try {
			networkLoading = true
			const summary = await noteSummary(text, $llmClient)
			await updateNoteSummary(db, f.path, summary)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading = false
		}
	}
	const updateTopics = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < $settingsStore.noteContextMinChars) return

		try {
			networkLoading = true
			const topics = await extractKeyTopics(text, $llmClient)
			await updateNoteKeyTopics(db, f.path, topics)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading = false
		}
	}

	$effect(() => {
		if (!openFile || $settingsStore.openAIApiKey === "") {
			return
		}

		if (!element || !element.isShown()) return

		getNoteDerivedData(db, openFile.path).then((localData) => {
			if (!localData && openFile) {
				updateSummary(openFile)
				updateTopics(openFile)
			}
		})
	})

	const onRecompute = async () => {
		if (!openFile) return
		await deleteNoteDerivedData(db, openFile.path)
		updateTopics(openFile)
		updateSummary(openFile)
	}
	const onKeyTopicClick = (path: string) => {
		$appStore.workspace.openLinkText(path, "", "tab")
	}
</script>

<TailwindCss />
<div class="mb-2 flex flex-row justify-center" bind:this={element}>
	<button
		onclick={onRecompute}
		class="clickable-icon"
		aria-label="Recompute"
		data-tooltip-delay="300"
	>
		<ObsidianIcon iconId="refresh-cw" size="s" />
	</button>
</div>

{#if networkLoading}
	<div class="text-sm text-muted">
		Loading <span class="relative top-1"><Loading size="s" /></span>
	</div>
{/if}

{#await noteContextEnabled then enabled}
	{#if enabled}
		{#if $derivedData?.summary}
			<div class="text-sm font-medium">Summary</div>
			<p class="mt-1 select-text text-sm">{$derivedData.summary}</p>
		{/if}

		{#if keyTopics && keyTopics.length > 0}
			<div class="text-sm font-medium">Key topics</div>
			<ul class="mt-1 text-sm">
				{#each keyTopics as topic}
					<li>
						{#if topic.file}
							<!-- svelte-ignore a11y_invalid_attribute -->
							<a href="#" onclick={() => onKeyTopicClick(topic.file?.path ?? "")}
								>{topic.name}</a
							>
						{:else}
							<div class="group flex flex-row items-center">
								<span class="mr-1 select-text">{topic.name}</span>
								<span
									class="clickable-icon invisible group-hover:visible"
									aria-label="Create note"
								>
									<ObsidianIcon iconId="file-plus" size="xs" />
								</span>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{:else if openFile}
		<p class="text-sm">
			Note is too short to generate context data for. You can adjust the threshold in the
			plugin settings.
		</p>
	{:else}
		<p class="w-full text-center">No file is open</p>
	{/if}
{/await}
