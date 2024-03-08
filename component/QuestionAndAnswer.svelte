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

<div class="grow relative">
	{#if queryResponse}
		<div class="grow">
			<div class="leading-relaxed">
				<div bind:this={markdownEl} />
			</div>
			<SourceList {queryResponse} on:source-click />
			{#if queryResponse.debugInfo}
				<button on:click={onDebugClick}>Debug response</button>
			{/if}
		</div>
	{/if}
	<form class="sticky bottom-0 left-0 right-0" on:submit={onSubmit}>
		<textarea
			class="w-full"
			rows="2"
			on:keydown={(event) => {
				if (event.key === "Enter") {
					onSubmit(new SubmitEvent("submit"))
				}
			}}
			disabled={isLoading}
			placeholder="Ask a question"
			bind:value={query}
		/>
		<button disabled={isLoading} type="submit">
			Ask
			{#if isLoading}...{/if}
		</button>
	</form>
</div>
