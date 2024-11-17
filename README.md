# Obsidian LLM Workspace

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

### Why make another AI plugin?
- This plugin focuses on a specific 
- Because it's fun to build tools for my own needs! :)

### Goals
- Integrate LLMs into the Obsidian vault, not the other way around (copy-pasting snippets in and out of ChatGPT)
- Enable granular control, tweaking and transparency: choose from multiple models and LLM providers, customize prompts, and debug responses.
- Native to Obsidian, not just a ChatGPT clone inside the Obsidian window
- Great UX

### Non-goals
- Integrate LLMs into Obsidian in every possible way. There are existing plugins for many use-cases, such as generating notes or auto-tagging notes.
- Indexing and retrieval for the entire vault. 

### Get started

#### Supported LLM APIs
#### Recommended plugins
These plugins work well together with LLM workspace and make the experience even better:

- [Folder notes](https://github.com/LostPaul/obsidian-folder-notes): blurs the line between a folder and a note in the file tree, a note can have child notes like in Notion. Combined with this plugin, an LLM workspace can be a folder with notes inside.
- [Waypoint](https://github.com/IdreesInc/Waypoint): generates a table of contents with links to other notes. Combined with Folder notes and LLM workspace, it maintains links to notes in the LLM workspace folder.

#### Advanced usage

##### Prompt library

You can set up a folder as a prompt library, then collect prompts as files there. Insert prompts to the chat input by typing `@`.

##### 


##### Note context sidebar



### Current limitations
- Plugin only handles Markdown files. There is no support for images, PDFs or canvases for now.
- 


### Additional details
- You can review all prompts [here](https://github.com/ofalvai/obsidian-llm-workspace/blob/main/src/config/prompts.ts)

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
- [Cohere's document chat](https://cohere.com/chat) with grounding

### Built with
- [Svelte 5](https://svelte.dev/)
- [Dexie](https://dexie.org/)
- 
