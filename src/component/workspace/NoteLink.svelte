<script lang="ts">
	import { createEventDispatcher } from "svelte"
	import type { EmbeddedFileInfo } from "../types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	export let fileInfo: EmbeddedFileInfo

	const dispatch = createEventDispatcher<{
		"link-click": string
		"link-rebuild": EmbeddedFileInfo
	}>()

	let isCollapsed = true

	let lastProcessedLabel = ""
	setInterval(
		() => {
			if (isCollapsed) return
			lastProcessedLabel = fileInfo.lastProcessed ? window.moment(fileInfo.lastProcessed).fromNow() : ""
		},
		60_000 // 1 minute
	)

	let label = ""
	$: {
		lastProcessedLabel = fileInfo.lastProcessed ? window.moment(fileInfo.lastProcessed).fromNow() : ""
		switch (fileInfo.nodeCount) {
			case 0:
				label = "Not indexed yet"
				break
			case 1:
				label = `Indexed as 1 node ${lastProcessedLabel}`
				break
			default:
				label = `Indexed as ${fileInfo.nodeCount} nodes ${lastProcessedLabel}`
		}
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
				<ObsidianIcon iconId="file-x" size="m" color="error" />
			{:else}
				<ObsidianIcon iconId="file-check-2" size="m" color="success" />
			{/if}
		</span>
		<!-- svelte-ignore a11y-invalid-attribute -->
		<a href="#" class="link-name" on:click={() => dispatch("link-click", fileInfo.path)}
			>{fileInfo.name}
		</a>
		<button class="clickable-icon link-expand" on:click={() => (isCollapsed = !isCollapsed)}>
			{#if isCollapsed}
				<ObsidianIcon iconId="chevron-down" size="m" />
			{:else}
				<ObsidianIcon iconId="chevron-up" size="m" />
			{/if}
		</button>
	</div>
	<div class={(isCollapsed ? "collapsed" : "") + " link-details"}>
		{#if fileInfo.parent && !fileInfo.parent.isRoot()}
			<div class="link-parent">
				<ObsidianIcon iconId="folder" size="m" className="relative top-1" />
				<span class="text-sm">{fileInfo.parent.name}</span>
			</div>
			{/if}
		<div>
			<ObsidianIcon iconId="calendar-clock" size="m" className="relative top-1" />
			<span class="text-sm">{label}</span>
		</div>
		<button class="mt-2" on:click={() => dispatch("link-rebuild", fileInfo)}
			>Re-index file</button
		>
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
		margin-bottom: 2px;
	}
	.icon-status {
		margin-right: 4px;
		margin-top: 1px;
		align-self: baseline;
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
		gap: 4px;
		margin-bottom: 16px;
		margin-left: 24px;
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
