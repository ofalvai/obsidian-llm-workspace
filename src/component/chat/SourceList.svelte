<script module lang="ts">
	interface SourceFile {
		base: string
		path: string
		similarity: number
	}
</script>

<script lang="ts">
	import type { QueryResponse } from "src/rag/synthesizer"
	import path from "node:path"

	let {
		queryResponse,
		onClick,
	}: {
		queryResponse: QueryResponse
		onClick: (path: string) => void
	} = $props()

	let sources: SourceFile[] = $derived.by(() => {
		const files: SourceFile[] = []
		for (const source of queryResponse.sources) {
			const existing = files.find((f) => f.path === source.node.parent)
			if (existing) {
				existing.similarity = Math.max(existing.similarity, source.similarity)
			} else {
				files.push({
					base: path.basename(source.node.parent, path.extname(source.node.parent)),
					path: source.node.parent,
					similarity: source.similarity,
				})
			}
		}
		files.sort((a, b) => b.similarity - a.similarity)
		return files
	})
</script>

<div class="bg-primary-alt mt-2 rounded p-3">
	<div class="font-medium">Sources:</div>
	<ol class="mt-2 mb-0">
		{#each sources as source}
			<li class="mb-1">
				<!-- svelte-ignore a11y_invalid_attribute -->
				<a href="#" onclick={() => onClick(source.path)}>{source.base}</a>
				<span
					aria-label="Relevance score"
					data-tooltip-delay="300"
					data-tooltip-position="top"
					class="bg-secondary ml-1 rounded-md px-1 py-0.5 font-mono text-xs"
				>
					{Math.round(source.similarity * 100)}%
				</span>
			</li>
		{/each}
	</ol>
</div>
