<script lang="ts">
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import type { TFile } from "obsidian"
	import { showSelectVaultFileModal } from "src/view/SelectVaultFileModal"
	import { appStore } from "src/utils/obsidian"

	let {
		disabled,
		isConversationActive,
		onSubmit,
		onNewConversation,
	}: {
		disabled: boolean
		isConversationActive: boolean
		onSubmit: (input: string, attachedFiles: TFile[]) => void
		onNewConversation: () => void
	} = $props()

	const keyboardHint = "⇧ + ⏎: line break\n[[: attach file\n@: insert prompt"
	const rowCountDefault = 4
	const rowCountExpanded = 8

	let query = $state("")
	let rowCount = $state(rowCountDefault)
	let attachedFiles: TFile[] = $state([])

	const _onSubmit = (e: SubmitEvent) => {
		e.preventDefault()
		onSubmit(query, attachedFiles)
		query = ""
		rowCount = rowCountDefault
		attachedFiles = []
	}
	const _onNewConversation = () => {
		query = ""
		onNewConversation()
	}
	const onFileAttach = async (cursorPos: number) => {
		// Delete back the [[
		query = query.slice(0, cursorPos - 2) + query.slice(cursorPos)
		const onSelect = (selectedFile: TFile) => {
			if (attachedFiles.some((f) => f.path === selectedFile.path)) {
				return
			}
			attachedFiles.push(selectedFile)
		}
		await showSelectVaultFileModal($appStore, onSelect)
	}
	const onInlineInclude = async (cursorPos: number) => {
		// Delete back the @
		query = query.slice(0, cursorPos - 1) + query.slice(cursorPos)

		const onSelect = async (file: TFile) => {
			const prompt = await $appStore.vault.cachedRead(file)
			query = query + " " + prompt
			rowCount = rowCountExpanded
		}
		await showSelectVaultFileModal($appStore, onSelect)
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
					onclick={() => attachedFiles.remove(file)}
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
			rows={rowCount}
			onkeydown={(event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault()
					_onSubmit(new SubmitEvent("submit"))
				}
			}}
			oninput={async (event) => {
				const textarea = event.target as HTMLTextAreaElement
				if (textarea.selectionStart != textarea.selectionEnd) {
					// We don't carea about text selection
					return
				}

				const cursorPos = textarea.selectionStart
				if (
					textarea.value.length >= 2 &&
					textarea.value[cursorPos - 1] === "[" &&
					textarea.value[cursorPos - 2] === "["
				) {
					onFileAttach(cursorPos)
				}

				if (textarea.value.length >= 1 && textarea.value[cursorPos - 1] === "@") {
					onInlineInclude(cursorPos)
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
					<ObsidianIcon iconId="list-restart" />
				</button>
			{/if}
		</div>
	</div>
</form>
