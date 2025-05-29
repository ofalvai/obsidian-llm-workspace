<script lang="ts">
	import { pluginStore } from "src/utils/obsidian"
	import type { DialogProps } from "./types"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ErrorComponent from "../ErrorComponent.svelte"
	import Loading from "../obsidian/Loading.svelte"
	import { listAvailableModels, testConnection } from "src/rag/llm/openai"
	import { slide } from "svelte/transition"
	import type { ModelConfiguration } from "src/config/settings"
	import { onMount } from "svelte"

	let { currentModel, feature, closeDialog }: DialogProps = $props()

	let baseUrl = $state($pluginStore.settings.providerSettings.openaiCompatible?.baseUrl ?? "")
	let apiKey = $state($pluginStore.settings.providerSettings.openaiCompatible?.apiKey ?? "")
	let selectedModel = $state(currentModel ?? "")

	let connectionState: "idle" | "loading" | "success" | "error" = $state("idle")
	let error = $state<string | null>(null)
	let availableModels: string[] | null = $state(null)

	onMount(() => {
		if (baseUrl && baseUrl !== "") {
			// Pre-populate model list if URL is already set
			_testConnection()
		}
	})

	const _testConnection = async () => {
		try {
			const success = await testConnection(apiKey, baseUrl)
			if (success) {
				// Then get available models
				const models = await listAvailableModels(baseUrl, apiKey)
				availableModels = models
				connectionState = "success"

				if (models.length === 1) {
					selectedModel = models[0]
				}
			} else {
				connectionState = "error"
				error = "API connection successful, but no models found"
			}
		} catch (e: any) {
			connectionState = "error"
			error = e instanceof Error ? e.message : String(e)
		}
	}

	const saveSettings = () => {
		$pluginStore.settings = {
			...$pluginStore.settings,
			providerSettings: {
				...$pluginStore.settings.providerSettings,
				openaiCompatible: {
					baseUrl,
					apiKey,
				},
			},
		}

		if (feature) {
			const newConfig: ModelConfiguration = {
				provider: "OpenAI-compatible",
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
	<label for="base-url" class="mb-2 block font-medium">Base URL</label>
	<input
		id="base-url"
		class="w-80"
		type="text"
		placeholder="https://api.example.com/v1"
		bind:value={baseUrl}
	/>

	<label for="api-key" class="mt-4 mb-2 block font-medium">API Key</label>
	<input type="password" id="api-key" class="w-80" placeholder="API key" bind:value={apiKey} />

	<button class="mr-4 ml-4" onclick={() => _testConnection()}>
		{#if feature}
			List models
		{:else}
			Test connection
		{/if}
	</button>

	{#if connectionState === "success"}
		<ObsidianIcon iconId="check" size="l" color="success" className="relative top-1" />
	{:else if connectionState === "error"}
		<div class="my-4">
			<ErrorComponent title="Connection error" body={error ?? "Unknown error"} />
		</div>
	{:else if connectionState === "loading"}
		<Loading size="s" />
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

		{#if availableModels && availableModels.length > 1}
			<div class="text-sm" transition:slide={{ axis: "y", duration: 200 }}>
				<p>Available models:</p>
				<ul>
					{#each availableModels as model}
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

	<div class="mt-4 text-sm">
		<p>This provider connects to any API that implements the OpenAI-compatible interface.</p>
		<p>API key might be optional depending on the server implementation.</p>
		<p>The API must support the following endpoints:</p>
		<ul>
			<li><code>/v1/models</code> - For listing available models</li>
			<li><code>/v1/chat/completions</code> - For chat completions</li>
			<li><code>/v1/embeddings</code> - For embeddings</li>
		</ul>
		<p>The <code>/v1/chat/completions</code> endpoint must support <code>response_format: json_object</code> for some features to work.</p>
	</div>
	{#if !feature}
		<div class="mt-4 flex justify-end">
			<button onclick={saveSettings}>Save API credentials</button>
		</div>
	{/if}
</div>
