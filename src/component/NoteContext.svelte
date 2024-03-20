<script lang="ts">
	import { liveQuery, type Observable } from "dexie"
	import { TFile } from "obsidian"
	import type { LlmDexie, NoteDerivedData } from "src/storage/db"
	import { derived, readable, writable } from "svelte/store"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { extractKeyTopics, noteSummary } from "src/utils/openai"
	import type { KeyTopic } from "./types"
	import ObsidianIcon from "./obsidian/ObsidianIcon.svelte"
	import TailwindCss from "./TailwindCSS.svelte"

	export let db: LlmDexie

	let element: HTMLElement | undefined

	const openFile = readable($appStore.workspace.getActiveFile(), (set) => {
		const onOpen = (f: TFile | null) => {
			set(f)
		}
		$appStore.workspace.on("file-open", onOpen)
		return () => $appStore.workspace.off("file-open", onOpen)
	})

	let noteContextEnabled = derived(
		[openFile, settingsStore],
		([$openFile, $settingsStore], set) => {
			if (!$openFile) {
				set(false)
				return
			}
			$appStore.vault.cachedRead($openFile).then((fileContent) => {
				set(fileContent.length >= $settingsStore.noteContextMinChars)
			})
		},
		false,
	)

	let derivedData: Observable<NoteDerivedData | undefined>
	$: derivedData = liveQuery(async () => {
		if (!$openFile) return

		return await db.getNoteDerivedData($openFile.path)
	})

	let keyTopics: KeyTopic[]
	$: keyTopics =
		$derivedData?.keyTopics?.map((t) => {
			return {
				name: t,
				file: $appStore.metadataCache.getFirstLinkpathDest(t, ""),
			}
		}) ?? []

	let networkLoading = writable(false)
	const fetchSummary = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < $settingsStore.noteContextMinChars) return

		try {
			networkLoading.set(true)
			const summary = await noteSummary(text, $settingsStore?.anthropicApikey)
			await db.updateNoteSummary(f.path, summary)
		} catch (e) {
			console.error(e)
		} finally {
			networkLoading.set(false)
		}
	}
	const fetchTopics = async (f: TFile) => {
		const text = await $appStore.vault.cachedRead(f)
		if (text.length < $settingsStore.noteContextMinChars) return

		try {
			networkLoading.set(true)
			const topics = await extractKeyTopics(text, $settingsStore?.anthropicApikey)
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
	const onKeyTopicClick = (path: string) => {
		$appStore.workspace.openLinkText(path, "", "tab")
	}
</script>

<TailwindCss />
<h6 bind:this={element}>{$openFile?.basename ?? ""}</h6>
<button on:click={onRecompute} class="icon-button" aria-label="Recompute" data-tooltip-delay="300">
	<ObsidianIcon iconId="refresh-cw" size="s" />
</button>

{#if $networkLoading}
	<div>Loading...</div>
{/if}

{#if $noteContextEnabled}
	{#if $derivedData?.summary}
		<h6>Summary</h6>
		<p>{$derivedData.summary}</p>
	{/if}

	{#if keyTopics && keyTopics.length > 0}
		<h6>Key topics</h6>
		<ul>
			{#each keyTopics as topic}
				<li>
					{#if topic.file}
						<!-- svelte-ignore a11y-invalid-attribute -->
						<a href="#" on:click={() => onKeyTopicClick(topic.file?.path ?? "")}
							>{topic.name}</a
						>
					{:else}
						<div class="flex flex-row items-center group">
							<span class="mr-1">{topic.name}</span>
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
{:else if $openFile}
	<p>Note is too short to generate context data for.</p>
	<p>You can adjust the threshold in the plugin settings.</p>
{:else}
	<p class="w-full text-center">No file is open</p>
{/if}
