<script lang="ts">
	import { MarkdownRenderer } from "obsidian"
	import { appStore, viewStore } from "src/utils/obsidian"

	let {
		source,
		className = "",
	}: {
		source: string
		className?: string
	} = $props()

	let markdownEl: HTMLElement | undefined

	$effect(() => {
		if (markdownEl) {
			markdownEl.replaceChildren()
			MarkdownRenderer.render($appStore, source, markdownEl, "", $viewStore)
		}
	})
</script>

<div bind:this={markdownEl} class={className}></div>
