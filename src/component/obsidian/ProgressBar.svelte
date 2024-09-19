<script lang="ts">
	import { ProgressBarComponent } from "obsidian"

	let {
		value,
		className = "",
	}: {
		value: number
		className?: string
	} = $props()

	let el: HTMLElement | undefined

	$effect(() => {
		if (el) {
			el.replaceChildren()
			new ProgressBarComponent(el).setValue(value)
		}
	})
</script>

<div bind:this={el} class={className}></div>
