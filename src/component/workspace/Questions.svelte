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
	<div class="align-center mt-4 mb-3 flex flex-row justify-between">
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
			<span class="text-muted text-sm italic">Thinking</span>
			<span class="absolute top-1 ml-1"><Loading size="m" /></span>
		</div>
	{:else if questions.length === 0}
		<div class="text-muted mb-6 w-full text-sm">
			<p>Workspace is not analyzed yet.</p>
			<p>Click the regenerate button to get started.</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			{#each questions as question}
				<div
					class="bg-secondary hover:bg-hover max-w-96 min-w-48 basis-1/2 cursor-pointer rounded p-3"
					onclick={() => onQuestionSelect(question)}
					onkeyup={(e) => e.key === "Enter" && onQuestionSelect(question)}
					role="button"
					tabindex="0"
				>
					<div class="flex flex-row">
						<ObsidianIcon iconId="help" size="s" />
						<div class="text-muted ml-1 text-sm capitalize">{question.theme}</div>
					</div>
					<div class="mt-1 text-sm">{question.content}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
