<script module lang="ts">
	const MAX_FILES_TO_DISPLAY = 10
</script>

<script lang="ts">
	import NoteLink from "./NoteLink.svelte"
	import type { EmbeddedFileInfo } from "../types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ProgressBar from "../obsidian/ProgressBar.svelte"

	let {
		links,
		indexingProgress,
		onLinkClick,
		onLinkRebuild,
		onRebuildAll,
	}: {
		links: EmbeddedFileInfo[]
		indexingProgress: number
		onLinkClick: (path: string) => void
		onLinkRebuild: (fileInfo: EmbeddedFileInfo) => void
		onRebuildAll: () => void
	} = $props()

	let collapsed = $state(true)
	let displayedLinks = $derived(collapsed ? links.slice(0, MAX_FILES_TO_DISPLAY) : links)
</script>

<div>
	<div class="flex items-center justify-between">
		<div class="flex flex-row items-center w-full mr-1">
			<div class="text-base font-medium grow">Workspace sources</div>
			{#if indexingProgress < 100}
				<ProgressBar value={indexingProgress} className="w-1/4"/>
			{/if}
		</div>
		<button
			class="clickable-icon"
			onclick={() => onRebuildAll()}
			aria-label="Re-index all"
			data-tooltip-delay="300"
		>
			<ObsidianIcon iconId="refresh-cw" size="s" />
		</button>
	</div>
	<div class="mt-2">
		{#each displayedLinks as link (link.path)}
			<NoteLink
				fileInfo={link}
				onLinkClick={(path) => onLinkClick(path)}
				onLinkRebuild={(fileInfo) => onLinkRebuild(fileInfo)}
			/>
		{/each}
		{#if links.length > MAX_FILES_TO_DISPLAY}
			<button class="clickable-text" onclick={() => (collapsed = !collapsed)}>
				{collapsed ? "Show more" : "Show fewer"}
			</button>
		{/if}
	</div>
</div>
