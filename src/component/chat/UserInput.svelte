<script lang="ts">
	import { createEventDispatcher } from "svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	export let disabled: boolean
	export let isConversationActive: boolean

	const keyboardHint = "Press ⏎ to send message, ⇧ + ⏎ for new line."

	const dispatch = createEventDispatcher<{
		submit: string
		"new-conversation": void
	}>()

	let query = ""

	const onSubmit = () => {
		if (!query) return
		dispatch("submit", query)
		query = ""
	}
	const onNewConversation = () => {
		query = ""
		dispatch("new-conversation")
	}
</script>

<form class="fixed bottom-11 left-4 right-4" on:submit|preventDefault={onSubmit}>
	<div class="flex flex-row gap-x-2">
		<!-- svelte-ignore a11y-autofocus -->
		<textarea
			class="text-normal w-full resize-y bg-secondary"
			autofocus
			rows="3"
			on:keydown={(event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault()
					onSubmit()
				}
			}}
			placeholder={(isConversationActive ? "Continue conversation..." : "Ask a question...") +
				"\n" +
				keyboardHint}
			bind:value={query}
		/>
		<div class="flex flex-col justify-center gap-y-2">
			<button
				class={"clickable-icon"}
				disabled={disabled || query.trim() == ""}
				type="submit"
				aria-label="Send message"
			>
				<ObsidianIcon iconId="send" />
			</button>
			{#if isConversationActive}
				<button
					class="clickable-icon"
					on:click|preventDefault={onNewConversation}
					aria-label="New conversation"
				>
					<ObsidianIcon iconId="plus" />
				</button>
			{/if}
		</div>
	</div>
</form>
