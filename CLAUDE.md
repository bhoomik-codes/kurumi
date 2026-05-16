# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KURUMI is a fully offline, privacy-first desktop application for running large language models locally. It's built with Electron, React, TypeScript, and connects to Ollama for local AI inference. The app features a "Cursed Blood" dark theme with glassmorphism UI, real-time streaming chat, model management, and document RAG capabilities.

## Development Commands

### Core Development
```bash
# Start development server (Electron + Vite)
npm run dev

# Build for production
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Prerequisites
- Node.js 20+
- Ollama running locally (`ollama serve`)
- At least one LLM installed (`ollama pull llama3.2:3b`)

## Architecture Overview

### Electron Process Structure
The app follows a standard Electron multi-process architecture:

**Main Process** (`electron/main.ts`):
- Creates BrowserWindow with frameless design
- Registers all IPC handlers
- Manages app lifecycle and window controls
- Configures CSP for security

**Preload Script** (`electron/preload.ts`):
- Exposes secure IPC bridge via `contextBridge`
- Provides `window.electron` API with `invoke`, `send`, `on`, `off` methods

**Renderer Process** (`src/`):
- React frontend with TypeScript
- Communicates with main process via exposed IPC bridge

### IPC Communication Pattern

The app uses a consistent IPC pattern:

**Main Process** (`electron/ipc/*.ipc.ts`):
```typescript
// For async operations (request/response)
ipcMain.handle('channel:name', async (event, args) => {
  // Process and return result
})

// For streaming operations (fire-and-forget with events)
ipcMain.on('channel:start', (event, args) => {
  // Stream results via event.sender.send()
  event.sender.send('channel:chunk', data)
  event.sender.send('channel:done', finalData)
})
```

**Renderer Process**:
```typescript
// For async operations
const result = await window.electron.invoke('channel:name', args)

// For streaming operations
window.electron.send('channel:start', args)
window.electron.on('channel:chunk', (event, data) => {
  // Handle streaming data
})
```

### Key IPC Handlers

- `ollama.ipc.ts`: Chat streaming, model management, pull/delete operations
- `sqlite.ipc.ts`: Conversation/message CRUD, full-text search, settings storage
- `store.ipc.ts`: Ollama library browsing, HuggingFace integration
- `rag.ipc.ts`: Document indexing and vector search
- `system.ipc.ts`: System information and hardware monitoring
- `nvidia.ipc.ts`: NVIDIA API integration for cloud models

### Database Schema

SQLite database (`kurumi.db`) with FTS5 full-text search:

**Core Tables**:
- `conversations`: Chat sessions with metadata
- `messages`: Individual messages with role, content, timing
- `messages_fts`: FTS5 virtual table for content search
- `documents`: Uploaded files for RAG
- `document_chunks`: Text chunks with embeddings
- `settings`: Key-value configuration storage

**Important**: The database uses triggers to keep FTS5 index synchronized with message changes.

### State Management

Zustand stores manage frontend state:

**chatStore.ts**: Conversations, messages, streaming state
**modelStore.ts**: Available models, active model, warming state
**settingsStore.ts**: App preferences, model parameters, API keys

### Streaming Architecture

Chat streaming uses a dual-channel approach:

1. **Request**: Send via `window.electron.send('ollama:chat:stream', {messages, model, options, replyId})`
2. **Chunks**: Receive via `window.electron.on('ollama:chat:chunk:${replyId}', handler)`
3. **Completion**: Receive via `window.electron.on('ollama:chat:done:${replyId}', handler)`

The `replyId` ensures proper message routing in concurrent scenarios.

### Ollama Integration

**OllamaService** (`electron/services/OllamaService.ts`):
- Base URL: `http://localhost:11434`
- Provides streaming chat via async generator
- Filters embedding models from model list
- Supports model warmup and abort operations

**Important**: The service automatically excludes embedding models (nomic-bert, clip, etc.) from the chat model selector.

### RAG System

Document processing pipeline:
1. Upload documents via `Documents.tsx`
2. Process in `DocumentService.ts` (chunking, embedding)
3. Store chunks with embeddings in `document_chunks` table
4. Retrieve relevant chunks via vector similarity search
5. Inject context into system prompt during chat

### Security Considerations

- CSP configured in `main.ts` with different policies for dev/prod
- `contextIsolation: true` and `nodeIntegration: false` in webPreferences
- All database operations in main process only
- API keys stored in encrypted settings (not in code)

## Key File Locations

**Electron Main Process**:
- `electron/main.ts` - App entry point, window creation
- `electron/preload.ts` - IPC bridge
- `electron/services/` - Business logic (OllamaService, DatabaseService, etc.)
- `electron/ipc/` - IPC handlers organized by domain

**React Frontend**:
- `src/App.tsx` - Main app with routing
- `src/pages/` - Page components (Chat, Models, Documents, etc.)
- `src/components/` - Reusable UI components
- `src/stores/` - Zustand state management
- `src/constants/` - System prompts and configuration

**Configuration**:
- `vite.config.ts` - Build configuration with Electron plugins
- `electron-builder.config.js` - Packaging configuration
- `tailwind.config.ts` - Styling configuration

## Development Patterns

### Adding New IPC Handlers

1. Create handler in `electron/ipc/[domain].ipc.ts`
2. Register in `electron/main.ts` app lifecycle
3. Add types to preload if needed
4. Use from renderer via `window.electron.invoke()` or `window.electron.send()`

### Database Migrations

When modifying schema:
1. Update `initSchema()` in `DatabaseService.ts`
2. Consider migration strategy for existing databases
3. Test with fresh database

### Adding New Pages

1. Create component in `src/pages/[PageName].tsx`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/layout/Sidebar.tsx`

### Styling Conventions

- Use Tailwind utility classes
- Follow "Cursed Blood" theme (deep reds, glassmorphism)
- Custom colors defined in `tailwind.config.ts`
- Glass panels use `backdrop-blur` and semi-transparent backgrounds

## Testing

Currently no automated tests are configured. Manual testing should cover:
- Chat streaming with different models
- Model installation and deletion
- Document upload and RAG retrieval
- Settings persistence
- Window controls and navigation

## Build Process

The app uses Vite with `vite-plugin-electron` for development and `electron-builder` for packaging. Build outputs:
- `dist/` - Production build artifacts
- `dist-electron/` - Electron main process build

## Common Issues

**Ollama connection failed**: Ensure Ollama is running (`ollama serve`) and accessible at `http://localhost:11434`

**Database locked**: SQLite is single-writer; avoid concurrent write operations

**Streaming interruptions**: Check `replyId` routing and cleanup event listeners on component unmount

**CSP violations**: Development mode has relaxed CSP; production CSP is stricter