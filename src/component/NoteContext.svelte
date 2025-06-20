<script lang="ts">
	import { liveQuery } from "dexie"
	import { TFile } from "obsidian"
	import { noteContextLlmClient } from "src/llm-features/llm-client"
	import { extractKeyTopics, noteSummary } from "src/llm-features/note-context"
	import type { LlmDexie } from "src/storage/db"
	import {
		deleteNoteDerivedData,
		getNoteDerivedData,
		updateNoteKeyTopics,
		updateNoteSummary,
	} from "src/storage/note-context"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import TailwindCss from "./TailwindCSS.svelte"
	import Loading from "./obsidian/Loading.svelte"
	import ObsidianIcon from "./obsidian/ObsidianIcon.svelte"

	let {
		db,
		onOpenNoteChat,
		onOpenWorkspace,
	}: {
		db: LlmDexie
		onOpenNoteChat: (path: string) => void
		onOpenWorkspace: (path: string) => void
	} = $props()

	let element: HTMLElement | undefined

	let openFile = $state($appStore.workspace.getActiveFile())
	$effect(() => {
		const onOpen = (f: TFile | null) => {
			openFile = f
		}
		$appStore.workspace.on("file-open", onOpen)
		// @ts-expect-error: "file-open" event's signature doesn't match `unknown[]` because of the `TFile | null` type
		return () => $appStore.workspace.off("file-open", onOpen)
	})

	let noteContextEnabled: Promise<boolean> = $derived.by(async () => {
		if (!openFile) return false
		const contents = await $appStore.vault.cachedRead(openFile)
		return contents.length >= $settingsStore.noteContextMinChars
	})

	let derivedData = $derived.by(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- https://github.com/sveltejs/svelte/issues/11424
		openFile
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
			const summary = await noteSummary(text, $noteContextLlmClient)
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
			const topics = await extractKeyTopics(text, $noteContextLlmClient)
			await updateNoteKeyTopics(db, f.path, topics)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading = false
		}
	}

	$effect(() => {
		if (!openFile) {
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
	const onCreateTopicNote = async (topic: string) => {
		const path = `${topic}.md`
		await $appStore.vault.create(path, "")
		onKeyTopicClick(path)
	}
</script>

<TailwindCss />
<div class="mb-2 flex flex-row justify-center" bind:this={element}>
	<button
		onclick={onRecompute}
		disabled={openFile == null}
		class="clickable-icon"
		aria-label="Recompute"
		data-tooltip-delay="300"
	>
		<ObsidianIcon iconId="refresh-cw" size="m" />
	</button>
	<button
		onclick={() => openFile?.path && onOpenNoteChat(openFile?.path)}
		disabled={openFile == null}
		class="clickable-icon"
		aria-label="Chat with note"
		data-tooltip-delay="300"
	>
		<ObsidianIcon iconId="message-square" size="m" />
	</button>
	<button
		onclick={() => openFile?.path && onOpenWorkspace(openFile?.path)}
		disabled={openFile == null}
		class="clickable-icon"
		aria-label="Open note as LLM workspace"
		data-tooltip-delay="300"
	>
		<ObsidianIcon iconId="library-big" size="m" />
	</button>
</div>

{#if networkLoading}
	<div class="text-muted text-sm">
		Loading <span class="relative top-1"><Loading size="s" /></span>
	</div>
{/if}

{#await noteContextEnabled then enabled}
	{#if enabled}
		{#if $derivedData?.summary}
			<div class="text-sm font-medium">Summary</div>
			<p class="mt-1 text-sm select-text">{$derivedData.summary}</p>
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
								<button
									class="clickable-icon invisible group-hover:visible"
									onclick={() => onCreateTopicNote(topic.name)}
									aria-label="Create note"
								>
									<ObsidianIcon iconId="file-plus" size="xs" />
								</button>
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
		<p class="text-muted w-full text-center text-sm">No file is open</p>
	{/if}
{/await}
