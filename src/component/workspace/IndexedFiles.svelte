<script context="module" lang="ts">
	const MAX_FILES_TO_DISPLAY = 10
</script>

<script lang="ts">
	import NoteLink from "./NoteLink.svelte"
	import { createEventDispatcher } from "svelte"
	import type { EmbeddedFileInfo } from "../types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	export let links: EmbeddedFileInfo[]

	const dispatch = createEventDispatcher<{
		"link-click": string
		"link-rebuild": EmbeddedFileInfo
		"rebuild-all": void
	}>()

	let collapsed = true
	$: displayedLinks = collapsed ? links.slice(0, MAX_FILES_TO_DISPLAY) : links
</script>

<div>
	<div class="flex items-center justify-between">
		<div class="text-base font-medium">Indexed notes</div>
		<button
			class="clickable-icon"
			on:click={() => dispatch("rebuild-all")}
			aria-label="Re-index all"
			data-tooltip-delay="300"
		>
			<ObsidianIcon iconId="refresh-cw" size="s" />
		</button>
	</div>
	<div class="mt-2">
		{#each displayedLinks as link (link.path)}
			<NoteLink fileInfo={link} on:link-click on:link-rebuild />
		{/each}
		{#if links.length > MAX_FILES_TO_DISPLAY}
			<button class="clickable-text" on:click={() => (collapsed = !collapsed)}>
				{collapsed ? "Show more" : "Show less"}
			</button>
		{/if}
	</div>
</div>
