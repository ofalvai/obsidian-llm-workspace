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
		// TODO: now might be outdated when fileInfo is updated
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

<div class="flex flex-col">
	<div class="flex flex-row">
		<span
			class="mt-[1px] mr-1 self-baseline"
			aria-label={label}
			data-tooltip-position="top"
			data-tooltip-delay="300"
		>
			{#if fileInfo.nodeCount === 0}
				<ObsidianIcon iconId="file-x" size="s" color="error" />
			{:else}
				<ObsidianIcon iconId="file-check-2" size="s" color="success" />
			{/if}
		</span>
		<div class="grow">
			<!-- svelte-ignore a11y_invalid_attribute -->
			<a href="#" class="text-sm" onclick={() => onLinkClick(fileInfo.path)}
				>{fileInfo.name}
			</a>
		</div>
		<button
			class="clickable-icon ml-1 self-center"
			onclick={() => (isCollapsed = !isCollapsed)}
		>
			{#if isCollapsed}
				<ObsidianIcon iconId="chevron-down" size="s" />
			{:else}
				<ObsidianIcon iconId="chevron-up" size="s" />
			{/if}
		</button>
	</div>
	<div
		class={(isCollapsed ? "hidden" : "") +
			" text-muted mb-4 ml-5 flex flex-col items-start gap-1"}
	>
		{#if fileInfo.parent && !fileInfo.parent.isRoot()}
			<div class="link-parent">
				<ObsidianIcon iconId="folder" size="s" className="relative top-[3px] mr-0.5" />
				<span class="text-sm">{fileInfo.parent.name}</span>
			</div>
		{/if}
		<div>
			<ObsidianIcon iconId="calendar-clock" size="s" className="relative top-[3px] mr-0.5" />
			<span class="text-sm">{label}</span>
		</div>
		<button class="mt-2" onclick={() => onLinkRebuild(fileInfo)}>Re-index file</button>
	</div>
</div>
