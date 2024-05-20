<script lang="ts">
	import type { Temperature } from "src/rag/llm/common"
	import { createEventDispatcher } from "svelte"

	export let temperature: Temperature

	const values: Temperature[] = ["creative", "balanced", "precise"]

	const dispatch = createEventDispatcher<{
		change: Temperature
	}>()

	const select = (t: Temperature) => {
		temperature = t
		dispatch("change", temperature)
	}
</script>

<div class="my-4 flex flex-col items-center">
	<div class="mb-1 text-sm text-muted">Conversation style</div>
	<div class="flex flex-row gap-x-1 rounded bg-secondary p-1">
		{#each values as temp}
			<button
				class={"!shadow-none capitalize " +
					(temperature === temp
						? "!bg-interactive-accent hover:!bg-interactive-accent-hover text-on-accent"
						: "bg-interactive hover:bg-interactive-hover")}
				on:click={() => select(temp)}
			>
				{temp}
			</button>
		{/each}
	</div>
</div>
