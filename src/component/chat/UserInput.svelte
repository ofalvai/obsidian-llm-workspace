<script lang="ts">
	import { createEventDispatcher } from "svelte"

	export let disabled: boolean
	export let isConversationActive: boolean

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
		{disabled}
		placeholder="Ask a question"
		bind:value={query}
	/>
	<button disabled={disabled || query.trim() == ""} type="submit"> Ask </button>
	{#if isConversationActive}
		<button on:click|preventDefault={onNewConversation}>New conversation</button>
	{/if}
</form>
