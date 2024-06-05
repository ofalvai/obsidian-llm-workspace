<script lang="ts">
	import { Notice } from "obsidian"
	import type { Conversation } from "src/rag/conversation"
	import type { QueryResponse } from "src/rag/synthesizer"
	import Error from "../Error.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"
	import Message from "./Message.svelte"
	import SourceList from "./SourceList.svelte"
	import UserInput from "./UserInput.svelte"

	let {
		conversation,
		displaySources,
		onMessageSubmit,
		onSourceClick,
		onDebugClick,
		onNewConversation,
	}: {
		conversation: Conversation | null
		displaySources: boolean
		onMessageSubmit: (msg: string) => void
		onSourceClick: (path: string) => void
		onDebugClick: (response: QueryResponse) => void
		onNewConversation: () => void
	} = $props()

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
		new Notice("Copied to clipboard", 1000)
	}
</script>

<div class="conversation-scroller relative grow pb-32">
	{#if conversation}
		<div class="grow">
			{#if conversation.initialUserQuery}
				<Message
					message={{
						role: "user",
						content: conversation.initialUserQuery,
					}}
					onCopy={(msg) => copyToClipboard(msg)}
					onEdit={(msg) => {}}
				/>
			{/if}
			{#if conversation.queryResponse}
				{#if conversation.queryResponse.debugInfo?.originalQuery != conversation.queryResponse.debugInfo?.improvedQuery}
					<div class="flex flex-row items-center">
						<ObsidianIcon size="s" iconId="target" className="mr-2" />
						<div
							aria-label="Query used for retrieving relevant notes"
							data-tooltip-delay="300"
						>
							<ObsidianMarkdown
								className="grow select-text text-faint"
								source={conversation.queryResponse.debugInfo?.improvedQuery ?? ""}
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
						onclick={() => copyToClipboard(conversation?.queryResponse?.text ?? "")}
						aria-label="Copy response"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="copy" size="s" />
					</button>
					<button
						class="clickable-icon"
						onclick={() => {
							if (conversation?.queryResponse?.debugInfo) {
								onDebugClick(conversation.queryResponse)
							}
						}}
						aria-label="Debug response"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="bug-play" size="s" />
					</button>
				</div>
				{#if displaySources}
					<SourceList
						queryResponse={conversation.queryResponse}
						onClick={onSourceClick}
					/>
				{/if}
			{/if}
			{#each conversation.additionalMessages as msg}
				<Message
					message={msg}
					onCopy={(msg) => copyToClipboard(msg)}
					onEdit={(msg) => {}}
				/>
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
			{#if conversation.error}
				<Error body={conversation.error} />
			{/if}
		</div>
	{:else}
		<slot name="empty" />
	{/if}
	<div id="scroll-anchor"></div>
	<UserInput
		disabled={conversation?.isLoading ?? false}
		isConversationActive={conversation != null}
		onSubmit={(input) => onMessageSubmit(input)}
		{onNewConversation}
	/>
</div>

<style>
	/* https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom/ */
	.conversation-scroller * {
		/* height: 100.001vh; */
		overflow-anchor: none;
	}
	#scroll-anchor {
		overflow-anchor: auto;
		height: 1px;
	}
</style>
