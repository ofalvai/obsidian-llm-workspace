<script lang="ts">
	import NoteLink from "./NoteLink.svelte"
	import type { EmbeddedFileInfo } from "./NoteLinks"
	import { createEventDispatcher } from "svelte"

	export let links: EmbeddedFileInfo[]

	const dispatch = createEventDispatcher<{
		"link-click": string
		"link-rebuild": EmbeddedFileInfo
	}>()
</script>

<div>
	<h6>Linked notes</h6>
	<ul>
		{#each links as link (link.path)}
			<NoteLink fileInfo={link} on:link-click on:link-rebuild />
		{/each}
	</ul>
	{#if links.length === 0}
		<p>No linked notes yet</p>
	{/if}
</div>
