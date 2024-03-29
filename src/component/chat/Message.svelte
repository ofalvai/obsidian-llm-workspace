<script lang="ts">
	import type { ChatMessage } from "src/rag/llm/common"
	import { createEventDispatcher } from "svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"

	export let message: ChatMessage

	const dispatch = createEventDispatcher<{
		copy: string
		edit: string
	}>()
</script>

<div class="flex flex-row items-baseline">
	{#if message.role === "user"}
		<ObsidianIcon iconId="user" size="s" className="mr-2 flex-none relative top-1" />
	{:else if message.role === "assistant"}
		<ObsidianIcon iconId="sparkles" size="s" className="mr-2 flex-none relative top-1" />
	{/if}
	<ObsidianMarkdown source={message.content} className="grow select-text" />
</div>
<div class="flex w-full flex-row justify-end mt-1">
	{#if message.role === "assistant"}
		<button
			class="clickable-icon"
			on:click={() => dispatch("copy", message.content)}
			aria-label="Copy response"
			data-tooltip-delay="300"
		>
			<ObsidianIcon iconId="copy" size="s" />
		</button>
	{:else if message.role === "user"}{/if}
</div>
