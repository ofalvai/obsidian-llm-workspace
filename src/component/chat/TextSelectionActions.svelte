<script lang="ts">
	import { onMount } from "svelte"
	import type { TextSelectionAction } from "src/llm-features/selection-actions"

	let {
		selectedText,
		position,
		onAction,
		onClose,
	}: {
		selectedText: string
		position: { x: number; y: number }
		onAction: (action: TextSelectionAction, selectedText: string) => void
		onClose: () => void
	} = $props()

	let popupElement: HTMLDivElement

	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (popupElement && !popupElement.contains(event.target as Node)) {
				onClose()
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	})
</script>

<div
	bind:this={popupElement}
	class="border-border bg-primary transition-left transition-top absolute z-50 flex flex-col gap-1 rounded border border-solid p-1 shadow-lg transition duration-75 ease-in-out"
	style="left: {position.x}px; top: {position.y}px;"
>
	<button class="clickable-icon justify-start" onclick={() => onAction("explain", selectedText)}>
		Explain
	</button>
	<button class="clickable-icon justify-start" onclick={() => onAction("improve", selectedText)}>
		Improve
	</button>
	<button class="clickable-icon justify-start" onclick={() => onAction("debate", selectedText)}>
		Debate
	</button>
	<button
		class="clickable-icon justify-start"
		onclick={() => onAction("alternatives", selectedText)}
	>
		Alternatives
	</button>
</div>
