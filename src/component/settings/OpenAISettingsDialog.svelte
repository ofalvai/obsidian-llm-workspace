<script lang="ts">
	import { pluginStore } from "src/utils/obsidian"
	import type { DialogProps } from "./types"

	let { closeDialog }: DialogProps = $props()

	let apiKey = $state("")
	let connectionState: "idle" | "loading" | "success" | "error" = $state("idle")
	let error = $state<string | null>(null)

	const testConnection = async () => {
		try {
			connectionState = "loading"
			error = null
			// const models = await listLocalModels(url)
			connectionState = "success"
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
				openai: {
					apiKey,
				},
			},
		}

		$pluginStore.saveSettings()

		closeDialog()
	}
</script>

<input class="w-80" placeholder="API key" bind:value={apiKey} />

<button onclick={() => testConnection()}>Test connection</button>

{#if connectionState === "loading"}
	<p>Loading...</p>
{:else if connectionState === "error"}
	<p>Error: {error}</p>
{/if}

<button onclick={saveSettings}>Save</button>
