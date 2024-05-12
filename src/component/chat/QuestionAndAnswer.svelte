<script lang="ts">
	import type { Conversation } from "src/rag/conversation"
	import type { DebugInfo } from "src/rag/synthesizer"
	import { createEventDispatcher } from "svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import SourceList from "./SourceList.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import { Notice } from "obsidian"
	import Message from "./Message.svelte"
	import UserInput from "./UserInput.svelte"

	export let conversation: Conversation | null
	export let displaySources = true

	const dispatch = createEventDispatcher<{
		"message-submit": string
		"source-click": string
		"debug-click": DebugInfo
		"new-conversation": void
	}>()
	const onDebugClick = () => {
		if (conversation?.queryResponse?.debugInfo) {
			dispatch("debug-click", conversation.queryResponse.debugInfo)
		}
	}
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
		new Notice("Copied to clipboard", 1000)
	}
</script>

<div class="relative grow pb-32">
	{#if conversation}
		<div class="grow">
			{#if conversation.initialUserQuery}
				<div class="flex flex-row items-center">
					<ObsidianIcon className="mr-2" iconId="user" size="s" />
					<ObsidianMarkdown
						className="grow select-text"
						source={conversation.initialUserQuery}
					/>
				</div>
			{/if}
			{#if conversation.queryResponse}
				{#if conversation.queryResponse.debugInfo.originalQuery != conversation.queryResponse.debugInfo.improvedQuery}
					<div class="flex flex-row items-center">
						<ObsidianIcon size="s" iconId="target" className="mr-2" />
						<div aria-label="Improved query" data-tooltip-delay="300">
							<ObsidianMarkdown
								className="grow select-text text-faint"
								source={conversation.queryResponse.debugInfo.improvedQuery}
							/>
						</div>
					</div>
				{/if}
				<div class="flex flex-row items-baseline">
					<ObsidianIcon
						iconId="sparkles"
						size="s"
						className="mr-2 flex-none relative top-1"
					/>
					<ObsidianMarkdown
						className="grow select-text"
						source={conversation.queryResponse.text}
					/>
				</div>
				<div class="mb-1 flex w-full flex-row justify-end">
					<button
						class="clickable-icon"
						on:click={() => copyToClipboard(conversation?.queryResponse?.text ?? "")}
						aria-label="Copy response"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="copy" size="s" />
					</button>
					<button
						class="clickable-icon"
						on:click={onDebugClick}
						aria-label="Debug response"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="bug-play" size="s" />
					</button>
				</div>
				{#if displaySources}
					<SourceList queryResponse={conversation.queryResponse} on:source-click />
				{/if}
			{/if}
			{#each conversation.additionalMessages as msg}
				<Message message={msg} on:copy={(e) => copyToClipboard(e.detail)} />
			{/each}
			{#if conversation.isLoading}
				<div class="flex flex-row items-baseline">
					<ObsidianIcon
						iconId="sparkles"
						size="s"
						className="mr-2 flex-none relative top-1"
					/>
					<div class="relative top-2">
						<Loading size="l" />
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<UserInput
		disabled={conversation?.isLoading ?? false}
		isConversationActive={conversation != null}
		on:submit={(e) => dispatch("message-submit", e.detail)}
		on:new-conversation={(e) => dispatch("new-conversation")}
	/>
</div>
