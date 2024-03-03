<script lang="ts">
	import { MarkdownRenderer } from "obsidian"
	import type { DebugInfo, QueryResponse } from "rag/synthesizer"
	import { createEventDispatcher } from "svelte"
	import { appStore, viewStore } from "utils/obsidian"
	import SourceList from "./SourceList.svelte"

	export let isLoading = false
	export let queryResponse: QueryResponse | null

	let markdownEl: HTMLElement | undefined

	const dispatch = createEventDispatcher<{
		"query-submit": string
		"source-click": string
		"debug-click": DebugInfo
	}>()

	let query = ""

	const onSubmit = (event: SubmitEvent) => {
		event.preventDefault()
		queryResponse = null
		markdownEl?.replaceChildren()
		dispatch("query-submit", query)
	}

	const onDebugClick = () => {
		if (queryResponse?.debugInfo) {
			dispatch("debug-click", queryResponse.debugInfo)
		}
	}

	$: {
		if (markdownEl && queryResponse) {
			MarkdownRenderer.render($appStore, queryResponse.text, markdownEl, "", $viewStore)
		}
	}
</script>

<form on:submit={onSubmit}>
	<textarea disabled={isLoading} placeholder="Ask a question" bind:value={query} />
	<button disabled={isLoading} type="submit">
		Ask
		{#if isLoading}...{/if}
	</button>
</form>
{#if queryResponse}
	<div>
		<div class="completion">
			<div bind:this={markdownEl} />
		</div>
		<SourceList {queryResponse} on:source-click />
	</div>
	{#if queryResponse.debugInfo}
		<button on:click={onDebugClick}>Debug response</button>
	{/if}
{/if}

<style>
	textarea {
		width: 100%;
	}
</style>
