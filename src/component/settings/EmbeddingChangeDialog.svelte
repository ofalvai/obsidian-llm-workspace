<script module lang="ts">
	import type { ModelConfiguration } from "src/config/settings"
	import type { VectorStoreStats } from "src/rag/vectorstore"

	export interface DialogProps {
		stats: VectorStoreStats
		currentModelConfig: ModelConfiguration
		onConfirm: () => void
	}
</script>

<script lang="ts">
	let { stats, currentModelConfig, onConfirm }: DialogProps = $props()
</script>

<div>
	<p>
		If you change the embedding model, all existing embeddings will be cleared and you will need
		to re-process your notes.
	</p>
	<table class="table-auto border-spacing-2 text-sm">
		<tbody>
			<tr>
				<td>Current embedding model:</td>
				<td class="font-bold">{currentModelConfig.provider} {currentModelConfig.model}</td>
			</tr>
			<tr>
				<td>Number of processed note chunks:</td>
				<td class="font-bold">{stats.nodeCount}</td>
			</tr>
			<tr>
				<td>Number of workspaces:</td>
				<td class="font-bold">{stats.workspaceCount}</td>
			</tr>
		</tbody>
	</table>
	<p>Are you sure you want to continue?</p>
	<button class="mod-destructive" onclick={onConfirm}
		>Clear all embeddings and change model</button
	>
</div>
