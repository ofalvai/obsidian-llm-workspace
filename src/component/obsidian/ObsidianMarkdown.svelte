<script lang="ts">
	import { MarkdownRenderer } from "obsidian"
	import { appStore, viewStore } from "src/utils/obsidian"

	export let source: string
	export let className: string = ""

	let markdownEl: HTMLElement | undefined

	$: {
		if (markdownEl) {
			markdownEl.replaceChildren()
			MarkdownRenderer.render($appStore, source, markdownEl, "", $viewStore)
		}
	}
</script>

<div bind:this={markdownEl} class={className} />
