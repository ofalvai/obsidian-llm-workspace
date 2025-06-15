<script lang="ts">
	export let title: string = "Something went wrong"
	export let body: string
</script>

<div class="bg-error text-on-accent mt-2 mb-2 rounded p-2">
	<div class="font-medium">{title}</div>
	<div class="pt-1 text-sm">{body}</div>
</div>
