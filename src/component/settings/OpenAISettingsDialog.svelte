<script lang="ts">
	let {
		doModelSelection,
		onModelSelected,
	}: {
		doModelSelection: boolean
		onModelSelected: (model: string) => void
	} = $props()

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

	const onSave = () => {}
</script>

<input placeholder="API key" bind:value={apiKey} />

<button onclick={() => testConnection()}>Test connection</button>

{#if connectionState === "loading"}
	<p>Loading...</p>
{:else if connectionState === "error"}
	<p>Error: {error}</p>
{/if}

<button onclick={onSave}>Save</button>

<p>Important notes:</p>
