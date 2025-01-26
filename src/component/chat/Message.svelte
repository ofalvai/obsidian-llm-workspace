<script lang="ts">
	import type { ChatMessage } from "src/rag/llm/common"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"
	import SelectionActions from "./SelectionActions.svelte"
	import path from "node:path"
	import { TextAction, type TextActionConfig } from "src/types/TextAction"

	let {
		message,
		actionConfig = {
			[TextAction.COPY]: {
				label: "Copy",
				icon: "copy",
				handler: (text: string) => onCopy(text)
			},
			[TextAction.EDIT]: {
				label: "Edit",
				icon: "edit",
				handler: (text: string) => onEdit(text)
			},
			[TextAction.EXPLAIN]: {
				label: "Explain",
				icon: "help",
				handler: (text: string) => onExplain(text)
			},
			[TextAction.IMPROVE]: {
				label: "Improve",
				icon: "up-and-down-arrows",
				handler: (text: string) => onImprove(text)
			}
		}
	}: {
		message: ChatMessage
		actionConfig?: TextActionConfig
	} = $props()

	let showSelectionActions = $state(false)
	let selectedText = $state("")
	let selectionPosition = $state({ x: 0, y: 0 })

	function handleSelection(event: MouseEvent) {
		const selection = window.getSelection()
		if (!selection || selection.isCollapsed) {
			showSelectionActions = false
			return
		}

		selectedText = selection.toString().trim()
		if (selectedText) {
			const range = selection.getRangeAt(0)
			const rect = range.getBoundingClientRect()
			selectionPosition = {
				x: rect.left,
				y: rect.bottom + window.scrollY + 5
			}
			showSelectionActions = true
		}
	}

	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest(".selection-actions")) {
			showSelectionActions = false
		}
	}
</script>

<svelte:window on:click={handleClick} />

<div class="flex flex-row items-baseline">
	{#if message.role === "user"}
		<ObsidianIcon iconId="user" size="s" className="mr-2 flex-none relative top-0.5" />
	{:else if message.role === "assistant"}
		<ObsidianIcon iconId="sparkles" size="s" className="mr-2 flex-none relative top-0.5" />
	{/if}
	<ObsidianMarkdown
		source={message.content}
		className={(message.role === "user" ? "text-accent font-medium" : "") + " grow select-text"}
		onmouseup={handleSelection}
	/>
</div>
<div class="flex w-full flex-row pl-5">
	<div class="flex flex-grow flex-row flex-wrap gap-1">
		{#each message.attachedContent as file (file.parent)}
			<div
				class="flex flex-row items-center rounded border border-solid border-border bg-primary px-1 py-0.5 text-sm"
			>
				{path.basename(file.parent, path.extname(file.parent))}
			</div>
		{/each}
	</div>

	{#if message.role === "assistant"}
		<button
			class="clickable-icon"
			onclick={() => onCopy(message.content)}
			aria-label="Copy response"
			data-tooltip-delay="300"
		>
			<ObsidianIcon iconId="copy" size="s" />
		</button>
	{:else if message.role === "user"}{/if}
</div>

{#if showSelectionActions && message.role === "assistant"}
	<div class="selection-actions">
		<SelectionActions
			{selectedText}
			{onExplain}
			{onImprove}
			position={selectionPosition}
		/>
	</div>
{/if}
