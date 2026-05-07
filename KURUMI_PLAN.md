# KURUMI — Local LLM Desktop Client

## Complete Build Specification for Agentic Coding

---

> **Codename**: KURUMI (Kinetic Unified Runtime for Universal Model Interaction)
> **Type**: Offline-first desktop application (Electron + React + TypeScript)
> **Theme**: Neo-Glassmorphism · Dark Blood · Jujutsu Kaisen aesthetic
> **Target Platforms**: Windows 11, macOS 13+, Linux (Ubuntu 22+)

---

## 1. PROJECT OVERVIEW

KURUMI is a fully offline-capable desktop application that acts as a universal frontend for local LLMs (via Ollama), with first-class support for document ingestion, image generation, artifact rendering, and model management. The experience is designed to feel like a cursed energy–powered control room — deep crimson-blacks, ethereal glass layers, glowing red veins of light threading through the UI, inspired by the visual language of Jujutsu Kaisen.

---

## 2. TECHNOLOGY STACK

### Core Framework

| Layer | Technology | Reason |
|---|---|---|
| Desktop Shell | **Electron 30+** | Cross-platform native app, Node.js IPC |
| Frontend | **React 18 + TypeScript** | Component model, type safety |
| Build Tool | **Vite 5** | Fast HMR, ESBuild bundling |
| Styling | **Tailwind CSS 3 + CSS Modules** | Utility-first + scoped overrides |
| State Management | **Zustand 4** | Lightweight, no boilerplate |
| Routing | **React Router v6** | In-app navigation |
| IPC Bridge | **Electron contextBridge** | Secure renderer-to-main comms |

### AI / LLM Layer

| Component | Technology |
|---|---|
| Local Model Runtime | **Ollama** (bundled or system) |
| Ollama JS Client | `ollama` npm package |
| Embeddings / RAG | `@xenova/transformers` (local ONNX) |
| Vector Store | **LanceDB** (embedded, no server needed) |
| PDF Parsing | `pdf-parse` + `pdfjs-dist` |
| DOCX Parsing | `mammoth` |
| XLSX Parsing | `xlsx` (SheetJS) |
| Image Vision | Ollama multimodal models (llava, bakllava) |

### Image Generation

| Component | Technology |
|---|---|
| Stable Diffusion | **Automatic1111 REST API** (local) or **ComfyUI** |
| Fallback | **Fal.ai** local SDXL via `@fal-ai/client` |
| Image Storage | Local filesystem via Electron `userData` path |

### Rendering & Visualization

| Feature | Technology |
|---|---|
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| Code Syntax | `highlight.js` or `shiki` |
| Charts / Graphs | `recharts` + `d3` |
| Math | `KaTeX` via `rehype-katex` |
| Mermaid Diagrams | `mermaid` |
| Artifacts (React) | Sandboxed `iframe` + `@babel/standalone` |
| HTML Artifacts | `srcdoc` iframe sandbox |

### Data & Storage

| Purpose | Technology |
|---|---|
| App Config | `electron-store` (JSON, encrypted) |
| Chat History | **SQLite** via `better-sqlite3` |
| File Blobs | Local filesystem (`userData/attachments`) |
| Vector Index | LanceDB on `userData/vectorstore` |
| Model Metadata | SQLite table |

### UI Extras

| Feature | Technology |
|---|---|
| Animations | **Framer Motion 11** |
| Icons | `lucide-react` |
| Fonts | `Cinzel` (display) + `JetBrains Mono` + `Nunito` |
| Drag & Drop | `@dnd-kit/core` |
| Toasts | `sonner` |
| Modals | `@radix-ui/react-dialog` |
| Context Menus | `@radix-ui/react-context-menu` |
| Tooltips | `@radix-ui/react-tooltip` |
| Scrollbar | `overlayscrollbars-react` |

---

## 3. VISUAL DESIGN SYSTEM

### 3.1 Color Palette — "Cursed Blood"

```css
:root {
  /* Core Blacks */
  --bg-void:        #050305;   /* deepest background */
  --bg-abyss:       #0A0508;   /* main panels */
  --bg-dark:        #110810;   /* elevated surface */
  --bg-glass:       rgba(18, 6, 14, 0.72); /* glass panels */
  --bg-glass-hover: rgba(28, 10, 22, 0.85);

  /* Blood Reds */
  --red-core:       #8B0000;   /* dark red anchor */
  --red-bright:     #C41E3A;   /* crimson accent */
  --red-glow:       #FF2244;   /* neon red for glows */
  --red-muted:      #5C1A2A;   /* subtle highlights */
  --red-vein:       #991B1B;   /* border veins */

  /* Purples (cursed energy) */
  --purple-deep:    #1A0A2E;   /* dark purple tint */
  --purple-mid:     #4B0082;   /* indigo accent */
  --purple-glow:    #7B2FBE;   /* violet highlights */

  /* Text */
  --text-primary:   #F5E6E8;   /* warm near-white */
  --text-secondary: #B09098;   /* muted pinkish grey */
  --text-dim:       #6B4A52;   /* very muted */
  --text-accent:    #FF6B7A;   /* red-tinted links */

  /* Borders & Glows */
  --border-vein:    rgba(139, 0, 0, 0.4);
  --border-glass:   rgba(196, 30, 58, 0.2);
  --glow-red:       0 0 20px rgba(255, 34, 68, 0.3),
                    0 0 60px rgba(139, 0, 0, 0.15);
  --glow-subtle:    0 0 10px rgba(255, 34, 68, 0.15);

  /* Glass Effect */
  --glass-blur:     blur(16px) saturate(180%);
  --glass-border:   1px solid rgba(196, 30, 58, 0.25);
}
```

### 3.2 Glassmorphism Rules

Every panel MUST follow:

- `backdrop-filter: blur(16px) saturate(180%)`
- `background: var(--bg-glass)`
- `border: 1px solid rgba(196, 30, 58, 0.2)`
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), var(--glow-subtle)`
- Layered panels add depth via `translateZ` or `z-index` with progressively lighter glass backgrounds

### 3.3 Typography

```
Display:   'Cinzel' — for app name, section headers (Google Fonts)
Mono:      'JetBrains Mono' — code, model names, terminal outputs
Body:      'Nunito' — chat text, descriptions, labels
Accent:    'Cinzel Decorative' — badges, status labels
```

### 3.4 Decorative Elements

- **Blood vein borders**: thin `1px` lines with `box-shadow: 0 0 8px var(--red-vein)` along panel edges
- **Cursed energy shimmer**: `@keyframes cursedShimmer` — a red-to-purple gradient that slowly shifts across glass surfaces
- **Particle background**: 30–40 tiny red/crimson particles floating slowly in the background (Canvas or CSS)
- **Hexagonal grid overlay**: subtle `opacity: 0.03` hex pattern on background panels (SVG data URI)
- **Scanline overlay**: `opacity: 0.02` scanlines for depth on panels
- **Glow pulse on active elements**: `@keyframes glowPulse` — box-shadow oscillates on active states

---

## 4. APPLICATION STRUCTURE

### 4.1 Directory Layout

```
kurumi/
├── electron/
│   ├── main.ts                  # Main process entry
│   ├── preload.ts               # Context bridge / IPC exposure
│   ├── ipc/
│   │   ├── ollama.ipc.ts        # Ollama model management & streaming
│   │   ├── files.ipc.ts         # File parsing & attachment handling
│   │   ├── imagegen.ipc.ts      # SD/ComfyUI interface
│   │   ├── rag.ipc.ts           # Embedding & vector search
│   │   ├── sqlite.ipc.ts        # Chat history CRUD
│   │   └── system.ipc.ts        # System info, GPU, RAM
│   ├── services/
│   │   ├── OllamaService.ts     # Ollama HTTP client wrapper
│   │   ├── ParseService.ts      # PDF/DOCX/XLSX/image parsing
│   │   ├── EmbeddingService.ts  # Local embeddings via transformers.js
│   │   ├── VectorStore.ts       # LanceDB CRUD
│   │   ├── ImageGenService.ts   # A1111 / ComfyUI bridge
│   │   └── DatabaseService.ts  # SQLite schema + queries
│   └── utils/
│       ├── fileUtils.ts
│       └── gpuDetect.ts
│
├── src/
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Root router
│   ├── styles/
│   │   ├── globals.css          # CSS variables, resets, scrollbars
│   │   ├── glass.css            # Glassmorphism utilities
│   │   ├── animations.css       # All keyframes
│   │   └── fonts.css            # Font imports
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Left nav: chats, models, settings
│   │   │   ├── TopBar.tsx          # Model switcher, status, controls
│   │   │   ├── StatusBar.tsx       # Bottom: GPU/RAM/model info
│   │   │   └── ParticleBackground.tsx
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx       # Main chat area
│   │   │   ├── MessageBubble.tsx    # Individual message renderer
│   │   │   ├── InputArea.tsx        # Prompt input + attachments
│   │   │   ├── AttachmentChip.tsx   # File attachment preview
│   │   │   ├── StreamingIndicator.tsx
│   │   │   └── TypingAnimation.tsx
│   │   │
│   │   ├── artifacts/
│   │   │   ├── ArtifactContainer.tsx   # Detects & routes artifact type
│   │   │   ├── CodeArtifact.tsx        # Syntax-highlighted code block
│   │   │   ├── ReactArtifact.tsx       # Sandboxed React runner
│   │   │   ├── HtmlArtifact.tsx        # srcdoc iframe
│   │   │   ├── ChartArtifact.tsx       # Recharts / D3 renderer
│   │   │   ├── MermaidArtifact.tsx     # Mermaid diagram
│   │   │   ├── MathArtifact.tsx        # KaTeX block
│   │   │   └── ImageArtifact.tsx       # Generated image display
│   │   │
│   │   ├── models/
│   │   │   ├── ModelSwitcher.tsx       # Quick-switch dropdown
│   │   │   ├── ModelCard.tsx           # Model info card
│   │   │   ├── ModelDownloader.tsx     # Pull model UI with progress
│   │   │   ├── ModelParameters.tsx     # Temp, top_p, ctx sliders
│   │   │   └── ModelBadge.tsx          # Type badges (vision, code, etc.)
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentUploader.tsx    # Drag & drop zone
│   │   │   ├── DocumentViewer.tsx      # Preview parsed doc
│   │   │   ├── RAGPanel.tsx            # Knowledge base manager
│   │   │   └── ChunkViewer.tsx         # Show retrieved chunks
│   │   │
│   │   ├── imagegen/
│   │   │   ├── ImageGenPanel.tsx       # SD prompt UI
│   │   │   ├── ImageGenSettings.tsx    # Steps, CFG, size, sampler
│   │   │   ├── GeneratedGallery.tsx    # Past generations grid
│   │   │   └── Img2ImgPanel.tsx        # Image-to-image
│   │   │
│   │   └── ui/
│   │       ├── GlassPanel.tsx          # Reusable glass container
│   │       ├── CursedButton.tsx        # Themed button variants
│   │       ├── CursedInput.tsx         # Themed input
│   │       ├── CursedSlider.tsx        # Styled range slider
│   │       ├── CursedSelect.tsx        # Styled select
│   │       ├── CursedBadge.tsx         # Status badge
│   │       ├── CursedProgress.tsx      # Download/gen progress bar
│   │       ├── SectionHeader.tsx       # Panel headers with vein lines
│   │       └── Spinner.tsx             # Cursed energy spinner
│   │
│   ├── pages/
│   │   ├── Chat.tsx             # Main chat interface
│   │   ├── Models.tsx           # Model library & management
│   │   ├── Documents.tsx        # Knowledge base / RAG
│   │   ├── ImageGen.tsx         # Image generation studio
│   │   ├── Settings.tsx         # App settings
│   │   └── SystemInfo.tsx       # GPU/RAM/Ollama status
│   │
│   ├── stores/
│   │   ├── chatStore.ts         # Chat sessions, messages
│   │   ├── modelStore.ts        # Available/active models
│   │   ├── settingsStore.ts     # User preferences
│   │   ├── documentStore.ts     # Uploaded docs, RAG state
│   │   └── imageGenStore.ts     # Generation history, settings
│   │
│   ├── hooks/
│   │   ├── useOllama.ts         # Streaming chat hook
│   │   ├── useModelPull.ts      # Download progress hook
│   │   ├── useRAG.ts            # Document QA hook
│   │   ├── useImageGen.ts       # SD generation hook
│   │   ├── useSystemStats.ts    # GPU/RAM polling hook
│   │   └── useHotkeys.ts        # Keyboard shortcuts
│   │
│   └── lib/
│       ├── ollamaClient.ts      # Frontend Ollama client
│       ├── artifactParser.ts    # Detect artifact type from response
│       ├── markdownProcessor.ts # Extended markdown pipeline
│       └── tokenCounter.ts      # Rough token estimation
│
├── electron-builder.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. FEATURE SPECIFICATIONS

### 5.1 Chat Interface

**Layout:**

- Left sidebar (260px): conversation list, pinned chats, folder grouping
- Center: chat messages with auto-scroll
- Right panel (optional, collapsible, 320px): context / RAG chunks / document preview
- Bottom: input area with toolbar

**Message Bubbles:**

- User messages: right-aligned, dark blood glass, red-vein left border
- Assistant messages: left-aligned, deeper glass, subtle purple tint
- System messages: centered, muted, italic
- Each bubble shows: model name badge, timestamp, token count (hover)
- Streaming: character-by-character with a pulsing cursor (`▊`)
- Copy button, regenerate button, edit button on hover

**Input Area:**

- Multiline `textarea` that auto-grows (max 300px)
- Toolbar below input: attach file, image gen mode, RAG toggle, voice input
- `Ctrl+Enter` to send, `Enter` for newline (configurable)
- Mention `@modelname` to inline-switch model mid-conversation
- Paste image from clipboard directly
- Shows active attachments as chips above input
- Token counter (estimated) shown live as user types

**Conversation Management:**

- Auto-title generation (first message summarized by LLM)
- Pin conversations
- Folders / tags
- Export to Markdown, PDF, JSON
- Search across all conversations (SQLite FTS)
- Branch conversations (fork from any message)

### 5.2 Model Management

**Model Switcher (TopBar):**

- Dropdown showing all pulled Ollama models
- Current model shown with badge (vision / code / instruct / base)
- One-click switch — context preserved, system prompt adjustable
- Shows model size, quantization, context window

**Models Page:**

- Grid of `ModelCard` components
  - Name, family (Llama, Mistral, Gemma, Qwen, etc.), size (GB), context window
  - Tags: `🔍 vision`, `💻 code`, `🌐 multilingual`, `⚡ fast`
  - Active indicator (glowing red border)
  - Delete button with confirmation
- Search / filter by family, size, capability
- "Explore" section: curated list of popular models from Ollama registry
  - Pulls model list from `https://ollama.com/library` (with offline fallback JSON)
  - Shows description, pull count, tags
  - One-click download with live progress bar (layers shown)

**Model Download Flow:**

```
User clicks "Pull" → IPC call to main → OllamaService.pull(modelName)
→ Streams pull events: { status, completed, total, digest }
→ Progress bar updates per layer
→ Toast on completion / error
→ Model appears in switcher immediately
```

**Model Parameters Panel (per conversation):**

- Temperature: 0.0 – 2.0 (slider)
- Top P: 0.0 – 1.0
- Top K: 1 – 100
- Repeat Penalty: 1.0 – 1.5
- Context Window: 512 – model max
- System Prompt editor (full-size textarea, Cinzel font)
- Seed (for reproducibility)
- Save as preset

### 5.3 Document Intelligence (RAG)

**Supported Formats:**

| Format | Parser | Notes |
|---|---|---|
| PDF | `pdfjs-dist` | Text + metadata extraction, page awareness |
| DOCX | `mammoth` | Preserves headings for chunking |
| XLSX / XLS | `xlsx` (SheetJS) | Converts sheets to structured text tables |
| CSV | Papa Parse | Treated as tabular context |
| TXT / MD | Native | Direct ingestion |
| Images (JPG/PNG/WEBP) | Ollama Vision | Describe image, embed description |
| PPTX | `pptx-extractor` or `node-pptx` | Extract slide text |

**RAG Pipeline:**

```
Upload file → ParseService extracts text
→ Chunk into ~512 token segments with overlap
→ EmbeddingService generates embeddings (local ONNX model: nomic-embed-text or all-MiniLM)
→ Store in LanceDB with metadata (filename, page, chunk_index)
→ On user query: embed query → similarity search top-K chunks
→ Inject chunks into system prompt as [CONTEXT] blocks
→ LLM answers grounded in retrieved context
```

**Knowledge Base Page:**

- List of all uploaded documents with status (indexed / pending / error)
- Per-document: name, size, chunk count, date added
- Delete document (removes chunks from vector store)
- "Ask this document" — creates a focused chat session
- Search within knowledge base
- Visual chunk explorer: see how a doc was chunked

**RAG Panel (in chat):**

- Toggle RAG on/off per message
- When enabled, shows which chunks were retrieved
- "Sources" section below assistant reply with document name + page

### 5.4 Image Generation

**Integration:**

- Primary: **Automatic1111 WebUI** (detect if running on localhost:7860)
- Secondary: **ComfyUI** (detect on localhost:8188) with a basic workflow JSON
- Tertiary: **Ollama** (if a diffusion-capable model is available in future)
- Settings page to configure endpoint URL

**Image Gen Panel (accessible from chat input and full page):**

- Prompt textarea (with magic wand button: "Enhance prompt with AI")
- Negative prompt textarea
- Settings: Width × Height (presets: 512², 768², 1024², custom), Steps (1–150), CFG Scale (1–20), Sampler dropdown, Seed
- Styles presets: Photorealistic, Anime, Oil Painting, Watercolor, Cyberpunk, etc.
- Generate button with progress indicator (% done)
- Generated image appears inline in chat or in gallery

**Img2Img:**

- Upload reference image
- Denoising strength slider
- Uses same prompt/settings

**Gallery:**

- Grid of all generated images
- Click to expand with full prompt metadata
- Copy prompt, send to img2img, delete, save to disk

### 5.5 Artifact System

When the model returns a response containing fenced code blocks tagged with specific artifact types, KURUMI renders them as live interactive artifacts.

**Detection Logic (`artifactParser.ts`):**

```typescript
// Detect artifact type from code fence language tag
// ```react  → ReactArtifact
// ```html   → HtmlArtifact
// ```chart  → ChartArtifact (JSON spec)
// ```mermaid → MermaidArtifact
// ```math   → MathArtifact
// ```svg    → Render inline SVG
// Default code blocks → CodeArtifact (syntax highlighted)
```

**ReactArtifact:**

- Uses `@babel/standalone` to transpile JSX in the browser
- Runs in sandboxed iframe with `srcdoc`
- Provides `React`, `ReactDOM`, `recharts` as globals
- "Open in editor" button to tweak and re-run
- Copy code, download as `.jsx`

**ChartArtifact:**

- LLM emits a JSON spec: `{ type: "bar"|"line"|"pie"|"scatter", data: [...], options: {...} }`
- KURUMI renders via `recharts` with the blood-red theme applied
- Interactive (hover tooltips, legends)
- Export as PNG/SVG

**MermaidArtifact:**

- Renders flowcharts, sequence diagrams, ER diagrams, Gantt charts
- Dark theme applied to match KURUMI palette
- Zoom + pan on large diagrams

**CodeArtifact:**

- Shiki syntax highlighting with a custom "cursed blood" theme
- Copy button, language badge
- Line numbers
- For Python/JS/shell: "Run" button (Python via embedded Pyodide WASM, JS via eval in sandbox)

### 5.6 System Monitor

**StatusBar (always visible, bottom):**

- Active model name + context usage (tokens used / max)
- Ollama status dot (green = running, red = down)
- GPU VRAM usage bar (reads via `nvidia-smi` or system APIs)
- RAM usage
- CPU %
- Generation speed (tokens/sec during streaming)

**System Info Page:**

- Full GPU info: name, VRAM total/used, CUDA/ROCm version
- RAM total/available
- Ollama version, models directory path
- Running model details (loaded layers, offloaded layers)
- Benchmark button: run a standard prompt and measure tok/s

### 5.7 Additional Features

#### Prompt Library

- Save any prompt as a template with variables (`{{topic}}`, `{{language}}`)
- Categories: coding, writing, analysis, roleplay, summarization
- Quick-insert via `/` command in input
- Import/export as JSON

#### Personas / System Prompts

- Save multiple "AI personas" (name + system prompt + model preference + temperature)
- Switch persona at start of conversation
- Prebuilt personas: Code Assistant, Creative Writer, Research Analyst, Tutor, Translator

#### Voice Input

- Web Speech API or `whisper.cpp` via IPC (if installed)
- Push-to-talk via `Space` bar hold
- Transcription shown in input before sending

#### Export & Share

- Export chat as: Markdown, PDF (via Electron print), JSON
- Export images as PNG
- Copy entire conversation to clipboard

#### Multi-Model Comparison

- Split-pane mode: run same prompt against 2–4 models simultaneously
- Side-by-side responses
- Vote which is better (stored for personal preference tracking)

#### Session Memory (Soft)

- Configurable rolling context: keep last N turns always in context
- Auto-summarize older history and inject as compressed memory
- "Memory" panel showing active context summary

#### Hotkeys

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New chat |
| `Ctrl+K` | Model switcher |
| `Ctrl+/` | Toggle sidebar |
| `Ctrl+Shift+R` | Regenerate last |
| `Ctrl+L` | Clear chat |
| `Ctrl+E` | Export chat |
| `Ctrl+M` | Model management page |
| `Ctrl+I` | Image generation |
| `Ctrl+F` | Search conversations |
| `Escape` | Close modal / panel |

---

## 6. ELECTRON MAIN PROCESS

### 6.1 Window Configuration

```typescript
// electron/main.ts
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 900,
  minHeight: 650,
  frame: false,          // Custom titlebar
  titleBarStyle: 'hidden',
  vibrancy: 'under-window',  // macOS blur
  backgroundMaterial: 'acrylic', // Windows 11 mica
  backgroundColor: '#050305',
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,            // needed for better-sqlite3
    webSecurity: true,
  },
})
```

**Custom Titlebar:** Implement in React using `data-electron-drag` region. Window controls (close/min/max) styled as red glowing dots.

### 6.2 IPC Channel Definitions

All IPC channels follow the pattern `module:action`.

```typescript
// OLLAMA
'ollama:chat'           // stream chat completion
'ollama:generate'       // raw generate
'ollama:list'           // list local models
'ollama:pull'           // download model (streams progress)
'ollama:delete'         // remove model
'ollama:show'           // model details
'ollama:running'        // list running models
'ollama:status'         // check if Ollama is running

// FILES
'files:parse'           // parse uploaded file → text chunks
'files:save'            // save attachment to userData
'files:read'            // read saved attachment
'files:delete'          // remove attachment

// RAG
'rag:index'             // embed & store document
'rag:search'            // similarity search
'rag:delete'            // remove document chunks
'rag:list'              // list indexed documents

// SQLITE
'db:messages:list'      // get messages for conversation
'db:messages:insert'    // save message
'db:conversations:list' // list all conversations
'db:conversations:create'
'db:conversations:update'
'db:conversations:delete'

// IMAGE GEN
'imagegen:txt2img'      // generate image
'imagegen:img2img'
'imagegen:progress'     // poll generation progress
'imagegen:status'       // check SD endpoint

// SYSTEM
'system:info'           // GPU, RAM, CPU info
'system:ollama:version' // Ollama version check
'window:minimize'
'window:maximize'
'window:close'
'window:isMaximized'
```

### 6.3 Ollama Streaming Pattern

```typescript
// electron/ipc/ollama.ipc.ts
ipcMain.on('ollama:chat', async (event, payload) => {
  const { messages, model, options, conversationId } = payload
  
  try {
    const stream = await ollamaService.chat({
      model,
      messages,
      stream: true,
      options,
    })

    for await (const chunk of stream) {
      event.sender.send('ollama:chat:chunk', {
        conversationId,
        content: chunk.message.content,
        done: chunk.done,
        eval_count: chunk.eval_count,
        eval_duration: chunk.eval_duration,
      })
    }
  } catch (err) {
    event.sender.send('ollama:chat:error', { message: err.message })
  }
})
```

---

## 7. DATABASE SCHEMA (SQLite)

```sql
-- Conversations
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  model       TEXT NOT NULL,
  system_prompt TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  pinned      INTEGER DEFAULT 0,
  folder_id   TEXT,
  metadata    TEXT  -- JSON: persona, tags, etc.
);

-- Messages
CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
  content         TEXT NOT NULL,
  model           TEXT,
  created_at      INTEGER NOT NULL,
  token_count     INTEGER,
  generation_ms   INTEGER,
  attachments     TEXT,  -- JSON array of attachment refs
  metadata        TEXT   -- JSON: chunk_sources, image_paths, etc.
);

-- Folders
CREATE TABLE folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT,
  created_at INTEGER NOT NULL
);

-- Knowledge Base Documents
CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  filepath    TEXT NOT NULL,
  mimetype    TEXT NOT NULL,
  size_bytes  INTEGER,
  chunk_count INTEGER DEFAULT 0,
  indexed_at  INTEGER,
  status      TEXT DEFAULT 'pending',
  metadata    TEXT  -- JSON
);

-- Prompt Library
CREATE TABLE prompts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT,
  variables   TEXT,  -- JSON array of variable names
  created_at  INTEGER NOT NULL
);

-- Personas
CREATE TABLE personas (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model         TEXT,
  temperature   REAL DEFAULT 0.7,
  avatar_emoji  TEXT DEFAULT '🔴',
  created_at    INTEGER NOT NULL
);

-- Image Generations
CREATE TABLE image_generations (
  id          TEXT PRIMARY KEY,
  prompt      TEXT NOT NULL,
  neg_prompt  TEXT,
  model       TEXT,
  settings    TEXT NOT NULL, -- JSON: steps, cfg, size, sampler, seed
  image_path  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  conversation_id TEXT
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  content=messages,
  content_rowid=rowid
);
```

---

## 8. ANIMATIONS & MOTION SPEC

### 8.1 Global Keyframes

```css
/* Cursed energy shimmer across glass panels */
@keyframes cursedShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Glow pulse for active elements */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255,34,68,0.3); }
  50%       { box-shadow: 0 0 25px rgba(255,34,68,0.6), 0 0 50px rgba(139,0,0,0.3); }
}

/* Vein crawl: red line that traces border */
@keyframes veinCrawl {
  0%   { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
}

/* Floating particle */
@keyframes float {
  0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
  33%       { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
  66%       { transform: translateY(10px) translateX(-8px); opacity: 0.3; }
}

/* Streaming cursor */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* Page transition */
@keyframes pageReveal {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

/* Model card hover blood fill */
@keyframes bloodFill {
  from { background-size: 0% 100%; }
  to   { background-size: 100% 100%; }
}
```

### 8.2 Framer Motion Variants

```typescript
// Panel entrance
export const panelVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
}

// Message bubble
export const messageVariants = {
  hidden: { opacity: 0, x: (isUser) => isUser ? 20 : -20, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' } }
}

// Sidebar item stagger
export const sidebarItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.2 }
  })
}

// Model card hover
export const modelCardVariants = {
  rest: { scale: 1, borderColor: 'rgba(196,30,58,0.2)' },
  hover: { scale: 1.02, borderColor: 'rgba(255,34,68,0.5)',
    transition: { duration: 0.2 } }
}
```

---

## 9. COMPONENT DETAILS

### 9.1 GlassPanel

```typescript
// src/components/ui/GlassPanel.tsx
interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'deep' | 'surface' | 'modal'
  glowing?: boolean
  animate?: boolean
}
```

- `default`: bg-glass + blur(16px)
- `deep`: darker tint (bg-abyss), used for sidebar
- `surface`: slightly lighter, for message bubbles
- `modal`: full blur + vignette overlay
- `glowing`: adds `glowPulse` animation to border

### 9.2 CursedButton

Variants:

- `primary`: red-glow background, white text, glowPulse on hover
- `secondary`: glass background, red border, no fill
- `ghost`: no border, text only with red hover underline
- `danger`: deep red fill for destructive actions
- `icon`: square icon-only button

All buttons have:

- Press ripple effect (CSS `::after` pseudo-element)
- Disabled state with `opacity: 0.4` and `cursor: not-allowed`
- Loading spinner variant

### 9.3 ModelSwitcher

```typescript
// TopBar component
// Displays: [ModelBadge] ModelName [▼]
// On click: dropdown with all local models
// Sections: Running Models (highlighted) | All Models
// Each item: name, size badge, capability badges
// "Download more..." link at bottom → Models page
```

### 9.4 InputArea

```typescript
interface InputAreaProps {
  onSend: (message: string, attachments: Attachment[]) => void
  disabled: boolean
  conversationId: string
}
```

- Auto-growing textarea (Ctrl+Enter sends)
- File attachment button → native file picker (PDF, DOCX, XLSX, PNG, JPG, WEBP)
- Drag files directly onto textarea
- Paste image from clipboard
- Character/token counter (right-aligned, fades in at 100+ tokens)
- Toolbar: `📎 Attach` | `🖼 ImageGen` | `📚 RAG` | `🎤 Voice` | `⚙️ Params`
- Attachments shown as dismissible chips above textarea

---

## 10. SETTINGS PAGE

### Sections

1. **General**
   - Language
   - Theme accent color (red / orange / purple / green — all dark blood variants)
   - Font size (12/14/16px)
   - Auto-scroll to bottom
   - Show token count

2. **Ollama**
   - Ollama endpoint URL (default: `http://localhost:11434`)
   - Auto-start Ollama on app launch
   - Ollama binary path
   - Models storage directory
   - Max concurrent requests

3. **Models**
   - Default model
   - Default system prompt
   - Default parameters (temp, top_p, etc.)
   - Context window default

4. **Documents / RAG**
   - Embedding model (dropdown of available ONNX models)
   - Chunk size (256–1024 tokens)
   - Chunk overlap (0–256 tokens)
   - Top-K results (1–10)
   - Auto-RAG toggle (always inject context when docs present)

5. **Image Generation**
   - Provider: Auto-detect | Automatic1111 | ComfyUI | Disabled
   - Endpoint URL
   - Default negative prompt
   - Default steps / CFG
   - Save generated images to path

6. **Voice**
   - Input method: Web Speech API | Whisper.cpp
   - Whisper binary path
   - Language
   - Push-to-talk key

7. **Storage**
   - Data directory (userData path)
   - Conversation backup (export all as JSON)
   - Clear all conversations
   - Clear vector store
   - Clear image gallery

8. **Keyboard Shortcuts**
   - Display all shortcuts
   - Customize bindings

9. **About**
   - App version, Electron version, Node version
   - Check for updates
   - GitHub link

---

## 11. BUILD & PACKAGING

### package.json scripts

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "tsc && vite build && electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "preview": "electron dist-electron/main.js"
  }
}
```

### electron-builder.config.js

```javascript
module.exports = {
  appId: 'dev.kurumi.ai',
  productName: 'KURUMI',
  directories: { output: 'dist' },
  files: ['dist-electron/**/*', 'dist/**/*'],
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
    artifactName: 'KURUMI-Setup-${version}.exe'
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'assets/icon.png',
    category: 'Utility'
  },
  extraResources: [
    { from: 'resources/', to: '.' }
  ]
}
```

### Vite Config (with Electron plugin)

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([{
      entry: 'electron/main.ts',
      vite: { build: { outDir: 'dist-electron' } }
    }, {
      entry: 'electron/preload.ts',
      vite: { build: { outDir: 'dist-electron' } }
    }]),
    renderer()
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
```

---

## 12. SECURITY CONSIDERATIONS

- `contextIsolation: true` — renderer cannot access Node.js APIs directly
- All Node/native operations go through IPC via preload bridge
- File paths are validated in main process before reading/writing
- Ollama endpoint is configurable but defaults to localhost only
- No external API calls unless SD/ComfyUI endpoint is explicitly configured
- SQLite database stored in Electron's `userData` path (OS-protected)
- Content Security Policy header set on all windows:

  ```
  default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:
  ```

- Artifact iframes use `sandbox="allow-scripts"` — no network, no same-origin

---

## 13. RECOMMENDED ADDITIONAL FEATURES (ROADMAP)

| Feature | Description | Complexity |
|---|---|---|
| **Agent Mode** | LLM can use tools: web search, run code, read files | High |
| **Function Calling** | JSON-structured tool calling for Ollama models that support it | Medium |
| **Plugin System** | Load custom JS plugins that add tools/panels | High |
| **Collaborative Notes** | Attach a scratchpad to each conversation | Low |
| **Canvas Mode** | Infinite canvas with chat nodes, like a mind map | High |
| **Scheduled Prompts** | Run prompts on a cron schedule, save outputs | Medium |
| **Model Fine-tuning UI** | Basic LoRA fine-tune launcher via Unsloth/llama.cpp | High |
| **Screen OCR** | Capture screen region and send to LLM | Medium |
| **Clipboard Watcher** | Auto-offer to explain/process copied text | Low |
| **Local TTS** | Text-to-speech of responses via Kokoro/Piper | Medium |
| **Regex Extractor** | Auto-extract structured data from responses | Low |
| **Translation Mode** | Dedicated translation panel with language selector | Low |
| **Diff Viewer** | Compare two model responses side-by-side with diff | Medium |
| **Response Rating** | Thumbs up/down, stored for personal analytics | Low |
| **Analytics Dashboard** | Usage stats: messages/day, tokens/model, gen speed | Medium |
| **Custom CSS Themes** | User-uploadable CSS theme files | Low |
| **Workflow Builder** | Chain prompts with conditionals (like n8n, local) | High |

---

## 14. DEVELOPMENT PHASES

### Phase 1 — Core (Weeks 1–3)

- Electron + React + Vite scaffold
- Ollama IPC integration (list, chat stream, pull)
- Basic chat UI with glassmorphism theme
- SQLite chat history
- Model switcher
- Model download page with progress

### Phase 2 — Documents & RAG (Weeks 4–5)

- File parsers (PDF, DOCX, XLSX, images)
- Local embeddings via @xenova/transformers
- LanceDB integration
- RAG pipeline in chat
- Knowledge base management page

### Phase 3 — Artifacts (Week 6)

- Artifact detection parser
- Code, Mermaid, Math, HTML artifact renderers
- React artifact sandbox
- Chart artifact with Recharts

### Phase 4 — Image Generation (Week 7)

- A1111/ComfyUI integration
- Image gen panel in chat
- Gallery page
- Img2img

### Phase 5 — Polish & Features (Weeks 8–9)

- All animations (Framer Motion)
- Prompt library
- Personas
- Voice input
- Multi-model comparison
- Hotkeys
- Settings page complete
- Export functions

### Phase 6 — Build & Release (Week 10)

- Electron Builder packaging (Win/Mac/Linux)
- Auto-updater
- App icon design
- README + documentation

---

## 15. DEPENDENCY LIST

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "framer-motion": "^11.2.0",
    "zustand": "^4.5.0",
    "ollama": "^0.5.0",
    "@xenova/transformers": "^2.17.0",
    "vectordb": "^0.4.0",
    "better-sqlite3": "^9.6.0",
    "electron-store": "^8.2.0",
    "pdf-parse": "^1.1.1",
    "pdfjs-dist": "^4.2.0",
    "mammoth": "^1.7.0",
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-katex": "^7.0.0",
    "remark-math": "^6.0.0",
    "katex": "^0.16.10",
    "mermaid": "^10.9.0",
    "recharts": "^2.12.0",
    "d3": "^7.9.0",
    "@babel/standalone": "^7.24.0",
    "shiki": "^1.6.0",
    "lucide-react": "^0.378.0",
    "sonner": "^1.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-select": "^2.0.0",
    "@dnd-kit/core": "^6.1.0",
    "overlayscrollbars-react": "^0.5.6",
    "date-fns": "^3.6.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "electron": "^30.0.0",
    "vite": "^5.2.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron-builder": "^24.13.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "concurrently": "^8.2.0",
    "@types/react": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/d3": "^7.4.0",
    "@types/katex": "^0.16.0"
  }
}
```

---

## 16. ASSET REQUIREMENTS

Create the following assets before building:

- `assets/icon.png` (1024×1024) — KURUMI logo: stylized letter K with a red cursed energy flame effect, on dark background
- `assets/icon.ico` (Windows multi-size ICO)
- `assets/icon.icns` (macOS ICNS)
- `assets/splash.png` (800×500) — app loading splash with KURUMI name in Cinzel font
- `assets/tray-icon.png` (22×22) — system tray icon

**Logo concept:** The letter K formed by two curved blade-like strokes, with a red glowing line tracing through the negative space, suggesting a cursed technique unleashed. Pure black background. Subtle hex grid behind the letter.

---

## 17. NOTES FOR CODING AGENT

1. **Start with the Electron scaffold** — set up main/preload/renderer split first, verify IPC works before building UI
2. **Ollama must be running** — add a startup check that shows a setup screen if Ollama isn't detected on port 11434
3. **better-sqlite3 needs native compilation** — use `electron-rebuild` after `npm install`
4. **@xenova/transformers** downloads ONNX models on first use — show a one-time download prompt in the RAG settings
5. **Streaming IPC** — use `event.sender.send()` for streaming, not `ipcMain.handle()` (which is request-response only)
6. **Artifact sandboxing** — NEVER eval artifacts in the main renderer context; always use `srcdoc` iframes with sandbox attribute
7. **File paths in renderer** — all file system paths must go through IPC; never use `fs` directly in renderer
8. **SQLite in main process only** — do not use better-sqlite3 in renderer, all DB calls via IPC
9. **Tailwind purge** — ensure all dynamic class names are safelisted or use CSS variables instead
10. **Custom titlebar** — implement drag region with `-webkit-app-region: drag` on the titlebar element, `-webkit-app-region: no-drag` on buttons

---

*End of KURUMI Build Specification v1.0*
*Generated for use with agentic coding tools (Antigravity, Claude Code, Cursor, etc.)*
