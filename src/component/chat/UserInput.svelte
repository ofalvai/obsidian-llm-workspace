<script lang="ts">
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import type { TFile } from "obsidian"

	let {
		disabled,
		isConversationActive,
		attachedFiles,
		onSubmit,
		onNewConversation,
		onSelectAttachment,
		onRemoveAttachedFile,
	}: {
		disabled: boolean
		isConversationActive: boolean
		attachedFiles: TFile[]
		onSubmit: (input: string) => void
		onNewConversation: () => void
		onSelectAttachment: () => void
		onRemoveAttachedFile: (file: TFile) => void
	} = $props()

	const keyboardHint = "Press ⏎ to send message, ⇧ + ⏎ for new line.\n"

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
	<div class="flex flex-row flex-wrap gap-1 py-2">
		{#each attachedFiles as file (file.basename)}
			<div
				class="flex flex-row items-center rounded border border-solid border-border bg-primary px-1 py-0.5 text-sm"
			>
				{file.basename}
				<button
					class="ml-1 h-fit w-fit bg-transparent p-0 !shadow-none hover:shadow-none"
					onclick={() => onRemoveAttachedFile(file)}
				>
					<ObsidianIcon iconId="x" size="s" />
				</button>
			</div>
		{/each}
	</div>

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
			oninput={(event) => {
				const textarea = event.target as HTMLTextAreaElement
				if (textarea.selectionStart != textarea.selectionEnd) {
					// We don't carea about text selection
					return
				}
				if (textarea.value.length < 2) return

				const cursorPos = textarea.selectionStart
				if (
					textarea.value[cursorPos - 1] === "[" &&
					textarea.value[cursorPos - 2] === "["
				) {
					// Delete back the [[
					query = query.slice(0, cursorPos - 2) + query.slice(cursorPos)
					onSelectAttachment()
				}
			}}
			placeholder={(isConversationActive ? "Continue conversation..." : "Ask a question...") +
				"\n" +
				keyboardHint}
			bind:value={query}
		></textarea>
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
					onclick={_onNewConversation}
					aria-label="New conversation"
				>
					<ObsidianIcon iconId="plus" />
				</button>
			{/if}
		</div>
	</div>
</form>
