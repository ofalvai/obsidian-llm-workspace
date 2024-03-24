<script lang="ts">
	import type { TFile } from "obsidian"
	import { conversationStore } from "src/conversation"
	import { llmClient } from "src/llm"
	import { SingleNoteQueryEngine, type QueryEngine } from "src/rag/query-engine"
	import { DumbResponseSynthesizer, type ResponseSynthesizer } from "src/rag/synthesizer"
	import { writeDebugInfo } from "src/utils/debug"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { readable } from "svelte/store"
	import QuestionAndAnswer from "./QuestionAndAnswer.svelte"
	import TailwindCss from "./TailwindCSS.svelte"

	export let note: TFile

	// TODO: make note content reactive
	const noteContent = readable("", (set) => {
		$appStore.vault.cachedRead(note).then((content) => {
			set(content)
		})
	})
	const completionOptions = {
		temperature: 0.1,
		maxTokens: 512,
	}
	let synthesizer: ResponseSynthesizer
	let queryEngine: QueryEngine
	let conversation: ReturnType<typeof conversationStore>
	$: {
		synthesizer = new DumbResponseSynthesizer(
			$llmClient,
			completionOptions,
			$settingsStore.systemPrompt,
		)
		queryEngine = new SingleNoteQueryEngine(synthesizer, $noteContent, note.path)
		conversation = conversationStore(queryEngine, $llmClient, completionOptions)
	}
</script>

<TailwindCss />
<div class="h-full w-full">
	<QuestionAndAnswer
		conversation={$conversation}
		displaySources={false}
		on:message-submit={async (e) => conversation.submitMessage(e.detail)}
		on:new-conversation-click={() => conversation.resetConversation()}
		on:debug-click={(e) => writeDebugInfo($appStore, e.detail)}
	/>
</div>
