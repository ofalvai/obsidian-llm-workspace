<script lang="ts">
	import type { ChatMessage } from "src/rag/llm/common"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"

	let {
		message,
		onCopy,
		onEdit,
	}: {
		message: ChatMessage
		onCopy: (msg: string) => void
		onEdit: (msg: string) => void
	} = $props()
</script>

<div class="flex flex-row items-baseline">
	{#if message.role === "user"}
		<ObsidianIcon iconId="user" size="s" className="mr-2 flex-none relative top-1" />
	{:else if message.role === "assistant"}
		<ObsidianIcon iconId="sparkles" size="s" className="mr-2 flex-none relative top-1" />
	{/if}
	<ObsidianMarkdown
		source={message.content}
		className={(message.role === "user" ? "text-accent font-medium" : "") + " grow select-text"}
	/>
</div>
<div class="mt-1 flex w-full flex-row justify-end">
	{#if message.role === "assistant"}
		<button
			class="clickable-icon"
			onclick={() => onCopy(message.content)}
			aria-label="Copy response"
			data-tooltip-delay="300"
		>
			<ObsidianIcon iconId="copy" size="s" />
		</button>
	{:else if message.role === "user"}{/if}
</div>
