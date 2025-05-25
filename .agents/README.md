# README for LLM agents

See user-facing docs at the root README.md.

See overall architecture and dev workflow at [Architecture.md](./Architecture.md).

### Core Components

**RAG Pipeline** (`src/rag/`):
- `query-engine.ts` - Two query engine implementations:
  - `RetrieverQueryEngine` - For workspace-based RAG queries
  - `SingleNoteQueryEngine` - For single note conversations
- `vectorstore.ts` - Vector database operations using cosine similarity
- `retriever.ts` - Retrieves relevant nodes based on query embeddings
- `synthesizer.ts` - Generates responses using retrieved context

**Storage Layer** (`src/storage/`):
- `db.ts` - Dexie database schema with three tables:
  - `vectorStore` - Embeddings and nodes indexed by workspace
  - `noteDerivedData` - Note summaries and key topics
  - `workspace` - Workspace metadata and derived questions

**LLM Integration** (`src/rag/llm/`):
- Multi-provider support: OpenAI, Anthropic, Ollama
- Separate clients for chat completion and embeddings
- Provider-specific configuration in `src/config/providers.ts`

**UI Components** (`src/component/`):
- Built with Svelte 5 and Tailwind CSS
- Organized by feature: chat/, workspace/, settings/, obsidian/
- Main views handle workspace management, note chat, and context panels

### Key Features

**Workspace-based RAG**: Notes linked in a "workspace note" are indexed and used as context for LLM conversations.

**Note Context Panel**: Provides summaries and derived questions for individual notes.

**Multi-provider LLM Support**: Configurable models for different features (Q&A, note context, embeddings).

**File Reconciliation**: `src/utils/reconciler.ts` tracks Obsidian file changes and updates the vector store accordingly.

### Making changes

- Don't forget to update these docs if your changes involve some components listed here. Also don't forget to extend these docs with new information.
