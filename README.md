# LLM Workspace plugin for Obsidian

### Quick demo

<details>
<summary>Click to expand</summary>
Let's create a new LLM workspace. A workspace is just a regular note with links to other notes.

https://github.com/user-attachments/assets/3e5d7515-5d7c-47c8-bc98-9eafe43e2fa4

The workspace view opens side-by-side to the notes. Let's index all information in the workspace. Behind the scenes, this creates the typical [RAG](https://en.m.wikipedia.org/wiki/Retrieval-augmented_generation) setup by chunking documents and computing embeddings for them:

https://github.com/user-attachments/assets/8a3c73f6-5789-4573-83a3-b8f9a07ec02f

We can start a conversation right away, but it's also possible to generate exploratory questions:

https://github.com/user-attachments/assets/3b82909e-128e-4d1b-a180-dd01e0e241a7

A conversation is always grounded in the workspace sources and you can debug RAG pipeline:

https://github.com/user-attachments/assets/488f79b1-d928-4249-8a01-e79de9f5997a

You can also chat with a single note (without creating a workspace) and attach more context gradually:

https://github.com/user-attachments/assets/2f4c4e88-81a1-4cda-ae05-b88a0988bd8c

</details>

### Why have another AI plugin for Obsidian?
- This plugin focuses on a specific way of AI integration: manually created source sets that an LLM chat is grounded in. It's both cheaper, faster, and more accurate than doing RAG over an entire vault (and we organize our notes anyway, right?!).
- I wanted something that is flexible, configurable, tweakable. AI progresses too fast anyway, I have no idea what's going to be the best setup tomorrow.
- Because it's always fun to build tools for my own needs!

### Goals
- Integrate LLMs into the Obsidian vault, not the other way around (copy-pasting snippets in and out of ChatGPT)
- Enable granular control, tweaking and transparency: choose from multiple models and LLM providers, customize prompts, and debug responses.
- Native to Obsidian, not just a ChatGPT clone inside the Obsidian window
- Great UX, efficient multitasking.

### Get started

This is a _bring your own API key_ kind of integration. The first step is to add an API key in the plugin settings and choose a model.

[This page](./docs/LLM%20providers.md) details the supported LLM providers and the various details of each integration.

The main plugin panel can be launched from the context menu entries, but the following commands are also available:

- Open active note as LLM workspace
- Chat with active note
- Open existing workspace
- Open context panel

### Recommended plugins
The following plugins work well together with LLM workspace and make the experience even better:

- [Folder notes](https://github.com/LostPaul/obsidian-folder-notes): blurs the line between a folder and a note in the file tree. A note can have child notes like in Notion and similar tools. Combined with this plugin, an LLM workspace can be a folder with notes inside.
- [Waypoint](https://github.com/IdreesInc/Waypoint): generates a table of contents with links to other notes. Combined with Folder notes and LLM workspace, it maintains links to notes in the LLM workspace folder.

### Advanced use

[Click here](./docs/Advanced%20use.md) for a list of advanced features and use cases.


### Current limitations
- The plugin only handles Markdown files for now. There is no support for images, PDFs or canvases.
- The chunking of notes is pretty naive and there is no token count validation (but models have huge context windows nowadays)


### Additional details

- This plugin makes network requests to external LLM APIs. You can view the API-related code [here](https://github.com/ofalvai/obsidian-llm-workspace/tree/main/src/rag/llm)
- You can review all LLM prompts [here](https://github.com/ofalvai/obsidian-llm-workspace/blob/main/src/config/prompts.ts)
- The RAG implementation is [here](https://github.com/ofalvai/obsidian-llm-workspace/tree/main/src/rag)

### Roadmap
- Change models and model parameters mid-conversation
- Tool use
- Chat history
- Better query understanding and planning
- Footnotes in LLM response
- More advanced ways for including notes in a workspace (Dataview integration maybe?)
- API cost estimation before heavy actions



### Prior work and inspiration
- [Google NotebookLM](https://notebooklm.google.com/)
- [Notion AI Q&A](https://www.notion.so/product/ai)
- [Cohere's document chat with grounding](https://cohere.com/chat)

### Built with
- [Svelte 5](https://svelte.dev/)
- [Dexie](https://dexie.org/)
- [Tailwind CSS](https://tailwindcss.com/)
