<script context="module" lang="ts">
	const MAX_FILES_TO_DISPLAY = 10
</script>

<script lang="ts">
	import NoteLink from "./NoteLink.svelte"
	import { createEventDispatcher } from "svelte"
	import type { EmbeddedFileInfo } from "../types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	let {
		links,
		onLinkClick,
		onLinkRebuild,
		onRebuildAll,
	}: {
		links: EmbeddedFileInfo[]
		onLinkClick: (path: string) => void
		onLinkRebuild: (fileInfo: EmbeddedFileInfo) => void
		onRebuildAll: () => void
	} = $props()

	let collapsed = $state(true)
	let displayedLinks = $derived(collapsed ? links.slice(0, MAX_FILES_TO_DISPLAY) : links)
</script>

<div>
	<div class="flex items-center justify-between">
		<div class="text-base font-medium">Indexed notes</div>
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
				on:link-click={(e) => onLinkClick(e.detail)}
				on:link-rebuild={(e) => onLinkRebuild(e.detail)}
			/>
		{/each}
		{#if links.length > MAX_FILES_TO_DISPLAY}
			<button class="clickable-text" onclick={() => (collapsed = !collapsed)}>
				{collapsed ? "Show more" : "Show less"}
			</button>
		{/if}
	</div>
</div>
