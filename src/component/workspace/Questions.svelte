<script lang="ts">
	import type { WorkspaceQuestion } from "src/llm-features/workspace-questions"
	import { createEventDispatcher } from "svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import Loading from "../obsidian/Loading.svelte"

	export let questions: WorkspaceQuestion[]
	export let isLoading: boolean

	const dispatch = createEventDispatcher<{
		"question-select": WorkspaceQuestion
		regenerate: void
	}>()
</script>

<div class="mb-4">
	<div class="align-center mb-1 mt-4 flex flex-row justify-between">
		<div class="font-medium">Explore</div>
		<button
			class="clickable-icon"
			aria-label="Regenerate"
			data-delay="300"
			on:click={() => dispatch("regenerate")}
		>
			<ObsidianIcon iconId="refresh-cw" size="s" />
		</button>
	</div>
	{#if isLoading}
		<div class="relative my-4">
			<span class="italic">Thinking</span>
			<span class="absolute top-1 ml-1"><Loading /></span>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			{#each questions as question}
				<div
					class="min-w-48 max-w-96 basis-1/2 cursor-pointer rounded bg-secondary p-3 hover:bg-hover"
					on:click={() => dispatch("question-select", question)}
					on:keyup={(e) => e.key === "Enter" && dispatch("question-select", question)}
					role="button"
					tabindex="0"
				>
					<div class="flex flex-row">
						<ObsidianIcon iconId="help" size="s" />
						<div class="ml-1 text-sm capitalize text-muted">{question.theme}</div>
					</div>
					<div class="mt-1 text-sm">{question.content}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
