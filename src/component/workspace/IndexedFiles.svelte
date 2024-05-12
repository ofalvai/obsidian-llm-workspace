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
		{#each links as link (link.path)}
			<NoteLink fileInfo={link} on:link-click on:link-rebuild />
		{/each}
	</div>
	{#if links.length === 0}
		<p>No linked notes yet</p>
	{/if}
</div>
