<script lang="ts">
	import { listLoadableModels } from "src/rag/llm/ollama/models"
	import { pluginStore } from "src/utils/obsidian"
	import Error from "../Error.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	let {
		currentModel,
		doModelSelection,
		closeDialog,
	}: {
		currentModel: string | null
		doModelSelection: boolean
		closeDialog: () => void
	} = $props()

	let url = $state("http://localhost:11434")
	let selectedModel = $state(currentModel ?? "")

	let loading = $state(false)
	let localModels: string[] = $state([])
	let loadError: string | null = $state(null)

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
				Ollama: {
					url,
				},
			},
		}

		if (doModelSelection) {
			$pluginStore.settings = {
				...$pluginStore.settings,
				// TODO:
				questionAndAnswerModel: {
					provider: "Ollama",
					model: selectedModel,
				},
			}
		}

		$pluginStore.saveSettings()

		closeDialog()
	}

	// If too many requests are sent to the server, it will respond with a 503 error indicating the server is overloaded. You can adjust how many requests may be queue by setting OLLAMA_MAX_QUEUE.
</script>

<div>
	<label for="url" class="mb-2 block font-medium">Server URL</label>
	<input id="url" type="text" placeholder="Server URL" bind:value={url} />
	<button class="ml-4" onclick={() => testConnection()}> Test connection </button>
	{#if localModels.length > 0}
		<ObsidianIcon iconId="check" size="l" color="success" className="ml-2 relative top-1" />
	{/if}

	{#if loading}
		<Loading size="s" />
	{:else if loadError !== null}
		<div class="my-4">
			<Error title="Connection error" body={loadError} />
		</div>
	{/if}

	{#if doModelSelection}
		<label for="model" class="mb-2 mt-4 block font-medium">Model</label>
		<input id="model" type="text" placeholder="Model" bind:value={selectedModel} />
		<button class="mod-cta ml-4" onclick={saveSettings} disabled={selectedModel.trim() === ""}
			>Select model
		</button>

		{#if localModels.length > 1}
			<p>Available models:</p>
			<ul>
				{#each localModels as model}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<li
						class="cursor-pointer select-text font-mono"
						onclick={() => (selectedModel = model)}
					>
						{model}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<p>Important notes:</p>

<p>Options sent for each request:</p>
<ul>
	<li>temperature</li>
	<li>maxTokens</li>
</ul>
