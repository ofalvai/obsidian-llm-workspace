<script lang="ts">
	import { Modal } from "obsidian"
	import type { Provider } from "src/config/providers"
	import { MODEL_CONFIGS, type ModelConfiguration } from "src/config/settings"
	import {
		PROVIDERS_WITH_CUSTOM_SETTINGS,
		PROVIDER_COMPONENT_MAP,
		dropdownValueToModelConfig,
		modelConfigToDropdownOptions,
		modelConfigToDropdownValue,
	} from "src/utils/model-selector"
	import { appStore } from "src/utils/obsidian"
	import { mount, unmount } from "svelte"

	let {
		initialValue,
		onChange,
	}: {
		initialValue: ModelConfiguration
		onChange: (config: ModelConfiguration) => void
	} = $props()

	const options = modelConfigToDropdownOptions(MODEL_CONFIGS)
	let selectedValue = $state(modelConfigToDropdownValue(initialValue))

	$effect(() => {
		selectedValue = modelConfigToDropdownValue(initialValue)
	})

	const handleChange = (newValue: string) => {
		const modelConfig = dropdownValueToModelConfig(MODEL_CONFIGS, newValue)
		if (modelConfig) {
			onChange(modelConfig)
		} else if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(newValue as Provider)) {
			// TODO: this is incorrect, the selected new config is persisted inside the dialog and
			// we never get notified about it.
			openProviderSettingsModal(newValue as Provider)
		}
	}

	const openProviderSettingsModal = (provider: Provider) => {
		const modal = new Modal($appStore)
		modal.setTitle(`${provider} settings`)
		const closeDialog = () => modal.close()

		const component = PROVIDER_COMPONENT_MAP.get(provider)
		if (!component) {
			console.error(`No component found for provider: ${provider}`)
			return
		}

		const componentInstance = mount(component, {
			target: modal.contentEl,
			props: {
				currentModel: null,
				feature: "questionAndAnswer",
				closeDialog,
			},
		})
		modal.onClose = () => unmount(componentInstance)
		modal.open()
	}
</script>

<select
	class="dropdown border-border! h-fit! max-w-32! truncate rounded! border! p-0! py-0.5! pr-4! pl-1! text-xs! !shadow-none hover:shadow-none"
	bind:value={selectedValue}
	onchange={(e) => handleChange((e.target as HTMLSelectElement).value)}
>
	{#each Object.entries(options) as [id, label]}
		<option value={id}>{label}</option>
	{/each}
</select>
