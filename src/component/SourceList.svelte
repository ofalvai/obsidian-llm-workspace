<script context="module" lang="ts">
	interface SourceFile {
		base: string
		path: string
		similarity: number
	}
</script>

<script lang="ts">
	import type { QueryResponse } from "src/rag/synthesizer"

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
		<li class="mb-1">
			<!-- svelte-ignore a11y-invalid-attribute -->
			<a href="#" on:click={() => dispatch("source-click", source.path)}>{source.base}</a>
			<span
				aria-label="Relevance score"
				data-tooltip-delay="300"
				class="text-xs font-mono bg-secondary px-1 py-0.5 ml-1 rounded-md"
			>
				{Math.round(source.similarity * 100)}%
			</span>
		</li>
	{/each}
</ol>
