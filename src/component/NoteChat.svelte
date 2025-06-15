<script lang="ts">
	import type { TFile } from "obsidian"
	import { llmClient } from "src/llm-features/llm-client"
	import { conversationStore } from "src/llm-features/conversation"
	import type { CompletionOptions } from "src/rag/llm/common"
	import { SingleNoteQueryEngine, type QueryEngine } from "src/rag/query-engine"
	import { DumbResponseSynthesizer, type ResponseSynthesizer } from "src/rag/synthesizer"
	import { writeDebugInfo } from "src/utils/debug"
	import { appStore, settingsStore } from "src/utils/obsidian"
	import { writable } from "svelte/store"
	import TailwindCss from "./TailwindCSS.svelte"
	import ConfigValue from "./chat/ConfigValue.svelte"
	import ConversationStyle from "./chat/ConversationStyle.svelte"
	import QuestionAndAnswer from "./chat/QuestionAndAnswer.svelte"
	import {
		selectionActionToMessage,
		type TextSelectionAction,
	} from "src/llm-features/selection-actions"

	let { file }: { file: TFile } = $props()

	let pendingNoteContent = $state<string | null>(null)
	const noteContent = writable("", (set) => {
		$appStore.vault.cachedRead(file).then((content) => {
			set(content)
		})
		const ref = $appStore.vault.on("modify", (modifiedFile) => {
			if (modifiedFile.path === file.path) {
				$appStore.vault.cachedRead(file).then((content) => {
					pendingNoteContent = content
				})
			}
		})
		return () => $appStore.vault.offref(ref)
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
	const onNewConversation = () => {
		onReload()
		conversation.resetConversation()
	}
	const onReload = () => {
		if (pendingNoteContent !== null) {
			noteContent.set(pendingNoteContent)
			pendingNoteContent = null
		}
	}

	const onSubmitMessage = async (message: string, attachedFiles: TFile[]) => {
		var nodes = []
		for (const file of attachedFiles) {
			try {
				nodes.push({
					content: await $appStore.vault.cachedRead(file),
					parent: file.path,
					createdAt: new Date().valueOf(),
				})
			} catch (e) {
				console.error(`Failed to attach file ${file.path}`, e)
				continue
			}
		}
		conversation.submitMessage(message, nodes)
	}
	const onAction = (action: TextSelectionAction, selectedText: string) => {
		const message = selectionActionToMessage(action, selectedText)
		conversation.submitMessage(message, [])
	}
</script>

<TailwindCss />
<div class="h-full w-full">
	<QuestionAndAnswer
		conversation={$conversation}
		isOutdated={pendingNoteContent !== null}
		onMessageSubmit={onSubmitMessage}
		{onNewConversation}
		onDebugClick={(resp) => writeDebugInfo($appStore, resp)}
		onSourceClick={() => {}}
		{onReload}
		{onAction}
	>
		<div slot="empty">
			<div class="font-medium">Chat configuration</div>
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
