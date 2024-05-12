<script lang="ts">
	export let title: string = "Something went wrong"
	export let body: string
</script>

<div class="rounded bg-error p-2 text-on-accent">
	<p class="font-medium">{title}</p>
	<p class="text-sm">{body}</p>
</div>
