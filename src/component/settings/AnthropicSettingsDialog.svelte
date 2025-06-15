<script lang="ts">
	import { pluginStore } from "src/utils/obsidian"
	import type { DialogProps } from "./types"
	import { testConnection } from "src/rag/llm/anthropic"
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
	import ErrorComponent from "../ErrorComponent.svelte"
	import Loading from "../obsidian/Loading.svelte"

	let { closeDialog }: DialogProps = $props()

	let apiKey = $state($pluginStore.settings.providerSettings.anthropic?.apiKey ?? "")
	let connectionState: "idle" | "loading" | "success" | "error" = $state("idle")
	let error = $state<string | null>(null)

	const _testConnection = async () => {
		try {
			connectionState = "loading"
			error = null
			const models = await testConnection(apiKey)
			if (models) {
				connectionState = "success"
			} else {
				connectionState = "error"
				error = "API connection successful, but no models found"
			}
		} catch (e: any) {
			connectionState = "error"
			error = e.toString()
		}
	}

	const saveSettings = () => {
		$pluginStore.settings = {
			...$pluginStore.settings,
			providerSettings: {
				...$pluginStore.settings.providerSettings,
				anthropic: {
					apiKey,
				},
			},
		}

		$pluginStore.saveSettings()

		closeDialog()
	}
</script>

<div>
	<label for="key" class="mb-2 block font-medium">API key</label>
	<input type="password" id="key" class="w-80" placeholder="API key" bind:value={apiKey} />
	<button class="mr-4 ml-4" onclick={() => _testConnection()}>Test connection</button>
	{#if connectionState === "success"}
		<ObsidianIcon iconId="check" size="l" color="success" className="relative top-1" />
	{:else if connectionState === "error"}
		<div class="my-4">
			<ErrorComponent title="Connection error" body={error ?? "Unknown error"} />
		</div>
	{:else if connectionState === "loading"}
		<Loading size="s" />
	{/if}

	<div class="mt-4 text-sm">
		Create a key at <a href="https://console.anthropic.com/">console.anthropic.com</a>.
	</div>

	<div class="mt-4 flex justify-end">
		<button onclick={saveSettings}>Save</button>
	</div>
</div>
