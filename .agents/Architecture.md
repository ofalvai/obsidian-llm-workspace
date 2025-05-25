# Plugin architecture

## Development Commands

### Building and Development
- `pnpm dev` - Start development with watch mode using esbuild
- `pnpm build` - Build for production (includes TypeScript type checking)
- `pnpm lint` - Run ESLint on TypeScript and Svelte files
- `pnpm format` - Format code using Prettier

### Testing
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm test:ui` - Run tests with UI interface
- `pnpm test:coverage` - Run tests with coverage report
- Uses Vitest as the testing framework with TypeScript support

### Package Management
- Uses `pnpm` as the package manager (version 9.6.0)
- `pnpm install` - Install dependencies

## Architecture Overview

### Plugin Structure
This is an Obsidian plugin that implements LLM-powered workspace chat and note context features using a RAG (Retrieval-Augmented Generation) architecture.

**Main Plugin Entry**: `src/main.ts` - `LlmPlugin` class extends Obsidian's Plugin class and manages:
- Three main view types: WorkspaceView, NoteChatView, and NoteContextView
- Database initialization via `LlmDexie` (Dexie-based IndexedDB wrapper)
- Note reconciliation system that tracks file changes
- Settings management with provider-specific configurations

### Build System
- Uses esbuild with Svelte compilation
- PostCSS with Tailwind CSS processing
- TypeScript with strict null checks
- Outputs to `main.js` and `styles.css` for Obsidian plugin loading

