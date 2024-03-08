<script lang="ts">
	import NoteLink from "./NoteLink.svelte"
	import { createEventDispatcher } from "svelte"
	import type { EmbeddedFileInfo } from "./types"
	import { RefreshCw } from "lucide-svelte"

	export let links: EmbeddedFileInfo[]

	const dispatch = createEventDispatcher<{
		"link-click": string
		"link-rebuild": EmbeddedFileInfo
		"rebuild-all": void
	}>()
</script>

<div>
	<div class="linked-notes-header">
		<h6>Linked notes</h6>
		<button
			class="clickable-icon"
			on:click={() => dispatch("rebuild-all")}
			aria-label="Re-index all"
			data-tooltip-delay="300"
		>
			<RefreshCw size="18" stroke-width="var(--icon-stroke)" />
		</button>
	</div>
	<div class="my-4">
		{#each links as link (link.path)}
			<NoteLink fileInfo={link} on:link-click on:link-rebuild />
		{/each}
	</div>
	{#if links.length === 0}
		<p>No linked notes yet</p>
	{/if}
</div>

<style>
	.linked-notes-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
