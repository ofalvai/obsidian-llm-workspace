<script lang="ts">
	export let title: string = "Something went wrong"
	export let body: string
</script>

<div class="rounded bg-error mt-2 mb-2 p-2 text-on-accent">
	<div class="font-medium">{title}</div>
	<div class="text-sm pt-1">{body}</div>
</div>
