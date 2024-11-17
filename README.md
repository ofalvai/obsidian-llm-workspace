# Obsidian LLM Workspace

### Quick demo

Let's create a new LLM workspace. A workspace is just a regular note with links to other notes.

![Create workspace](https://github.com/user-attachments/assets/3e5d7515-5d7c-47c8-bc98-9eafe43e2fa4)

The workspace view opens side-by-side to the notes. Let's index all information in the workspace. Behind the scenes, this creates the typical [RAG](https://en.m.wikipedia.org/wiki/Retrieval-augmented_generation) setup by chunking documents and computing embeddings for them:

![Open and index](./docs/1%20Open%20and%20index.mp4)

We can start a conversation right away, but it's also possible to generate exploratory questions:

![Explore](./docs/2%20Explore.mp4)

A conversation is always grounded in the workspace sources and you can debug RAG pipeline:

![Debug](./docs/3%20Debug.mp4)

You can also chat with a single note (without creating a workspace) and attach more context gradually:

![Single note](./docs/4%20Single%20note.mp4)

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
