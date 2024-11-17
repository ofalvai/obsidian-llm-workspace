# Advanced use

### Prompt library

You can set up a folder as a prompt library, then collect prompts as standalone files there. Define that folder in the plugin settings as the prompt folder.
When writing a message, you can quickly insert prompts to the chat input by typing `@` and selecting a file from the folder.

### Note context panel

A panel can be pinned to the sidebar that provides additional details of the current note in focus:

![Panel screenshot](./Note%20context%20panel.png)

At the moment, it does two things:
1. Creates a summary
2. Extracts key topics. If a note with the given topic exists in the vault, it becomes a clickable link.

The outputs are lazily computed and cached. This means that no LLM call will be made if the panel is not visible, and the outputs are not re-generated after a focus change. You can click the re-generate button any time to recreate the outputs.

### Provide additional context

Adding workspace-specific context often improves the quality of chat responses. Use the `context` frontmatter property of the workspace file to add this information. Under the hood, it gets appended to the system prompt (which you can also customize in settings!).

![Workspace context screenshot](./Workspace%20context.png)

### RAG implementation details

Have a look at [the RAG implementation](https://github.com/ofalvai/obsidian-llm-workspace/tree/main/src/rag) if you want to know more about what is going on in the background.
