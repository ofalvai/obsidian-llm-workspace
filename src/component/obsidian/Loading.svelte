<script lang="ts">
	let {
		size = "m",
	}: {
		// https://docs.obsidian.md/Reference/CSS+variables/Foundations/Icons#Icon%20sizes
		size: "xs" | "s" | "m" | "l" | "xl"
	} = $props()
</script>

<svg
	version="1.1"
	id="L5"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	x="0px"
	y="0px"
	viewBox="0 0 100 100"
	enable-background="new 0 0 0 0"
	xml:space="preserve"
	class="size-{size}"
>
	<circle fill="var(--text-normal)" stroke="none" cx="6" cy="50" r="6">
		<animateTransform
			attributeName="transform"
			dur="1s"
			type="translate"
			values="0 15 ; 0 -15; 0 15"
			repeatCount="indefinite"
			begin="0.1"
		></animateTransform>
	</circle>
	<circle fill="var(--text-normal)" stroke="none" cx="30" cy="50" r="6">
		<animateTransform
			attributeName="transform"
			dur="1s"
			type="translate"
			values="0 10 ; 0 -10; 0 10"
			repeatCount="indefinite"
			begin="0.2"
		></animateTransform>
	</circle>
	<circle fill="var(--text-normal)" stroke="none" cx="54" cy="50" r="6">
		<animateTransform
			attributeName="transform"
			dur="1s"
			type="translate"
			values="0 5 ; 0 -5; 0 5"
			repeatCount="indefinite"
			begin="0.3"
		></animateTransform>
	</circle>
</svg>

<style>
	svg.size-xs {
		width: var(--icon-xs);
		height: var(--icon-xs);
	}
	svg.size-s {
		width: var(--icon-s);
		height: var(--icon-s);
	}
	svg.size-m {
		width: var(--icon-m);
		height: var(--icon-m);
	}
	svg.size-l {
		width: var(--icon-l);
		height: var(--icon-l);
	}
	svg.size-xl {
		width: var(--icon-xl);
		height: var(--icon-xl);
	}
</style>
