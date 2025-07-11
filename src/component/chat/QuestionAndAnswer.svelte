<script lang="ts">
	import { Notice, TFile } from "obsidian"
	import type { ModelConfiguration } from "src/config/settings"
	import {
		handleTextSelection,
		type TextSelectionAction,
	} from "src/llm-features/selection-actions"
	import type { Conversation } from "src/rag/conversation"
	import type { QueryResponse } from "src/rag/synthesizer"
	import { onMount } from "svelte"
	import ErrorComponent from "../ErrorComponent.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ObsidianMarkdown from "../obsidian/ObsidianMarkdown.svelte"
	import Message from "./Message.svelte"
	import SourceList from "./SourceList.svelte"
	import TextSelectionActions from "./TextSelectionActions.svelte"
	import UserInput from "./UserInput.svelte"

	let {
		conversation,
		isOutdated,
		onMessageSubmit,
		onSourceClick,
		onDebugClick,
		onNewConversation,
		onReload,
		onModelChange,
		onAction,
	}: {
		conversation: Conversation | null
		isOutdated: boolean
		onMessageSubmit: (msg: string, attachedFiles: TFile[]) => void
		onSourceClick: (path: string) => void
		onDebugClick: (response: QueryResponse) => void
		onNewConversation: () => void
		onReload: () => void
		onModelChange: (config: ModelConfiguration) => void
		onAction: (action: TextSelectionAction, text: string) => void
	} = $props()

	let conversationContainer: HTMLDivElement
	let showSelectionActions = $state(false)
	let selectedText = $state("")
	let selectionPosition = $state({ x: 0, y: 0 })

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
		new Notice("Copied to clipboard", 1000)
	}

	const closeSelectionActions = () => {
		showSelectionActions = false
		window.getSelection()?.removeAllRanges()
	}

	const documentSelectionChange = () => {
		// The `selectionchange` event is also triggered by input elements, which we want to ignore.
		if (
			document.activeElement instanceof HTMLInputElement ||
			document.activeElement instanceof HTMLTextAreaElement
		) {
			return
		}

		handleTextSelection(
			conversationContainer,
			(text, position) => {
				selectedText = text
				selectionPosition = position
				showSelectionActions = true
			},
			() => (showSelectionActions = false),
		)
	}

	onMount(() => {
		document.addEventListener("selectionchange", documentSelectionChange)
		return () => document.removeEventListener("selectionchange", documentSelectionChange)
	})
</script>

<div class="conversation-scroller relative grow pb-40" bind:this={conversationContainer}>
	{#if conversation}
		<div class="grow">
			{#if conversation.initialUserQuery}
				<Message
					message={{
						role: "user",
						content: conversation.initialUserQuery,
						attachedContent: [],
					}}
					onCopy={(msg) => copyToClipboard(msg)}
					onEdit={(msg) => {}}
				/>
			{/if}
			{#if conversation.queryResponse}
				{#if conversation.queryResponse.retrievalDetails?.originalQuery != conversation.queryResponse.retrievalDetails?.improvedQuery}
					<div class="flex flex-row items-center">
						<ObsidianIcon size="s" iconId="target" className="mr-2" />
						<div
							aria-label="Query used for retrieving relevant notes"
							data-tooltip-delay="300"
						>
							<ObsidianMarkdown
								className="grow select-text text-faint"
								source={conversation.queryResponse.retrievalDetails
									?.improvedQuery ?? ""}
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
				{#if conversation.queryResponse.sources.length > 1}
					<SourceList
						queryResponse={conversation.queryResponse}
						onClick={onSourceClick}
					/>
				{/if}
			{/if}
			{#each conversation.additionalMessages as msg (msg.content)}
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
			{#if isOutdated}
				<div class="flex flex-row justify-start">
					<ObsidianIcon iconId="file-warning" size="s" className="mr-2" />
					<p class="text-sm">Note content has changed</p>
					<button
						class="clickable-icon"
						onclick={onReload}
						aria-label="Start new conversation"
						data-tooltip-delay="300"
					>
						<ObsidianIcon iconId="refresh-cw" size="s" />
					</button>
				</div>
			{/if}
			{#if conversation.error}
				<ErrorComponent body={conversation.error} />
			{/if}
		</div>
	{:else}
		<slot name="empty" />
	{/if}
	<div id="scroll-anchor"></div>
	<UserInput
		disabled={conversation?.isLoading ?? false}
		isConversationActive={conversation != null}
		onSubmit={onMessageSubmit}
		{onNewConversation}
		{onModelChange}
	/>
</div>

{#if showSelectionActions}
	<TextSelectionActions
		{selectedText}
		position={selectionPosition}
		onAction={(action, text) => {
			closeSelectionActions()
			onAction(action, text)
			// We don't have a reference to the scrollable container, but we can scrollIntoView the bottom
			// of the conversation container
			conversationContainer.scrollIntoView({
				block: "end",
				behavior: "smooth",
			})
		}}
		onClose={closeSelectionActions}
	/>
{/if}

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
