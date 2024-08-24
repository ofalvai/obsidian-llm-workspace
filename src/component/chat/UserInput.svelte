<script lang="ts">
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	let {
		isStreaming,
		isConversationActive,
		onSubmit,
		onNewConversation,
		onAbort,
	}: {
		isStreaming: boolean
		isConversationActive: boolean
		onSubmit: (input: string) => void
		onNewConversation: () => void
		onAbort: () => void
	} = $props()

	// TODO: Platform-specific keyboard hint
	const keyboardHint = "Press ⏎ to send message, ⇧ + ⏎ for new line."

	let query = $state("")

	const _onSubmit = (e: SubmitEvent) => {
		e.preventDefault()
		onSubmit(query)
		query = ""
	}
	const _onNewConversation = () => {
		query = ""
		onNewConversation()
	}
</script>

<form class="fixed bottom-11 left-4 right-4" onsubmit={_onSubmit}>
	<div class="flex flex-row gap-x-2">
		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			class="text-normal w-full resize-y bg-secondary"
			autofocus
			rows="3"
			onkeydown={(event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault()
					_onSubmit(new SubmitEvent("submit"))
				}
			}}
			placeholder={(isConversationActive ? "Continue conversation..." : "Ask a question...") +
				"\n" +
				keyboardHint}
			bind:value={query}
		></textarea>
		<div class="flex flex-col justify-center gap-y-2">
			{#if isStreaming}
				<button
					class="clickable-icon"
					type="button"
					aria-label="Stop response"
					onclick={() => onAbort()}
				>
					<ObsidianIcon iconId="x" />
				</button>
			{:else}
				<button
					class="clickable-icon"
					disabled={query.trim() == ""}
					type="submit"
					aria-label="Send message"
				>
					<ObsidianIcon iconId="send" />
				</button>
			{/if}

			{#if isConversationActive}
				<button
					class="clickable-icon"
					onclick={_onNewConversation}
					aria-label="New conversation"
				>
					<ObsidianIcon iconId="plus" />
				</button>
			{/if}
		</div>
	</div>
</form>
