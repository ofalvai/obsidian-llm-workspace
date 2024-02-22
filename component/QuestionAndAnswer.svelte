<script lang="ts">
	import type { DebugInfo, QueryResponse } from "rag/synthesizer"
	import { createEventDispatcher, type ComponentEvents } from "svelte"
	import SourceList from "./SourceList.svelte"
	import SvelteMarkdown from "svelte-markdown"

	export let isLoading = false
	export let queryResponse: QueryResponse | null

	const dispatch = createEventDispatcher<{
		"query-submit": string
		"source-click": string
	}>()

	let query = ""

	const onSubmit = (event: SubmitEvent) => {
		event.preventDefault()
		dispatch("query-submit", query)
	}
</script>

<form on:submit={onSubmit}>
	<textarea
		disabled={isLoading}
		placeholder="Ask a question"
		bind:value={query}
	/>
	<button disabled={isLoading} type="submit">
		Ask
		{#if isLoading}...{/if}
	</button>
</form>
{#if queryResponse}
	<div>
		<div class="completion">
			<SvelteMarkdown source={queryResponse.text} />
		</div>
		<SourceList queryResponse={queryResponse} on:source-click />
	</div>
{/if}



<style>
	textarea {
		width: 100%;
	}
</style>
