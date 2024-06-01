<script lang="ts">
	import type { EmbeddedFileInfo } from "../types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import { onMount } from "svelte"

	let {
		fileInfo,
		onLinkClick,
		onLinkRebuild,
	}: {
		fileInfo: EmbeddedFileInfo
		onLinkClick: (path: string) => void
		onLinkRebuild: (fileInfo: EmbeddedFileInfo) => void
	} = $props()

	let isCollapsed = $state(true)

	let now = $state(window.moment())
	onMount(() => {
		const interval = setInterval(() => {
			if (isCollapsed) return
			now = window.moment()
		}, 60_000) // 1 minute

		return () => clearInterval(interval)
	})

	let label = $derived.by(() => {
		let lastProcessedLabel = window.moment(fileInfo.lastProcessed).from(now)
		switch (fileInfo.nodeCount) {
			case 0:
				return "Not indexed yet"
			case 1:
				return `Indexed as 1 node ${lastProcessedLabel}`
			default:
				return `Indexed as ${fileInfo.nodeCount} nodes ${lastProcessedLabel}`
		}
	})
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
		<!-- svelte-ignore a11y_invalid_attribute -->
		<a href="#" class="link-name" onclick={() => onLinkClick(fileInfo.path)}
			>{fileInfo.name}
		</a>
		<button class="clickable-icon link-expand" onclick={() => (isCollapsed = !isCollapsed)}>
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
		<button class="mt-2" onclick={() => onLinkRebuild(fileInfo)}>Re-index file</button>
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
