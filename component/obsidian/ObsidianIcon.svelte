<script lang="ts">
	import { setIcon } from "obsidian"

	export let iconId: string
	export let className: string = ""

	// https://docs.obsidian.md/Reference/CSS+variables/Foundations/Icons#Icon%20sizes
	export let size: "xs" | "s" | "m" | "l" | "xl" = "m"

	// https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors#Semantic%20colors
	export let color: "muted" | "normal" | "error" | "success" = "muted"

	let el: HTMLElement | undefined

	$: {
		if (el) {
			el.replaceChildren()
			setIcon(el, iconId)
		}
	}
</script>

<span bind:this={el} class={`size-${size} color-${color} ${className}`}></span>

<style>
	span {
		display: inline-flex;
		justify-content: center;
		align-items: center;

		color: var(--icon-color);
	}
	span.size-xs {
		--icon-size: var(--icon-xs);
		--icon-stroke: var(--icon-xs-stroke-width);
	}
	span.size-s {
		--icon-size: var(--icon-s);
		--icon-stroke: var(--icon-s-stroke-width);
	}
	span.size-m {
		--icon-size: var(--icon-m);
		--icon-stroke: var(--icon-m-stroke-width);
	}
	span.size-l {
		--icon-size: var(--icon-l);
		--icon-stroke: var(--icon-l-stroke-width);
	}
	span.size-xl {
		--icon-size: var(--icon-xl);
		--icon-stroke: var(--icon-xl-stroke-width);
	}
	span.color-muted {
		--icon-color: var(--text-muted);
	}
	span.color-normal {
		--icon-color: var(--text-normal);
	}
	span.color-error {
		--icon-color: var(--background-modifier-error);
	}
	span.color-success {
		--icon-color: var(--background-modifier-success);
	}
</style>
