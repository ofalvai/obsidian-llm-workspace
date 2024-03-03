<script lang="ts">
	import { createEventDispatcher } from "svelte"
	import { FileX2, FileCheck2, ChevronDown, ChevronUp, Folder } from "lucide-svelte"
	import type { EmbeddedFileInfo } from "./NoteLinks.svelte"

	export let fileInfo: EmbeddedFileInfo

	const dispatch = createEventDispatcher<{
		"link-click": string
		"link-rebuild": EmbeddedFileInfo
	}>()

	let isCollapsed = true

	let label = ""
	switch (fileInfo.nodeCount) {
		case 0:
			label = "Not indexed yet"
			break
		case 1:
			label = "Indexed as 1 node "
			// TODO: it should periodically re-render to update the timestamp
			label += window.moment(fileInfo.lastProcessed).fromNow()
			break
		default:
			label = `Indexed as ${fileInfo.nodeCount} nodes `
			label += window.moment(fileInfo.lastProcessed).fromNow()
	}
</script>

<div class="container">
	<div class="header">
		<span
			class="icon-status"
			aria-label={label}
			data-tooltip-position="top"
			data-tooltip-delay="300"
		>
			{#if fileInfo.nodeCount === 0}
				<FileX2 size="18" color="var(--background-modifier-error)" />
			{:else}
				<FileCheck2 size="18" color="var(--background-modifier-success)" />
			{/if}
		</span>
		<!-- svelte-ignore a11y-invalid-attribute -->
		<a href="#" class="link-name" on:click={() => dispatch("link-click", fileInfo.path)}
			>{fileInfo.name}
		</a>
		<button class="clickable-icon link-expand" on:click={() => (isCollapsed = !isCollapsed)}>
			{#if isCollapsed}
				<ChevronDown size="18" />
			{:else}
				<ChevronUp size="18" />
			{/if}
		</button>
	</div>
	<div class={(isCollapsed ? "collapsed" : "") + " link-details"}>
		{#if fileInfo.parent && !fileInfo.parent.isRoot()}
			<div class="link-parent">
				<Folder size="18" class="icon-folder" />
				{fileInfo.parent.name}
			</div>
		{/if}
		<button on:click={() => dispatch("link-rebuild", fileInfo)}>Re-index file</button>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
	}
	.header {
		display: flex;
		flex-direction: row;
	}
	.icon-status {
		margin-right: 4px;
		margin-top: 1px;
		align-self: center;
	}
	.link-name {
		flex-grow: 1;
	}
	.link-expand {
		align-self: center;
		margin-left: 4px;
	}
	.link-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
		align-items: flex-start;
		color: var(--text-muted);
	}
	.link-details.collapsed {
		display: none;
	}
	.icon-folder {
		margin-bottom: 3px;
		stroke: var(--text-muted);
		vertical-align: middle;
		margin-right: 4px;
	}
</style>
