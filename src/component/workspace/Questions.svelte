<script lang="ts">
	import type { WorkspaceQuestion } from "src/llm-features/workspace-questions"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import Loading from "../obsidian/Loading.svelte"

	let {
		questions,
		isLoading,
		onQuestionSelect,
		onRegenerate,
	}: {
		questions: WorkspaceQuestion[]
		isLoading: boolean
		onQuestionSelect: (question: WorkspaceQuestion) => void
		onRegenerate: () => void
	} = $props()
</script>

<div class="mb-4">
	<div class="align-center mb-3 mt-4 flex flex-row justify-between">
		<div class="font-medium">Explore</div>
		<button
			class="clickable-icon"
			aria-label="Regenerate"
			data-delay="300"
			onclick={() => onRegenerate()}
		>
			<ObsidianIcon iconId="refresh-cw" size="s" />
		</button>
	</div>
	{#if isLoading}
		<div class="relative my-4">
			<span class="italic">Thinking</span>
			<span class="absolute top-1 ml-1"><Loading size="m" /></span>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			{#each questions as question}
				<div
					class="min-w-48 max-w-96 basis-1/2 cursor-pointer rounded bg-secondary p-3 hover:bg-hover"
					onclick={() => onQuestionSelect(question)}
					onkeyup={(e) => e.key === "Enter" && onQuestionSelect(question)}
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
