<script lang="ts">
	import type { Conversation } from "src/rag/conversation"
	import type { DebugInfo } from "src/rag/synthesizer"
	import { createEventDispatcher } from "svelte"
	import ObsidianMarkdown from "./obsidian/ObsidianMarkdown.svelte"
	import ObsidianIcon from "./obsidian/ObsidianIcon.svelte"
	import SourceList from "./SourceList.svelte"

	export let isLoading = false
	export let conversation: Conversation | null

	const dispatch = createEventDispatcher<{
		"message-submit": string
		"source-click": string
		"debug-click": DebugInfo
		"new-conversation-click": void
	}>()

	let query = ""

	const onSubmit = () => {
		if (!query) return
		dispatch("message-submit", query)
		query = ""
	}

	const onDebugClick = () => {
		if (conversation?.queryResponse?.debugInfo) {
			dispatch("debug-click", conversation.queryResponse.debugInfo)
		}
	}

	const onNewConversationClick = () => {
		query = ""
		dispatch("new-conversation-click")
	}
</script>

<div class="relative grow">
	{#if conversation}
		<div class="grow pb-16">
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
				<div class="flex flex-row items-center">
					<ObsidianIcon size="s" iconId="target" className="mr-2" />
					<div aria-label="Improved query" data-tooltip-delay="300">
						<ObsidianMarkdown
							className="grow select-text"
							source={conversation.queryResponse.debugInfo.improvedQuery}
						/>
					</div>
				</div>
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
				<SourceList queryResponse={conversation.queryResponse} on:source-click />
				<div>
					<button class="clickable-icon" on:click={onDebugClick}> </button>
				</div>
			{/if}
			{#each conversation.additionalMessages as msg}
				<div class="flex flex-row items-baseline">
					{#if msg.role === "user"}
						<ObsidianIcon
							iconId="user"
							size="s"
							className="mr-2 flex-none relative top-1"
						/>
					{:else if msg.role === "assistant"}
						<ObsidianIcon
							iconId="sparkles"
							size="s"
							className="mr-2 flex-none relative top-1"
						/>
					{/if}
					<ObsidianMarkdown source={msg.content} className="grow select-text" />
				</div>
			{/each}
		</div>
	{/if}
	<form class="sticky bottom-0 left-0 right-0" on:submit|preventDefault={onSubmit}>
		<textarea
			class="w-full resize-y bg-form-field"
			rows="2"
			on:keydown={(event) => {
				if (event.key === "Enter") {
					onSubmit()
				}
			}}
			disabled={isLoading}
			placeholder="Ask a question"
			bind:value={query}
		/>
		<button disabled={isLoading || query.trim() == ""} type="submit">
			Ask
			{#if isLoading}...{/if}
		</button>
		{#if conversation}
			<button on:click|preventDefault={onNewConversationClick}>New conversation</button>
		{/if}
	</form>
</div>
