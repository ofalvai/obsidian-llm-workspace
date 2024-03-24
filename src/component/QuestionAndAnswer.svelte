<script lang="ts">
	import type { Conversation } from "src/rag/conversation"
	import type { DebugInfo } from "src/rag/synthesizer"
	import { createEventDispatcher } from "svelte"
	import ObsidianMarkdown from "./obsidian/ObsidianMarkdown.svelte"
	import ObsidianIcon from "./obsidian/ObsidianIcon.svelte"
	import SourceList from "./SourceList.svelte"

	export let conversation: Conversation | null
	export let displaySources = true

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
				{#if conversation.queryResponse.debugInfo.originalQuery != conversation.queryResponse.debugInfo.improvedQuery}
					<div class="flex flex-row items-center">
						<ObsidianIcon size="s" iconId="target" className="mr-2" />
						<div aria-label="Improved query" data-tooltip-delay="300">
							<ObsidianMarkdown
								className="grow select-text"
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
				{#if displaySources}
					<SourceList queryResponse={conversation.queryResponse} on:source-click />
				{/if}
				<div class="flex flex-row w-full items-end">
					<button
						class="clickable-icon"
						on:click={onDebugClick}
						aria-label="Debug response"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="bug-play" size="s" />
					</button>
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
		<!-- svelte-ignore a11y-autofocus -->
		<textarea
			class="w-full resize-y bg-form-field"
			autofocus
			rows="2"
			on:keydown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault()
					onSubmit()
				}
			}}
			disabled={conversation?.isLoading ?? false}
			placeholder="Ask a question"
			bind:value={query}
		/>
		<button disabled={(conversation?.isLoading ?? false) || query.trim() == ""} type="submit">
			Ask
		</button>
		{#if conversation}
			<button on:click|preventDefault={onNewConversationClick}>New conversation</button>
		{/if}
	</form>
</div>
