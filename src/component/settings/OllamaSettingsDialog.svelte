<script lang="ts">
	import type { ModelConfiguration } from "src/config/settings"
	import { listLoadableModels } from "src/rag/llm/ollama/models"
	import { pluginStore } from "src/utils/obsidian"
	import { slide } from "svelte/transition"
	import ErrorComponent from "../ErrorComponent.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import type { DialogProps } from "./types"
	import { onMount } from "svelte"

	let { currentModel, feature, closeDialog }: DialogProps = $props()

	let url = $state("http://localhost:11434")
	let selectedModel = $state(currentModel ?? "")

	let loading = $state(false)
	let localModels: string[] | null = $state(null)
	let loadError: string | null = $state(null)

	onMount(() => {
		if (url && url != "") {
			// Pre-populate model list if a URL is already set
			testConnection()
		}
	})

	const testConnection = async () => {
		try {
			loading = true
			loadError = null
			localModels = []
			const models = await listLoadableModels(url)
			localModels = models.models.map((m) => m.name)

			if (models.models.length === 1) {
				selectedModel = models.models[0].name
			}
		} catch (e: any) {
			localModels = []
			loadError = e.toString()
		} finally {
			loading = false
		}
	}

	const saveSettings = () => {
		$pluginStore.settings = {
			...$pluginStore.settings,
			providerSettings: {
				...$pluginStore.settings.providerSettings,
				ollama: {
					url,
				},
			},
		}

		if (feature) {
			const newConfig: ModelConfiguration = {
				provider: "Ollama",
				model: selectedModel,
			}
			switch (feature) {
				case "questionAndAnswer":
					$pluginStore.settings = {
						...$pluginStore.settings,
						questionAndAnswerModel: newConfig,
					}
					break
				case "noteContext":
					$pluginStore.settings = {
						...$pluginStore.settings,
						noteContextModel: newConfig,
					}
					break
				case "embedding":
					$pluginStore.settings = {
						...$pluginStore.settings,
						embeddingModel: newConfig,
					}
					break
				default:
					throw new Error("Tried to save settings for unknown feature: " + feature)
			}
		}

		$pluginStore.saveSettings()

		closeDialog()
	}
</script>

<div>
	<label for="url" class="mb-2 block font-medium">Server URL</label>
	<input id="url" class="w-80" type="text" placeholder="Server URL" bind:value={url} />
	<button class="ml-4" onclick={() => testConnection()}>
		{#if feature}
			List models
		{:else}
			Test connection
		{/if}
	</button>
	{#if localModels && localModels.length === 0}
		<div class="my-4">
			No models found. Make sure your Ollama instance has some models downloaded.
		</div>
	{:else if localModels && localModels.length > 0}
		<ObsidianIcon iconId="check" size="l" color="success" className="ml-2 relative top-1" />
	{/if}

	{#if loading}
		<Loading size="s" />
	{:else if loadError !== null}
		<div class="my-4">
			<ErrorComponent title="Connection error" body={loadError} />
		</div>
	{/if}

	{#if feature}
		<label for="model" class="mt-4 mb-2 block font-medium">
			{#if feature === "questionAndAnswer"}
				Model for conversations
			{:else if feature === "noteContext"}
				Model for note context
			{:else if feature === "embedding"}
				Model for embeddings
			{/if}
		</label>
		<input id="model" class="w-80" type="text" placeholder="Model" bind:value={selectedModel} />
		<button class="mod-cta ml-4" onclick={saveSettings} disabled={selectedModel.trim() === ""}
			>Select model
		</button>

		{#if localModels && localModels.length > 1}
			<div class="text-sm" transition:slide={{ axis: "y", duration: 200 }}>
				<p>Available models:</p>
				<ul>
					{#each localModels as model}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<li
							class="my-1 cursor-pointer font-mono select-text"
							onclick={() => (selectedModel = model)}
						>
							{model}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<div class="text-sm">
	<p>
		You can customize model-specific settings in the <a
			href="https://github.com/ollama/ollama/blob/main/docs/modelfile.md#parameter"
			>Ollama Modelfile</a
		>. The following parameters are sent in LLM requests:
	</p>
	<ul>
		<li><code>temperature</code></li>
		<li><code>num_predict</code></li>
	</ul>
</div>
