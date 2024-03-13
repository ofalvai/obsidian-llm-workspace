<script lang="ts">
	import { MarkdownRenderer } from "obsidian"
	import { appStore, viewStore } from "utils/obsidian"

	export let source: string

	let markdownEl: HTMLElement | undefined

	$: {
		if (markdownEl) {
			markdownEl.replaceChildren()
			MarkdownRenderer.render($appStore, source, markdownEl, "", $viewStore)
		}
	}
</script>

<div bind:this={markdownEl} />
