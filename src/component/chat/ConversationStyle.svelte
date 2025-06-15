<script lang="ts">
	import type { Temperature } from "src/rag/llm/common"

	let {
		temperature,
		onChange,
	}: {
		temperature: Temperature
		onChange: (t: Temperature) => void
	} = $props()

	const values: Temperature[] = ["creative", "balanced", "precise"]
</script>

<div class="my-4 flex flex-col items-center">
	<div class="text-muted mb-1 text-sm">Conversation style</div>
	<div class="bg-secondary flex flex-row gap-x-1 rounded p-1">
		{#each values as tempValue}
			<button
				class={"capitalize !shadow-none " +
					(temperature === tempValue
						? "!bg-interactive-accent !text-on-accent hover:!bg-interactive-accent-hover"
						: "bg-interactive hover:bg-interactive-hover")}
				onclick={() => onChange(tempValue)}
			>
				{tempValue}
			</button>
		{/each}
	</div>
</div>
