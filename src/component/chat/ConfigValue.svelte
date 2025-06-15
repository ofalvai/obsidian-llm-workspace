<script lang="ts">
	import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"

	let {
		iconId,
		label,
		value,
	}: {
		iconId: string
		label: string
		value: string
	} = $props()
</script>

<div class="my-2 flex flex-row">
	<div>
		<ObsidianIcon {iconId} size="s" />
	</div>
	<div class="text-muted mr-1 ml-1 text-sm">{label}:</div>
	<div class="text-sm">{value}</div>
</div>
