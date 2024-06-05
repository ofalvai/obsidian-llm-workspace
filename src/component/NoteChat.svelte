<script lang="ts">
	import type { TFile } from "obsidian"
	import { llmClient } from "src/llm-features/client"
	import { conversationStore } from "src/llm-features/conversation"
	import type { CompletionOptions } from "src/rag/llm/common"
	import { SingleNoteQueryEngine, type QueryEngine } from "src/rag/query-engine"
	import { DumbResponseSynthesizer, type ResponseSynthesizer } from "src/rag/synthesizer"
	import { writeDebugInfo } from "src/utils/debug"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { readable } from "svelte/store"
	import TailwindCss from "./TailwindCSS.svelte"
	import ConfigValue from "./chat/ConfigValue.svelte"
	import ConversationStyle from "./chat/ConversationStyle.svelte"
	import QuestionAndAnswer from "./chat/QuestionAndAnswer.svelte"

	let { file }: { file: TFile } = $props()

	const noteContent = readable("", (set) => {
		$appStore.vault.cachedRead(file).then((content) => {
			set(content)
		})
		$appStore.vault.on("modify", (modifiedFile) => {
			if (modifiedFile.path === file.path) {
				$appStore.vault.cachedRead(file).then((content) => {
					set(content)
				})
			}
		})
	})
	const completionOptions: CompletionOptions = $state({
		temperature: "balanced",
		maxTokens: 1024,
	})
	let synthesizer: ResponseSynthesizer = $derived(
		new DumbResponseSynthesizer($llmClient, completionOptions, $settingsStore.systemPrompt),
	)
	let queryEngine: QueryEngine = $derived(
		new SingleNoteQueryEngine(synthesizer, $noteContent, file.path),
	)
	let conversation: ReturnType<typeof conversationStore> = $derived(
		conversationStore(queryEngine, $llmClient, completionOptions),
	)
</script>

<TailwindCss />
<div class="h-full w-full">
	<QuestionAndAnswer
		conversation={$conversation}
		displaySources={false}
		onMessageSubmit={async (msg) => conversation.submitMessage(msg)}
		onNewConversation={conversation.resetConversation}
		onDebugClick={(resp) => writeDebugInfo($appStore, resp)}
		onSourceClick={() => {}}
	>
		<div slot="empty">
			<div class="font-medium">Configuration</div>
			<ConfigValue
				iconId="file-text"
				label="Conversation grounded in"
				value={file.basename}
			/>
			<ConfigValue iconId="bot" label="LLM" value={$llmClient.displayName} />
			<ConversationStyle
				temperature={completionOptions.temperature}
				onChange={(t) => (completionOptions.temperature = t)}
			/>
		</div>
	</QuestionAndAnswer>
</div>
