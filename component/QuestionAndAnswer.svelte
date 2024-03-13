<script lang="ts">
	import type { Conversation } from "rag/conversation"
	import type { DebugInfo } from "rag/synthesizer"
	import { createEventDispatcher } from "svelte"
	import Markdown from "./Markdown.svelte"
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

<div class="grow relative">
	{#if conversation}
		<div class="grow pb-16">
			{#if conversation.initialUserQuery}
				<Markdown source={conversation.initialUserQuery} />
			{/if}
			{#if conversation.queryResponse}
				<div>
					Improved query: <Markdown
						source={conversation.queryResponse.debugInfo.improvedQuery}
					/>
				</div>
				<div class="leading-relaxed">
					<Markdown source={conversation.queryResponse.text} />
				</div>
				<SourceList queryResponse={conversation.queryResponse} on:source-click />
				<button on:click={onDebugClick}>Debug response</button>
			{/if}
			{#each conversation.additionalMessages as msg}
				<div class="my-8">
					<Markdown source={msg.content} />
				</div>
			{/each}
		</div>
	{/if}
	<form class="sticky bottom-0 left-0 right-0" on:submit|preventDefault={onSubmit}>
		<textarea
			class="w-full"
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
