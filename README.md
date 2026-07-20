# KURUMI

<div align="center">

```
██╗  ██╗██╗   ██╗██████╗ ██╗   ██╗███╗   ███╗██╗
██║ ██╔╝██║   ██║██╔══██╗██║   ██║████╗ ████║██║
█████╔╝ ██║   ██║██████╔╝██║   ██║██╔████╔██║██║
██╔═██╗ ██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██║
██║  ██╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝
```

### **Kinetic Unified Runtime for Universal Model Interaction**

*The last local AI client you'll ever need.*

<br/>

[![Status](https://img.shields.io/badge/status-ACTIVE%20DEVELOPMENT-crimson?style=for-the-badge&color=8B0000)](https://github.com/bhoomik-codes/kurumi)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-black?style=for-the-badge)](https://github.com/bhoomik-codes/kurumi/releases)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.dev)
[![License](https://img.shields.io/badge/license-MIT-red?style=for-the-badge&color=C41E3A)](LICENSE)

<br/>

> *「 Your data. Your models. Your domain. 」*

<br/>

</div>

---

## 📸 Screenshots

<div align="center">

### 💬 Chat — Markdown Rendering with Conversation Sidebar

![Chat with Markdown rendering, conversation sidebar, and table output](assets/screenshots/chat_markdown.png)

<br/>

### 🧠 Local Models Manager

![Local models page showing installed models with size, parameters and quantization](assets/screenshots/models_page.png)

<br/>

### 🛍️ Model Store — Live Ollama Library Browser

![Model Store with live Ollama library results and install buttons](assets/screenshots/model_store.png)

<br/>

### 🩸 New Chat Empty State

![Chat empty state with "The void awaits your query" and conversation history sidebar](assets/screenshots/chat_empty.png)

</div>

---

## 🩸 What is KURUMI?

**KURUMI** is a fully offline, privacy-first AI runtime that brings the full power of large language models to your local machine — zero subscriptions, zero data leaks, zero cloud dependency. Run frontier-class AI on your own hardware. Own your data completely.

At its core, KURUMI is a **persistent background daemon** (`kurumid`) that owns all AI inference, database access, and document processing. Three interchangeable clients — a Terminal UI, a one-shot CLI, and an Electron GUI — connect to the daemon over a local HTTP API. You choose the surface. The engine is always the same.

Inspired by the visual brutality of **Jujutsu Kaisen**, KURUMI's "Cursed Blood" interface bleeds deep crimson through neo-glassmorphism panels, glowing vein-like borders, and particle energy effects. It doesn't just run AI — it *channels* it.

---

## ✦ Architecture

KURUMI is built on a **Daemon-Client Architecture** — a single persistent backend (`kurumid`) served over a local Fastify HTTP server, with three thin clients connecting to it.

```
┌─────────────────────────────────────────────────────────┐
│                    kurumid  (port 47392)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ OllamaService│  │ AirLLMService│  │ NvidiaService │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌──────────────────────────────────┐  │
│  │  SQLite DB   │  │  Worker (RAG + Whisper STT)      │  │
│  └──────────────┘  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Supervisor (AirLLM process + Ollama lifecycle)      │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
           ▲                  ▲                  ▲
           │   HTTP / SSE     │                  │
  ┌────────┴──────┐  ┌────────┴──────┐  ┌────────┴──────┐
  │   CLI client  │  │   TUI client  │  │   GUI client  │
  │  (one-shot)   │  │  (Ink / React)│  │  (Electron)   │
  └───────────────┘  └───────────────┘  └───────────────┘
```

### Why a daemon?

| Problem | Solution |
|---|---|
| SQLite `database is locked` errors when CLI + GUI wrote simultaneously | Daemon is the **sole writer** — all clients read/write through it |
| Models taking 15+ seconds to load into VRAM on every request | Models stay **resident in VRAM**; warm requests drop from ~15.7s to ~1.0s |
| AirLLM OOM crashes bringing down the whole app | **Supervisor** with exponential-backoff restart recovers the AI process without touching the UI |
| GUI + terminal are mutually exclusive surface choices | All three clients share **one running daemon** — switch surfaces at will |

### Clients

| Client | Entry point | Description |
|---|---|---|
| **TUI** | `kurumi` | Interactive full-screen terminal app built with [Ink](https://github.com/vadimdemedes/ink). Rich Markdown rendering, multi-turn chat, slash commands. |
| **CLI** | `kurumi --ask "…"` | Headless one-shot query. Pipe-friendly; outputs raw text to stdout. Perfect for shell scripts. |
| **GUI** | `kurumi run` | The Electron desktop application with the full "Cursed Blood" visual experience, artifacts, image generation, voice, and RAG. |

### Daemon Internals

- **`server.ts`** — Fastify HTTP server exposing `/chat` (SSE streaming), `/models`, `/pull`, `/history`, `/threads/:id`, `/worker/*`, `/db/*`, `/warmup`, and `/health`.
- **`supervisor.ts`** — Process supervisor for the AirLLM Python server and Ollama. Monitors child exits, restarts with exponential backoff (2 s → 60 s ceiling).
- **`db.ts`** — Single `better-sqlite3` instance owned exclusively by the daemon. All reads/writes from any client are serialized through it.
- **`workerManager.ts`** — Manages the isolated worker thread for heavy off-thread work: document parsing, vector embedding (nomic-embed-text via `@xenova/transformers`), and Whisper ONNX STT.
- **`services/`** — `OllamaService`, `AirLLMService`, `NvidiaService` each expose a unified `streamChat()` async-generator interface consumed by the `/chat` endpoint.

---

## ✦ Current Features

### 💬 Chat Interface

- **Real-time streaming** — tokens appear as they generate, with an animated "Summoning from the void..." loading state
- **Conversation sidebar** — full chat history with search, pin/unpin, and delete
- **Markdown rendering** — rich formatted output with syntax-highlighted code blocks (Cursed Blood dark theme), tables, lists, blockquotes, and more
- **Copy button** on every code block — one click to clipboard
- **System prompt** — every conversation is pre-seeded with formatting instructions so the model uses Markdown automatically
- **Auto-scroll** — chat window follows the stream in real time
- **Multi-turn memory** — full conversation history sent to the model on every message
- **Slash commands in TUI** — `/help`, `/clear`, `/about`, `/quit`

### ⚡ Interactive Artifacts Engine *(GUI)*

- **Sandboxed Execution** — When models write code, KURUMI safely runs it.
- **React Components** — Live preview and interact with generated React UIs.
- **HTML/CSS Sandboxes** — Renders vanilla web code in an isolated iframe.
- **Charts & Graphs** — Instantly draws `recharts` and `d3` components, deeply integrated with the app's dark theme.
- **Mermaid Diagrams** — Fully zoomable interactive Flowcharts, Sequence Diagrams, and ER Models.
- **Math / KaTeX** — Precise, beautiful rendering for complex mathematical equations.

### 🖼️ Image Generation Studio *(GUI)*

- **Automatic1111** — txt2img and img2img with sampler / steps / CFG / size / seed, optional checkpoint override, denoise control for img2img
- **Save to disk** — one-click export of the current preview into the app data directory as PNG
- **ComfyUI** — quick connection test to a local Comfy server

### 🎙️ Cursed Speech — Voice & TTS *(GUI)*

- **Local Speech-to-Text (STT)** — Push-to-talk microphone powered by **Whisper ONNX** running in the daemon's worker thread.
- **Cursed Waveform** — Real-time crimson waveform visualizer reflecting your voice intensity.
- **Auto-Read TTS** — Responses read aloud using the OS-native `SpeechSynthesis` API.
- **Personas** — Choose your TTS persona (Cursed, Whisper, Domain) directly from the settings.

### 🧠 Model Management & Cloud Fallback

- **Three inference providers** — switch between **Ollama** (local), **AirLLM** (local giant models), and **NVIDIA NIM** (cloud) from the chat header or TUI settings.
- **🔬 AirLLM — Frontier Models on Consumer GPUs** — Run 30B, 40B, 70B, even 405B parameter models on a single GPU with as little as 4 GB VRAM using layer-by-layer weight streaming. No quantization, no cloud.
- **Cloud Models via NVIDIA NIM** — Seamlessly switch to cloud endpoints (Llama 3.1 405B, Nemotron Ultra 253B, Gemma 3, and more) when local compute isn't enough.
- **Installed models page** — see all local Ollama models with size, parameters, quantization level, and family
- **One-click select** — switch active model from the Models page
- **Pull new models** — download directly from inside the app with a real-time streaming progress bar (%)
- **Delete models** — with double-confirm safety guard
- **Model warm-up** — pre-load a model into VRAM from the Models page; the daemon keeps it hot

### 🛍️ Model Store *(GUI)*

- **Dual-source browser** — browse live from **Ollama Library** and **HuggingFace Hub** simultaneously
- **Catalog scope** — filter toward **language / chat models** vs **image & diffusion** (plus *All*)
- **HuggingFace GGUF search** — sorted by Most Downloaded / Liked / Newest
- **Quantization picker** — see all available `.gguf` variants per HuggingFace model with file sizes
- **Direct install** — `ollama pull hf.co/org/repo:Q4_K_M` wired directly to streaming progress modal
- **Installed detection** — already-installed models show a green "Installed" badge across both sources

### 🗄️ Data Persistence & RAG

- **SQLite database** — all conversations and messages stored locally via `better-sqlite3`, exclusively owned by the daemon
- **Full-text search** — FTS5 index on message content
- **Conversation hydration** — last conversation automatically restored on app restart
- **LanceDB vector store (RAG)** — document embeddings and chunk text persist under the app data directory at `vectorstore/`. Similarity search uses cosine distance with `topK` / `minScore` filtering. Chunk metadata (`document_id`, `filename`, `chunk_index`) stored as JSON for visible **Sources** citations in chat.
- **Document formats** — PDF / DOCX / XLSX extraction pipeline with ~512-token chunks and overlap.

### 🎨 Aesthetics — "Cursed Blood" Theme *(GUI)*

- **Deep void background** `#050305` with floating red particle emitters
- **Glassmorphism panels** — `backdrop-filter: blur(16px)` layered glass throughout
- **Red accent system** — `#8B0000` → `#C41E3A` → `#FF2244` gradient hierarchy
- **Glowing borders** — red vein-like borders with radial `box-shadow` on active elements
- **Animated loading states** — pulsing orb, streaming cursor, gradient progress bars
- **Frameless window** — custom title bar with minimize/maximize/close controls

---

## ✦ Planned Features (Roadmap)

```
✅ Phase 1  — Project scaffold, Electron + Vite + Tailwind
✅ Phase 2  — Ollama IPC bridge, streaming chat, SQLite persistence
✅ Phase 3  — Chat UI polish, loading states, DB hydration on reload
✅ Phase 4  — Models page + Model Store (Ollama + HuggingFace live)
✅ Phase 5  — Conversation Sidebar with history, search, pin/delete
✅ Phase 5b — Markdown renderer + syntax highlighting + system prompt
✅ Phase 6  — Document Upload & RAG (PDF, DOCX, local vector search)
✅ Phase 7  — Artifact rendering (React live preview, Mermaid, LaTeX)
✅ Phase 8  — Image Generation Studio (Automatic1111 core + ComfyUI probe)
✅ Phase 9  — Cursed Speech (Voice & TTS via Whisper ONNX + Web Speech API)
✅ Phase 10 — Cloud LLM Integration (NVIDIA NIM fallback)
✅ Phase 11 — Daemon Architecture (kurumid — persistent Fastify backend)
✅ Phase 12 — TUI Client (Ink-based full-screen terminal interface)
✅ Phase 13 — CLI Client (one-shot --ask, setup, doctor commands)
⬜ Phase 14 — Packaged releases (Win / macOS / Linux binaries)
⬜ Phase 15 — Prompt Library, Personas, Model Comparison
⬜ Phase 16 — TUI: model switching, conversation history, /models command
```

**On the horizon:**

- 🤖 Agent mode with local tool use (web search, file system access)
- 🔌 Plugin system for community extensions
- 🗺️ Canvas mode — infinite whiteboard with AI chat nodes
- 📺 Screen OCR — capture any region and send to the model
- 🔄 Workflow builder — chain prompts like a local n8n for AI
- 📱 REST API exposure — let other local tools query `kurumid` directly

---

## ✦ Tech Stack

### Core / Daemon

| Layer | Technology | Version |
|---|---|---|
| Daemon HTTP Server | [Fastify](https://fastify.dev) | 5 |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + FTS5 | 9 |
| RAG / Vectors | [LanceDB](https://lancedb.github.io/lancedb/) (`@lancedb/lancedb`, embedded) | 0.27 |
| Embedding Model | `@xenova/transformers` (nomic-embed-text) | v2 |
| Voice STT | Whisper ONNX (`@xenova/transformers`) | v2 |
| Process Management | Node.js `child_process` Supervisor | — |
| Logging | [Winston](https://github.com/winstonjs/winston) + daily-rotate-file | 3 |
| Configuration | dotenv | — |

### GUI Client (Electron)

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | [Electron](https://electronjs.org) | 30 |
| Frontend | [React](https://react.dev) + TypeScript | 18 / 5 |
| Build Tool | [Vite](https://vitejs.dev) + vite-plugin-electron | 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) + Custom CSS | 3 |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) | 4 |
| Routing | React Router DOM | 6 |
| Artifact Runtime | `@babel/standalone` (sandboxed iframe) | Latest |
| Markdown | react-markdown + remark-gfm | Latest |
| Syntax Highlighting | react-syntax-highlighter (Prism) | Latest |
| Voice TTS | Native Web Speech API (`SpeechSynthesis`) | OS Native |
| Notifications | [Sonner](https://sonner.emilkowal.ski) | Latest |
| Icons | [Lucide React](https://lucide.dev) | Latest |

### TUI / CLI Clients

| Layer | Technology | Version |
|---|---|---|
| TUI Framework | [Ink](https://github.com/vadimdemedes/ink) (React for terminals) | 3 |
| Argument Parsing | [mri](https://github.com/lukeed/mri) | 1.2 |
| Terminal Markdown | marked + marked-terminal | Latest |
| Clipboard | clipboardy | 5 |
| Packaging | [@yao-pkg/pkg](https://github.com/yao-pkg/pkg) | 6 |

### AI Providers

| Provider | Mode | Notes |
|---|---|---|
| [Ollama](https://ollama.com) | 🟢 Local | Primary local inference runtime |
| [AirLLM](https://github.com/lyogavin/airllm) | 🟢 Local | Layer-by-layer streaming for 30B–405B models on consumer GPUs |
| [NVIDIA NIM](https://integrate.api.nvidia.com) | ☁️ Cloud | Optional cloud fallback via API key |

> **100% offline capable.** Zero telemetry. Zero cloud calls (except model browsing & optional NVIDIA NIM). Your models, your data, your machine.

---

## ✦ Prerequisites

| Requirement | Notes |
|---|---|
| [Node.js](https://nodejs.org) (v20+) | Required for compiling and running from source |
| Python 3 & pip | Required for AirLLM frontier models |
| [Ollama](https://ollama.com) | The primary backend for local inference |

---

## 🌱 Complete Setup Guide

### Step 1: Clone & Install

```bash
git clone https://github.com/bhoomik-codes/kurumi.git
cd kurumi
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` to set ports, log levels, or your NVIDIA API key. Defaults work out of the box for all local services.

Key variables:

| Variable | Default | Description |
|---|---|---|
| `KURUMI_DAEMON_PORT` | `47392` | Port the daemon listens on |
| `KURUMI_DAEMON_HOST` | `127.0.0.1` | Daemon bind address |
| `OLLAMA_HOST` | `127.0.0.1` | Ollama server address |
| `OLLAMA_PORT` | `11434` | Ollama server port |
| `NVIDIA_API_KEY` | — | Optional: NVIDIA NIM cloud key |
| `AIRLLM_HOST` | `127.0.0.1` | AirLLM Python server address |
| `AIRLLM_PORT` | `8765` | AirLLM Python server port |

### Step 3: Build the CLI & Run Setup

```bash
npm run build:cli
./dist/kurumi-cli setup    # Installs Python deps (AirLLM)
./dist/kurumi-cli doctor   # Verifies GPU, daemon, Ollama, SQLite
```

### Step 4: Launch KURUMI

| Command | What it does |
|---|---|
| `./dist/kurumi-cli` | 🖥️ Launch the **interactive TUI** (default) |
| `./dist/kurumi-cli --ask "…"` | ⚡ One-shot query, output to stdout |
| `./dist/kurumi-cli run` | 🪟 Launch the **Electron GUI** |
| `./dist/kurumi-cli server` | 🔧 Start the daemon in the **foreground** |
| `./dist/kurumi-cli setup` | 📦 Interactive dependency installer |
| `./dist/kurumi-cli doctor` | 🩺 System health check |
| `./dist/kurumi-cli help` | 📖 Show full help |

> The daemon (`kurumid`) auto-starts in the background whenever the TUI, CLI `--ask`, or GUI is launched. You do not need to start it manually unless you want to run it in the foreground for debugging.

---

## ✦ Developer Notes

### Development Mode

```bash
# Run GUI in dev mode (hot reload)
npm run dev

# Run daemon in foreground (for debugging)
npx tsx src/daemon/server.ts

# Run TUI from source
npx tsx src/cli/index.ts
```

### Building for Production

```bash
npm run build:cli          # Build the standalone CLI/TUI binary
npm run build              # Build the full Electron app + installer
npm run build:win          # Windows (.exe installer)
npm run build:mac          # macOS (.dmg)
npm run build:linux        # Linux (.AppImage + .snap)
```

Built artifacts land in `dist/`.

### Environment Flags

- `KURUMI_A1111_TIMEOUT_MS` — txt2img/img2img timeout ceiling in ms
- `KURUMI_A1111_PROBE_MS` — A1111 probe timeout ceiling in ms
- `KURUMI_DEBUG_WORKER=1` — Mirror RAG worker stdout to main logs
- `KURUMI_DOCKER=1` — Enable `--disable-dev-shm-usage` / `--no-sandbox` flags for Linux containers

### Testing

```bash
npm test          # Run Vitest suite
npm run test:watch  # Interactive watch mode
```

### Native Rebuild

After changing Electron versions or on a fresh Linux machine:

```bash
npm run rebuild:electron   # Rebuild @lancedb/lancedb + better-sqlite3 for Electron ABI
npm run rebuild:node       # Rebuild for Node.js ABI (for daemon + CLI)
```

### Docker

A `Dockerfile` and `docker-compose.yml` are provided for headless/server deployments of the daemon:

```bash
docker compose up -d
```

The daemon will be available at `http://localhost:47392`. Point any KURUMI client to this address via `.env`.

---

## ✦ Changelog

### `v2.0.0` — Daemon Architecture *(Latest)*

- ✅ **Daemon (`kurumid`):** A robust, persistent Fastify HTTP server that is the sole owner of all DB connections and AI model processes.
- ✅ **Interactive TUI Client:** A full-screen terminal interface built with Ink (React for terminals). Launch with `kurumi`. Features: multi-turn streaming chat, Markdown rendering, slash commands (`/help`, `/clear`, `/about`, `/quit`), double-Ctrl+C exit guard, `.kurumi/instructions.md` and `CLAUDE.md` context loading.
- ✅ **CLI Client (`--ask`):** Pipe-friendly one-shot query mode. POSIX-compatible, outputs raw text to stdout. Auto-starts the daemon if not running.
- ✅ **Setup & Doctor Commands:** `kurumi setup` installs Python deps; `kurumi doctor` verifies daemon, GPU, Ollama, AirLLM, disk space, and SQLite integrity.
- ✅ **Process Supervisor:** Monitors the AirLLM Python server and Ollama; restarts crashed processes with exponential backoff (2 s → 60 s ceiling). Crash isolation ensures the UI never goes down with the AI process.
- ✅ **Worker Thread:** Off-thread worker manager for RAG document processing (PDF/DOCX/XLSX), vector embedding, and Whisper STT — the daemon never blocks on heavy inference.
- ✅ **Warm-Model Latency:** Model memory residency maintained. Warm requests: ~1.0 s vs. cold: ~15.7 s.
- ✅ **SQLite Locking Fixed:** Single-writer daemon eliminates all `database is locked` concurrency errors.
- ✅ **`.env` Configuration:** All ports, hosts, and keys centralized into a single env file.
- ✅ **BREAKING CHANGE:** Bare `kurumi` now opens the TUI. Use `kurumi run` to launch the Electron GUI.

### `v1.0.0` — The Domain Expansion

- ✅ **Phase 9 — Cursed Speech (Voice & TTS):** Fully local Whisper ONNX STT in the utility process and Web Speech API TTS for auto-reading responses.
- ✅ **Interactive Artifacts Engine:** Sandboxed iframe execution for React, Recharts, Mermaid, and KaTeX.
- ✅ **NVIDIA NIM Cloud Fallback:** Seamless dual-provider switching between local Ollama and cloud endpoints.
- ✅ **Multi-Process Architecture:** Heavy embedding generation and Whisper STT offloaded to an isolated Electron Utility Process.
- ✅ **Stable Bundles:** Fixed `electron-builder` native ASAR unpack paths for Windows `.exe` installers.

### `v0.6.1` — RAG Hardening

- ✅ **RAG IPC integrity:** Canonical `rag:index` / `rag:search` channels
- ✅ **Service split:** `ParseService`, `EmbeddingService`, `VectorStore`
- ✅ **Quality controls:** Tuned Top-K + minimum score filtering and source diversity
- ✅ **Supported parsing verified:** PDF / DOCX / XLSX pipeline with improved ~512-token chunking
- ✅ **Knowledge Base UI:** Panelized document manager with statuses and delete actions
- ✅ **Grounded answers:** Visible **Sources** section appended when RAG context is used

### `v0.6.0` — Image Generation Studio

- ✅ **Phase 8 (core):** Automatic1111 txt2img + img2img, PNG save to userData, checkpoint override
- ✅ **ComfyUI:** Reachability probe (`/system_stats` / `/queue`)
- ✅ **Models page:** Image generation checkpoints panel with active checkpoint picker
- ✅ **Model Store:** Search scope control — *All* / *Language · chat* / *Image · diffusion*
- ✅ **Image Gen UI:** Generation mode toggle, denoising slider for img2img

### `v0.5.0` — Markdown & System Prompt

- ✅ Full Markdown renderer with Cursed Blood syntax highlighting
- ✅ Copy button on all code blocks
- ✅ System prompt injected on every request

### `v0.4.0` — Conversation Sidebar

- ✅ Persistent conversation history panel with search, pin/unpin, delete
- ✅ DB hydration on app restart (last conversation auto-loaded)

### `v0.3.1` — Live Model Store

- ✅ HuggingFace Hub GGUF browser, Ollama Library live scrape
- ✅ Quantization picker modal, direct `hf.co/` pull with streaming progress

### `v0.3.0` — Model Management Page

- ✅ Installed model cards with size, params, quantization details
- ✅ Model select, pull (with real-time % progress bar), and delete

### `v0.2.0` — Core Chat + IPC

- ✅ Ollama streaming chat via `ipcMain.on` + `event.sender.send`
- ✅ SQLite schema with FTS5 for conversations and messages
- ✅ Streaming abort button

### `v0.1.0` — Foundation

- ✅ Electron + Vite + React + TypeScript scaffold
- ✅ Tailwind CSS + Cursed Blood design system
- ✅ Glassmorphism layout — TopBar, Sidebar, StatusBar, ParticleBackground
- ✅ Frameless window with custom controls

---

## ✦ Why KURUMI?

| The Old Way | The KURUMI Way |
|---|---|
| Pay monthly for API access | Run everything on your hardware |
| Your prompts train someone else's model | Nothing leaves your machine |
| One model, take it or leave it | Switch between 50+ models in one click |
| Locked into a single app surface | TUI for power users, GUI for richness, CLI for scripts |
| Large models need a data center GPU | AirLLM streams 70B+ models on a single consumer GPU |
| Basic chat UI | Rich Markdown, syntax highlighting, live artifacts |
| Upload files to third-party servers | Parse locally, embed locally, query locally |
| Generic grey interface | A UI you actually want to look at |
| Closed source, black box | MIT licensed, fully auditable |

---

## ✦ Contributing

KURUMI is being built in public. Contributions, issues, and ideas are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `git commit -m "feat: add voice input"`
4. Push and open a Pull Request

Please follow the existing code style: TypeScript strict, functional React components, Tailwind utility classes.

---

## ✦ Credits

Special thanks to [lyogavin](https://github.com/lyogavin) for creating [AirLLM](https://github.com/lyogavin/airllm), which powers the frontier-model streaming engine in KURUMI.

---

## ✦ License

MIT — take it, fork it, make it yours.

See [LICENSE](LICENSE) for full text.

---

<div align="center">

<br/>

```
「 Unlimited Void. Unlimited Intelligence. 」
```

<br/>

*Built with obsession. Themed with intention. Powered by open source.*

<br/>

[![Star on GitHub](https://img.shields.io/github/stars/bhoomik-codes/kurumi?style=social)](https://github.com/bhoomik-codes/kurumi)

</div>
