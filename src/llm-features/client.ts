import { derived, type Writable } from "svelte/store"
import type { LlmPluginSettings } from "../config/settings"
import { AnthropicChatCompletionClient } from "../rag/llm/anthropic"
import type { StreamingChatCompletionClient } from "../rag/llm/common"
import { OpenAIChatCompletionClient } from "../rag/llm/openai"
import { settingsStore } from "../utils/obsidian"

export const llmClient = derived<Writable<LlmPluginSettings>, StreamingChatCompletionClient>(
    settingsStore,
    ($settingsStore) => {
        const model = $settingsStore.questionAndAnswerModel

		// Custom model check.
        if ($settingsStore.customModelName && model === $settingsStore.customModelName) {
            return new OpenAIChatCompletionClient(
                $settingsStore.customModelApiKey,
                model,
                $settingsStore.customModelUrl || undefined
            )
        }
		// Standard OpenAI/Anthropic model handling.
        if (model.startsWith("gpt")) {
            return new OpenAIChatCompletionClient(
                $settingsStore.openAIApiKey,
                model
            )
        } else if (model.startsWith("claude")) {
            return new AnthropicChatCompletionClient($settingsStore.anthropicApikey, model)
        }

        throw new Error(`Unsupported model: ${model}`)
    },
)

