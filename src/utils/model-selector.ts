import type { DialogProps } from "src/component/settings/types"
import type { Provider } from "src/config/providers"
import type { ModelConfiguration } from "src/config/settings"
import type { Component } from "svelte"
import AnthropicSettingsDialog from "src/component/settings/AnthropicSettingsDialog.svelte"
import OllamaSettingsDialog from "src/component/settings/OllamaSettingsDialog.svelte"
import OpenAiSettingsDialog from "src/component/settings/OpenAISettingsDialog.svelte"
import OpenAICompatibleSettingsDialog from "src/component/settings/OpenAICompatibleSettingsDialog.svelte"

export const PROVIDERS_WITH_CUSTOM_SETTINGS = new Set<Provider>(["Ollama", "OpenAI-compatible"])

export const PROVIDER_COMPONENT_MAP: Map<Provider, Component<DialogProps>> = new Map([
	["Ollama", OllamaSettingsDialog],
	["OpenAI", OpenAiSettingsDialog],
	["Anthropic", AnthropicSettingsDialog],
	["OpenAI-compatible", OpenAICompatibleSettingsDialog],
])

export function modelConfigToDropdownOptions(
	configs: ModelConfiguration[],
): Record<string, string> {
	const selectableModels = configs.reduce(
		(acc: { [key: string]: string }, config: ModelConfiguration) => {
			acc[config.model] = config.model
			return acc
		},
		{},
	)

	for (const provider of PROVIDERS_WITH_CUSTOM_SETTINGS.keys()) {
		selectableModels[provider] = provider
	}
	return selectableModels
}

export function dropdownValueToModelConfig(
	configs: ModelConfiguration[],
	key: string,
): ModelConfiguration | null {
	return configs.find((model) => model.model === key) || null
}

export function modelConfigToDropdownValue(config: ModelConfiguration): string {
	if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(config.provider)) {
		return config.provider
	} else {
		return config.model
	}
}
