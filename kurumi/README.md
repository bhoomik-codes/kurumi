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

*The last local AI desktop client you'll ever need.*

<br/>

[![Status](https://img.shields.io/badge/status-ACTIVE%20DEVELOPMENT-crimson?style=for-the-badge&color=8B0000)](https://github.com/bhoomik-codes/kurumi)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-black?style=for-the-badge)](https://github.com/bhoomik-codes/kurumi/releases)
[![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-red?style=for-the-badge&color=C41E3A)](LICENSE)

<br/>

> *「 Your data. Your models. Your domain. 」*

<br/>

</div>

---

## 📸 Screenshots

<div align="center">

### 💬 Chat — Markdown Rendering with Conversation Sidebar

![Chat with Markdown rendering, conversation sidebar, and table output](kurumi/assets/screenshots/chat_markdown.png)

<br/>

### 🧠 Local Models Manager

![Local models page showing installed models with size, parameters and quantization](kurumi/assets/screenshots/models_page.png)

<br/>

### 🛍️ Model Store — Live Ollama Library Browser

![Model Store with live Ollama library results and install buttons](kurumi/assets/screenshots/model_store.png)

<br/>

### 🩸 New Chat Empty State

![Chat empty state with "The void awaits your query" and conversation history sidebar](kurumi/assets/screenshots/chat_empty.png)

</div>

---

## 🩸 What is KURUMI?

**KURUMI** is a fully offline, privacy-first desktop application that brings the full power of large language models to your local machine — zero subscriptions, zero data leaks, zero cloud dependency. Run frontier-class AI on your own hardware. Own your data completely.

Inspired by the visual brutality of **Jujutsu Kaisen**, KURUMI's "Cursed Blood" interface bleeds deep crimson through neo-glassmorphism panels, glowing vein-like borders, and particle energy effects. It doesn't just run AI — it *channels* it.

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

### ⚡ Interactive Artifacts Engine

- **Sandboxed Execution** — When models write code, KURUMI safely runs it.
- **React Components** — Live preview and interact with generated React UIs.
- **HTML/CSS Sandboxes** — Renders vanilla web code in an isolated iframe.
- **Charts & Graphs** — Instantly draws `recharts` and `d3` components, deeply integrated with the app's dark theme.
- **Mermaid Diagrams** — Fully zoomable interactive Flowcharts, Sequence Diagrams, and ER Models.
- **Math / KaTeX** — Precise, beautiful rendering for complex mathematical equations.

### 🖼️ Image Generation Studio

- **Automatic1111** — txt2img and img2img with sampler / steps / CFG / size / seed, optional checkpoint override, denoise control for img2img
- **Save to disk** — one-click export of the current preview into the app data directory as PNG
- **ComfyUI** — quick connection test to a local Comfy server (full workflow queue is not wired in this build)

### 🎙️ Cursed Speech (Voice & TTS)

- **Local Speech-to-Text (STT)** — Push-to-talk microphone powered by **Whisper ONNX** running in a dedicated background worker process.
- **Cursed Waveform** — Real-time crimson waveform visualizer reflecting your voice intensity.
- **Auto-Read TTS** — Responses read aloud using the OS-native `SpeechSynthesis` API.
- **Personas** — Choose your TTS persona (Cursed, Whisper, Domain) directly from the settings.

### 🧠 Model Management & Cloud Fallback

- **Installed models page** — see all local Ollama models with size, parameters, quantization level, and family
- **Cloud Models via NVIDIA NIM** — Seamlessly fallback to lightning-fast cloud endpoints (like Llama 3.1 405B) when local compute isn't enough, instantly switchable in chat.
- **Image checkpoints (A1111)** — separate panel to list Stable Diffusion checkpoints from your WebUI API and mark which one Image Gen should use
- **One-click select** — switch active model from the Models page
- **Pull new models** — download directly from inside the app with a real-time streaming progress bar (%)
- **Delete models** — with double-confirm safety guard

### 🛍️ Model Store

- **Dual-source browser** — browse live from **Ollama Library** and **HuggingFace Hub** simultaneously
- **Catalog scope** — filter search results toward **language / chat models** vs **image & diffusion** (plus *All*) on both tabs
- **HuggingFace GGUF search** — sorted by Most Downloaded / Liked / Newest
- **Quantization picker** — see all available `.gguf` variants per HuggingFace model with file sizes
- **Direct install** — `ollama pull hf.co/org/repo:Q4_K_M` wired directly to streaming progress modal
- **Pagination** — navigate pages of results
- **Installed detection** — already-installed models show a green "Installed" badge across both sources

### 🎨 Aesthetics ("Cursed Blood" Theme)

- **Deep void background** `#050305` with floating red particle emitters
- **Glassmorphism panels** — `backdrop-filter: blur(16px)` layered glass throughout
- **Red accent system** — `#8B0000` → `#C41E3A` → `#FF2244` gradient hierarchy
- **Glowing borders** — red vein-like borders with radial `box-shadow` on active elements
- **Animated loading states** — pulsing orb, streaming cursor, gradient progress bars
- **Frameless window** — custom title bar with minimize/maximize/close controls

### 🗄️ Data Persistence & Multi-Process Architecture

- **SQLite database** — all conversations and messages stored locally via `better-sqlite3`
- **Full-text search** — FTS5 index on message content
- **Conversation hydration** — last conversation automatically restored on app restart
- **LanceDB vector store (RAG)** — document embeddings and chunk text persist under the app data directory at `vectorstore/`. Similarity search uses cosine distance with `topK` / `minScore` pushed into LanceDB (`distanceRange` + indexed-document filters). Chunk metadata (`document_id`, `filename`, `page_index` as chunk order) is stored as JSON in the `metadata` column for Sources in chat.
- **Utility Process Worker** — Heavy document parsing, vector generation (`nomic-embed-text`), and Whisper STT inference are fully offloaded to an isolated Electron Utility Process. This ensures the main UI thread never freezes.
- **Native modules** — `@lancedb/lancedb` ships platform binaries; `npm install` runs `electron-builder install-app-deps` so bindings match Electron. ASAR unpack configurations ensure stable `.exe` / `.app` bundled builds. If you change Electron versions or hit ABI errors on Linux (e.g. Fedora), run `npm run postinstall` or `npx electron-rebuild -f -w @lancedb/lancedb`.

---

## ✦ Planned Features (Roadmap)

```
✅ Phase 1 — Project scaffold, Electron + Vite + Tailwind
✅ Phase 2 — Ollama IPC bridge, streaming chat, SQLite persistence
✅ Phase 3 — Chat UI polish, loading states, DB hydration on reload
✅ Phase 4 — Models page + Model Store (Ollama + HuggingFace live)
✅ Phase 5 — Conversation Sidebar with history, search, pin/delete
✅ Phase 5b — Markdown renderer + syntax highlighting + system prompt
✅ Phase 6 — Document Upload & RAG (PDF, DOCX, local vector search)
✅ Phase 7 — Artifact rendering (React live preview, Mermaid, LaTeX)
✅ Phase 8 — Image Generation Studio (Automatic1111 core + ComfyUI probe)
✅ Phase 9 — Cursed Speech (Voice & TTS via Whisper ONNX + Web Speech API)
✅ Phase 10 — Cloud LLM Integration (NVIDIA NIM fallback)
⬜ Phase 11 — Prompt Library, Personas, Model Comparison
⬜ Phase 12 — Packaged releases (Win / macOS / Linux)
```

**On the horizon:**

- 🤖 Agent mode with local tool use (web search, file system)
- 🔌 Plugin system for community extensions
- 🗺️ Canvas mode — infinite whiteboard with AI chat nodes
- 📺 Screen OCR — capture any region and send to the model
- 🔄 Workflow builder — chain prompts like a local n8n for AI

---

## ✦ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | [Electron](https://electronjs.org) | 30 |
| Frontend | [React](https://react.dev) + TypeScript | 18 / 5 |
| Build Tool | [Vite](https://vitejs.dev) + vite-plugin-electron | 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) + Custom CSS | 3 |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) | 4 |
| Routing | React Router DOM | 6 |
| LLM Runtime | [Ollama](https://ollama.com) | Latest |
| Voice STT | Whisper ONNX (`@xenova/transformers`) | v2 |
| Voice TTS | Native Web Speech API (`SpeechSynthesis`) | OS Native |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + FTS5 | 9 |
| RAG / vectors | [LanceDB](https://lancedb.github.io/lancedb/) (`@lancedb/lancedb`, embedded) | 0.27 |
| Artifact Runtime | `@babel/standalone` (in sandboxed iframe) | Latest |
| Markdown | react-markdown + remark-gfm | Latest |
| Syntax Highlighting | react-syntax-highlighter (Prism) | Latest |
| Notifications | [Sonner](https://sonner.emilkowal.ski) | Latest |
| Testing | [Vitest](https://vitest.dev) | 2 |
| Icons | [Lucide React](https://lucide.dev) | Latest |
| IDs | uuid v4 | 9 |

> **100% offline capable.** Zero telemetry. Zero cloud calls (except model browsing & optional NVIDIA NIM). Your models, your data, your machine.

---

## ✦ Architecture

```text
local-guide/
└── kurumi/                    ← Electron application root
    ├── electron/              ← Main process (Node.js)
    │   ├── main.ts            ← App lifecycle, window, CSP
    │   ├── preload.ts         ← Secure contextBridge IPC bridge
    │   ├── ipc/
    │   │   ├── ollama.ipc.ts      ← Chat streaming, model list, pull, delete
    │   │   ├── sqlite.ipc.ts      ← Conversation & message CRUD
    │   │   ├── store.ipc.ts       ← Ollama library + HuggingFace API proxy
    │   │   ├── imagegen.ipc.ts    ← A1111 txt2img / img2img / checkpoints / save
    │   │   └── voice.ipc.ts       ← Whisper STT audio bridge
    │   ├── worker/                ← UTILITY PROCESS (Heavy workloads)
    │   │   ├── index.ts           ← Worker entry point
    │   │   ├── ragWorkerTasks.ts  ← Document parsing & LanceDB indexing
    │   │   └── voiceWorkerTasks.ts← Whisper ONNX transcription
    │   └── services/
    │       ├── WorkerManager.ts       ← Spawns & communicates with Utility Process
    │       ├── OllamaService.ts       ← fetch-based streaming client
    │       ├── ImageGenService.ts     ← Stable Diffusion WebUI bridge
    │       └── DatabaseService.ts     ← SQLite init, schema, FTS5
    ├── src/                   ← Renderer process (React)
    │   ├── pages/
    │   │   ├── Chat.tsx           ← Main chat interface
    │   │   ├── Models.tsx         ← Installed model manager
    │   │   ├── ModelStore.tsx     ← Live Ollama + HuggingFace browser
    │   │   ├── Settings.tsx       ← App configuration & Voice settings
    │   │   └── ImageGen.tsx       ← (Phase 8)
    │   ├── components/
    │   │   ├── chat/
    │   │   │   ├── MessageBubble.tsx      ← User/assistant message
    │   │   │   ├── ChatInput.tsx          ← Input + Mic + Waveform
    │   │   │   └── CursedWaveform.tsx     ← Voice canvas visualizer
    │   │   ├── artifacts/             ← (Phase 7) Sandboxed rendering engine
    │   │   └── layout/
    │   │       ├── TopBar.tsx             ← Frameless window controls
    │   │       ├── Sidebar.tsx            ← App navigation
    │   │       └── StatusBar.tsx          ← System Info overlay
    │   ├── stores/
    │   │   ├── chatStore.ts       ← Conversations, messages, stream state
    │   │   ├── voiceStore.ts      ← Voice recording state & TTS settings
    │   │   └── settingsStore.ts   ← App preferences
    │   └── hooks/
    │       └── useVoice.ts        ← Web Audio API mic capture + SpeechSynthesis
```
KURUMI is built on a modern **Multi-Process Architecture** to ensure the interface never drops a frame, no matter how hard the AI is thinking:

1. **Main Process (`electron/main.ts`)**: The orchestrator. Handles window management, strict Content Security Policies (CSP), and secure IPC bridges. It also manages the local SQLite database.
2. **Renderer Process (`src/`)**: The React frontend. Handles the entire "Cursed Blood" UI, Canvas animations, state management (Zustand), and streaming Markdown rendering.
3. **Utility Process (`electron/worker/`)**: The heavy lifter. AI tasks like LanceDB vector generation (`nomic-embed-text`) and Whisper ONNX local speech transcription are fully isolated here. Because they run in a completely separate OS-level process, the UI remains perfectly fluid at 60FPS even when crunching massive PDFs or audio streams.

All native node modules (`better-sqlite3`, `@lancedb/lancedb`) are pre-compiled against the exact Node version shipped inside Electron to ensure stable standalone executables without missing `.node` binary errors.
---

## ✦ Prerequisites

Before running KURUMI, ensure you have:

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | 20+ | LTS recommended |
| [Ollama](https://ollama.com) | Latest | Must be running (`ollama serve`) |
| At least one LLM | Any | `ollama pull llama3.2:3b` |
| Optional: AUTOMATIC1111 WebUI | Local | For Image Gen (`--api` enabled; default port 7860) |
| Optional: ComfyUI | Local | Connection test only in this build (port 8188 typical) |
| Git | Any | For cloning |
| RAM | 4 GB minimum | 8 GB+ recommended for 7B+ models |

---

## 🐳 Docker Setup

Run the full **nested** KURUMI tree under [`kurumi/`](kurumi/) (Electron 30, `@lancedb/lancedb`, `better-sqlite3`, RAG utility process) inside a Debian Bookworm + Node 20 image. Native modules are rebuilt with `electron-rebuild` in the container so binaries match the Linux glibc inside the image—no more host/ABI mismatch.

### Prerequisites (Docker path only)

- [Docker Engine](https://docs.docker.com/engine/install/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2 (`docker compose`)

You do **not** need Node.js or a local `npm install` on the host for this path.

### Build and run

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose up --build
```

On first launch, allow the GUI stack to finish compiling; the Electron window should appear on your display (X11) or in the browser (noVNC), depending on `KURUMI_GUI_MODE` below.

### Data persistence

Compose mounts a named volume on `XDG_CONFIG_HOME=/kurumi/persist`. Electron resolves `app.getPath('userData')` to `/kurumi/persist/kurumi`, which holds:

- SQLite (`kurumi.db`) and FTS index
- LanceDB / `vectorstore/`
- Hugging Face cache for embeddings (`hf-cache/`)
- Logs such as `logs/rag-worker.log`

The volume `kurumi-userdata` survives `docker compose down`; remove it only if you intend to wipe local data: `docker volume rm local-guide_kurumi-userdata` (prefix may match your project directory name).

### GUI: X11 (default)

The compose file passes through `DISPLAY` and `/tmp/.X11-unix` so the container draws on your host X server.

**Fedora / Linux (host X11)**

```bash
xhost +local:docker
docker compose up --build
```

If the window does not appear, confirm `echo $DISPLAY` (often `:0` or `:1`) and that you are in the same graphical session.

**Windows (VcXsrv or Xming)**

1. Start VcXsrv (or Xming) with “Disable access control” or add your Docker/WSL subnet to X11 access control.
2. Set `DISPLAY` before compose, e.g. `set DISPLAY=host.docker.internal:0` in **cmd**, or in PowerShell: `$env:DISPLAY='host.docker.internal:0'`.
3. Run `docker compose up --build` from the repo root.

**macOS**

Install [XQuartz](https://www.xquartz.org/), log out and back in, then `xhost +localhost` and use `DISPLAY=host.docker.internal:0` (or your LAN IP) when launching compose.

### GUI: VNC / noVNC (no host X11)

Run the stack with an in-container TigerVNC display and noVNC on port **6080**:

```bash
KURUMI_GUI_MODE=vnc docker compose up --build
```

Open a browser on the host to `http://127.0.0.1:6080/vnc.html` and connect (passwordless VNC is intended for **local dev only**).

### Ollama endpoint from inside the container

`localhost` inside the container is **not** your host. Either:

- Run Ollama on the host and, in **KURUMI → Settings**, set the Ollama base URL to `http://host.docker.internal:11434` (Docker Desktop / Compose with `host-gateway`), or to your host’s LAN IP on pure Linux Docker, **or**
- Use **host networking** on Linux (`docker compose` override or `docker run --network host`) so `http://localhost:11434` matches the host, **or**
- Start the bundled Ollama service (below) and point KURUMI at `http://ollama-service:11434`.

### Optional Compose service: Ollama + NVIDIA GPU

For machines such as the **Acer Nitro** line with an NVIDIA GPU, install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) on the host so Docker can schedule GPU workloads. Then enable the profile:

```bash
docker compose --profile ollama-gpu up --build
```

This starts `ollama/ollama` with the Compose `gpus` device request for **all** NVIDIA GPUs (same effect as `docker run --gpus all`). In KURUMI **Settings**, set the Ollama URL to `http://ollama-service:11434`. Models are stored in the `ollama-models` named volume.

The `kurumi-app` service does **not** require a GPU; only the optional `ollama-service` uses GPU passthrough when that profile is active.

### Graceful shutdown

The main process handles `SIGTERM` / `SIGINT` by calling `app.quit()`, which runs the existing `before-quit` path: the RAG utility process receives a `shutdown` RPC (LanceDB / workers), then SQLite is closed as the app exits. Compose should stop with `docker compose stop` (or Ctrl+C) rather than `docker kill` whenever possible.

### Environment reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `KURUMI_DOCKER` | `1` in image | Enables container-safe Chromium flags in `electron/main.ts`. |
| `KURUMI_DEBUG_WORKER` | `1` in compose | Mirrors RAG worker stdout into the container logs. |
| `KURUMI_GUI_MODE` | `x11` | `x11` uses host `DISPLAY`; `vnc` starts TigerVNC + noVNC. |
| `DISPLAY` | `:0` | Host X11 display socket mapping. |
| `XDG_CONFIG_HOME` | `/kurumi/persist` | Root for Electron `userData` (`…/kurumi`). |

---

## 🌱 Complete Newbie Setup Guide

If you've never run local AI before, don't worry. This guide will take you from zero to fully operational in minutes.

### Step 1: Install the Prerequisites

KURUMI runs entirely on your hardware, which means it requires a few standard tools to run:
1. **[Node.js](https://nodejs.org)**: Download and install the **LTS (Long Term Support)** version. This gives your computer the engine needed to run JavaScript desktop applications.
2. **[Git](https://git-scm.com/downloads)**: Download and install Git. This lets you securely download the KURUMI codebase to your machine.
3. **[Ollama](https://ollama.com)**: This is the actual AI engine that runs the models locally. Download, install, and leave it running in the background.

### Step 2: Download Your First AI Model

Once Ollama is installed, open your Terminal (Mac/Linux) or Command Prompt/PowerShell (Windows) and type:

```bash
ollama pull llama3.2:3b
```
*This downloads a highly optimized, lightning-fast model from Meta (about 2GB). Leave the terminal open while it downloads.*

### Step 3: Clone and Install KURUMI

In that same terminal, type these commands one by one, pressing Enter after each:

```bash
# 1. Download the KURUMI code
git clone https://github.com/bhoomik-codes/kurumi.git

# 2. Enter the project folder
cd kurumi/kurumi

# 3. Install all the necessary app dependencies
npm install
```

### Step 4: Launch the Application

You're ready! Start the app with:

```bash
npm run dev
```

The KURUMI window will open automatically. It will instantly connect to your local Ollama instance, detect the model you downloaded, and you can start chatting completely offline!

### (Optional) Step 5: Connect Cloud Models (NVIDIA NIM)
If your computer struggles to run local models, you can connect to massive cloud models for free:
1. Click the **Settings** (gear) icon in the KURUMI sidebar.
2. Scroll to the **Cloud Models (NVIDIA NIM)** section.
3. Grab a free API key from [build.nvidia.com](https://build.nvidia.com) and paste it there.
4. You can now select massive 405B frontier models directly from the chat interface!

---

## ✦ Building for Production

```bash
# Build for your current platform
npm run build

# Platform-specific builds
npm run build:win    # Windows (.exe installer)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage + .snap)
```

Built artifacts are output to `dist/`.

---

## ✦ Changelog

### `v1.0.0` — The Domain Expansion *(Latest)*

- ✅ **Phase 9 — Cursed Speech (Voice & TTS):** Added fully local Whisper ONNX STT in the utility process and Web Speech API TTS for auto-reading responses.
- ✅ **Interactive Artifacts Engine:** Sandboxed iframe execution for React, Recharts, Mermaid, and KaTeX right inside the chat window.
- ✅ **NVIDIA NIM Cloud Fallback:** Seamless dual-provider switching to flip between local Ollama models and lightning-fast cloud endpoints.
- ✅ **Multi-Process Architecture:** Extract heavy LanceDB embedding generation and Whisper transcription out of the main thread and into an Electron Utility Process.
- ✅ **Stable Bundles:** Fixed `electron-builder` native ASAR unpack paths to ensure standalone `.exe` installers work perfectly on Windows without runtime binary errors.

### `v0.6.1` — Phase 6 finalized: RAG hardening

- ✅ **RAG IPC integrity:** added canonical `rag:index` / `rag:search` channels (while keeping `docs:*` compatibility)
- ✅ **Service split:** parsing, embedding, and vector retrieval extracted into dedicated services (`ParseService`, `EmbeddingService`, `VectorStore`)
- ✅ **Quality controls:** tuned Top-K + minimum score filtering and source diversity to reduce noisy chunk injection
- ✅ **Supported parsing verified:** PDF / DOCX / XLSX extraction pipeline and improved chunking defaults (~512-token chunks with overlap)
- ✅ **Knowledge Base UI:** finalized panelized document manager with statuses and delete actions
- ✅ **Grounded answers:** assistant output now appends a visible **Sources** section when RAG context is used
- ✅ **Runtime stability:** indexing yields frequently to keep Electron responsive on large files and unloads embedding model after indexing

### `v0.6.0` — Image Generation Studio & model discovery

- ✅ **Phase 8 (core):** Automatic1111 txt2img + img2img over local REST (`imagegen:*` IPC), PNG save to app `userData/generated-images`, checkpoint override via `override_settings`
- ✅ **ComfyUI:** reachability probe (`/system_stats` / `/queue`); queue workflows not bundled in this release
- ✅ **Models page:** dedicated **Image generation checkpoints** panel — load SD checkpoints from WebUI, pick active checkpoint for the studio (syncs with Image Gen)
- ✅ **Model Store:** **Search scope** control — *All* / *Language · chat* / *Image · diffusion* (HuggingFace GGUF uses `pipeline_tag` / hub filters; Ollama library uses name heuristics)
- ✅ **Image Gen UI:** generation mode toggle, denoising slider for img2img, optional checkpoint dropdown after connect
- ✅ **Stability & feedback:** centralized IPC error logging with stack traces in dev, Sonner toasts for probe/generation/save failures, tunable A1111 timeouts via `KURUMI_A1111_TIMEOUT_MS` / `KURUMI_A1111_PROBE_MS`, and initial Vitest + CI coverage for imagegen payload helpers.

### `v0.5.0` — Markdown & System Prompt

- ✅ Full Markdown renderer with Cursed Blood syntax highlighting
- ✅ Copy button on all code blocks
- ✅ System prompt injected on every request (Kurumi persona + formatting rules)
- ✅ User messages rendered as plain text, assistant as rich Markdown

### `v0.4.0` — Conversation Sidebar

- ✅ Persistent conversation history panel
- ✅ Per-conversation search, pin/unpin, delete
- ✅ DB hydration on app restart (last conversation auto-loaded)
- ✅ "New Chat" button with instant state reset

### `v0.3.1` — Live Model Store

- ✅ HuggingFace Hub GGUF browser (sorted by downloads/likes/newest)
- ✅ Ollama Library live scrape
- ✅ Quantization picker modal per HF model
- ✅ Direct `hf.co/` pull with streaming progress bar

### `v0.3.0` — Model Management Page

- ✅ Installed model cards with size, params, quantization details
- ✅ Model select, pull (with real-time % progress bar), and delete
- ✅ Curated offline model registry as fallback

### `v0.2.0` — Core Chat + IPC

- ✅ Ollama streaming chat via `ipcMain.on` + `event.sender.send`
- ✅ Loading indicator ("Summoning from the void...")
- ✅ SQLite schema with FTS5 for conversations and messages
- ✅ Streaming abort button

### `v0.1.0` — Foundation

- ✅ Electron + Vite + React + TypeScript scaffold
- ✅ Tailwind CSS + Cursed Blood design system
- ✅ Glassmorphism layout — TopBar, Sidebar, StatusBar, ParticleBackground
- ✅ Frameless window with custom controls
- ✅ Secure IPC bridge via `contextBridge`

---

## ✦ Why KURUMI?

| The Old Way | The KURUMI Way |
|---|---|
| Pay monthly for API access | Run everything on your hardware |
| Your prompts train someone else's model | Nothing leaves your machine |
| One model, take it or leave it | Switch between 50+ models in one click |
| Basic chat UI | Rich Markdown, syntax highlighting, live artifacts |
| Upload files to third-party servers | Parse locally, embed locally, query locally |
| Generic grey interface | A UI you actually want to look at |
| Closed source, black box | MIT licensed, fully auditable |

---

## ✦ Developer notes

- **Environment flags**: `KURUMI_A1111_TIMEOUT_MS` (txt2img/img2img timeout ceiling in ms), `KURUMI_A1111_PROBE_MS` (probe timeout ceiling in ms).
- **Tests**: `npm run test` runs Vitest over Electron-side helpers (currently imagegen payloads); CI also runs `tsc` for renderer + Electron main.
- **IPC logging**: all `imagegen:*` handlers use a shared `ipcLogger` for structured error events with messages and stack traces in development.

## ✦ Contributing

KURUMI is being built in public. Contributions, issues, and ideas are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `git commit -m "feat: add voice input"`
4. Push and open a Pull Request

Please follow the existing code style (TypeScript strict, functional React components, Tailwind utility classes).

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
