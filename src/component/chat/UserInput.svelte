<script lang="ts">
	import type { TFile } from "obsidian"
	import { Notice } from "obsidian"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { showSelectVaultFileModal } from "src/view/SelectVaultFileModal"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

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

	const rowCountDefault = 1
	const rowCountExpanded = 5

	let textarea: HTMLTextAreaElement
	let query = $state("")
	let rowCount = $state(rowCountDefault)
	let attachedFiles: TFile[] = $state([])

	const _onSubmit = (e: SubmitEvent) => {
		e.preventDefault()
		if (query.trim() == "") {
			return
		}
		onSubmit(query, attachedFiles)
		query = ""
		rowCount = rowCountDefault
		attachedFiles = []
	}
	const _onNewConversation = () => {
		query = ""
		onNewConversation()
	}
	const onFileAttach = async (cursorPos: number, editQuery: boolean) => {
		if (editQuery) {
			// Delete back the [[
			query = query.slice(0, cursorPos - 2) + query.slice(cursorPos)
		}
		const onSelect = (selectedFile: TFile) => {
			if (attachedFiles.some((f) => f.path === selectedFile.path)) {
				return
			}
			attachedFiles.push(selectedFile)
			query = query + selectedFile.basename
			textarea.focus()
		}
		await showSelectVaultFileModal($appStore, onSelect)
	}
	const onInlineInclude = async (cursorPos: number, editQuery: boolean) => {
		if (editQuery) {
			// Delete back the @
			query = query.slice(0, cursorPos - 1) + query.slice(cursorPos)
		}
		const onSelect = async (file: TFile) => {
			const prompt = await $appStore.vault.cachedRead(file)
			query = query + " " + prompt
			rowCount = rowCountExpanded
			textarea.focus()
		}

		const promptFolder = $appStore.vault.getFolderByPath($settingsStore.promptFolder)
		if (!promptFolder) {
			new Notice(`Prompt folder not found: ${$settingsStore.promptFolder}`, 1000)
			return
		}
		await showSelectVaultFileModal($appStore, onSelect, promptFolder)
	}
</script>

<form class="fixed bottom-11 left-4 right-4" onsubmit={_onSubmit}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative">
		<!-- Top toolbar -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute start-0 top-0 flex w-full flex-row flex-wrap gap-1 pl-2 pr-2 pt-2"
			onclick={() => textarea.focus()}
		>
			<button
				class="flex! h-fit! rounded! border! border-solid! border-border! bg-primary! p-0! px-1! py-0.5! text-xs! !shadow-none hover:shadow-none"
				aria-label="Insert prompt"
				onclick={(e) => {
					e.preventDefault()
					onInlineInclude(textarea.selectionEnd, false)
				}}
			>
				@
			</button>
			<button
				onclick={(e) => {
					e.preventDefault()
					onFileAttach(textarea.selectionEnd, false)
				}}
				class="flex! h-fit! rounded! border! border-solid! border-border! bg-primary! p-0! px-1! py-0.5! text-xs! !shadow-none hover:shadow-none"
			>
				Add context...
			</button>
			{#each attachedFiles as file (file.basename)}
				<div
					class="flex max-w-40 flex-row items-center rounded border! border-solid! border-border! bg-primary! px-1 py-0.5"
				>
					<div class="line-clamp-1 text-xs">
						{file.basename}
					</div>
					<button
						class="ml-1! h-fit! w-fit! bg-transparent! p-0! !shadow-none hover:shadow-none"
						onclick={() => attachedFiles.remove(file)}
					>
						<ObsidianIcon iconId="x" size="s" />
					</button>
				</div>
			{/each}
		</div>
		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			class="text-normal w-full resize-y bg-secondary pb-8! pt-9!"
			autofocus
			bind:this={textarea}
			bind:value={query}
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
					// We don't care about text selection
					return
				}

				const cursorPos = textarea.selectionStart
				if (
					textarea.value.length >= 2 &&
					textarea.value[cursorPos - 1] === "[" &&
					textarea.value[cursorPos - 2] === "["
				) {
					onFileAttach(cursorPos, true)
				}

				if (textarea.value.length >= 1 && textarea.value[cursorPos - 1] === "@") {
					onInlineInclude(cursorPos, true)
				}
			}}
			placeholder={isConversationActive ? "Continue conversation..." : "Start a question..."}
		></textarea>
		<!-- Bottom toolbar -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			onclick={() => textarea.focus()}
			class="absolute bottom-0 end-0 flex w-full flex-row justify-end gap-1 pb-2 pl-2 pr-2"
		>
			{#if isConversationActive}
				<button
					class="clickable-icon"
					onclick={_onNewConversation}
					aria-label="New conversation"
				>
					<ObsidianIcon iconId="list-restart" />
				</button>
			{/if}
			<button
				class={"clickable-icon"}
				disabled={disabled || query.trim() == ""}
				type="submit"
				aria-label="Send message"
			>
				<ObsidianIcon iconId="send" />
			</button>
		</div>
	</div>
</form>
