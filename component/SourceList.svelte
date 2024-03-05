<script context="module" lang="ts">
	interface SourceFile {
		base: string
		path: string
		similarity: number
	}
</script>

<script lang="ts">
	import type { QueryResponse } from "rag/synthesizer"

	import { createEventDispatcher } from "svelte"

	import path from "path"

	export let queryResponse: QueryResponse

	let sources: SourceFile[] = []
	$: {
		for (const source of queryResponse.sources) {
			const existing = sources.find((f) => f.path === source.node.parent)
			if (existing) {
				existing.similarity = Math.max(existing.similarity, source.similarity)
			} else {
				sources.push({
					base: path.basename(source.node.parent, path.extname(source.node.parent)),
					path: source.node.parent,
					similarity: source.similarity,
				})
			}
		}
		sources.sort((a, b) => b.similarity - a.similarity)
	}

	const dispatch = createEventDispatcher<{ "source-click": string }>()
</script>

<ol>
	{#each sources as source}
		<li>
			<!-- svelte-ignore a11y-invalid-attribute -->
			<a href="#" on:click={() => dispatch("source-click", source.path)}>{source.base}</a>
			<span aria-label="Relevance score" data-tooltip-delay="300"
				>{Math.round(source.similarity * 100)}%</span
			>
		</li>
	{/each}
</ol>
