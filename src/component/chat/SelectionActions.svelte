<script lang="ts">
    import ObsidianIcon from "../obsidian/ObsidianIcon.svelte"
    import type { TextActionConfig } from "src/types/TextAction"

    let {
        text,
        position,
        actionConfig
    }: {
        text: string
        position: { x: number; y: number }
        actionConfig: TextActionConfig
    } = $props()
</script>

<div
    class="selection-actions absolute bg-background-primary border border-border rounded-md shadow-md p-1 flex gap-1"
    style="left: {position.x}px; top: {position.y}px;"
>
    {#each Object.entries(actionConfig) as [action, config]}
        <button
            class="p-1 rounded hover:bg-background-secondary"
            on:click={() => config.handler(text)}
        >
            <ObsidianIcon
                iconId={config.icon ?? ""}
                size="s"
            />
        </button>
    {/each}
</div>
