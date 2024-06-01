<script lang="ts">
	import type { TFile } from "obsidian"
	import { conversationStore } from "src/llm-features/conversation"
	import { llmClient } from "src/llm-features/client"
	import { SingleNoteQueryEngine, type QueryEngine } from "src/rag/query-engine"
	import { DumbResponseSynthesizer, type ResponseSynthesizer } from "src/rag/synthesizer"
	import { writeDebugInfo } from "src/utils/debug"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { readable } from "svelte/store"
	import QuestionAndAnswer from "./chat/QuestionAndAnswer.svelte"
	import TailwindCss from "./TailwindCSS.svelte"
	import ConfigValue from "./chat/ConfigValue.svelte"
	import ConversationStyle from "./chat/ConversationStyle.svelte"
	import type { CompletionOptions, Temperature } from "src/rag/llm/common"

	export let file: TFile

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
	const completionOptions: CompletionOptions = {
		temperature: "balanced",
		maxTokens: 512,
	}
	const setTemperature = (t: Temperature) => {
		completionOptions.temperature = t
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
		queryEngine = new SingleNoteQueryEngine(synthesizer, $noteContent, file.path)
		conversation = conversationStore(queryEngine, $llmClient, completionOptions)
	}
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
				on:change={(e) => setTemperature(e.detail)}
			/>
		</div>
	</QuestionAndAnswer>
</div>
