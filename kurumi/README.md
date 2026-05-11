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

*The last AI desktop client you'll ever need.*

<br/>

![Status](https://img.shields.io/badge/status-IN%20DEVELOPMENT-red?style=for-the-badge&color=8B0000)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-black?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20Ollama-darkred?style=for-the-badge&color=5C1A2A)
![License](https://img.shields.io/badge/license-MIT-red?style=for-the-badge&color=C41E3A)

<br/>

> *"Unlimited Void. Unlimited Intelligence."*

<br/>

---

</div>

## 𝕎𝕙𝕒𝕥 𝕚𝕤 𝕂𝕌ℝ𝕌𝕄𝕀?

**KURUMI** is a fully offline, privacy-first desktop application that brings the full power of large language models to your machine — no subscriptions, no data leaks, no corporate surveillance, no cloud dependency. Just raw, local intelligence wrapped in a UI so beautiful it looks like it was designed in the Reversed Cursed Technique.

Inspired by the visual brutality of **Jujutsu Kaisen**, KURUMI's interface bleeds deep crimson through neo-glassmorphism panels, glowing vein-like borders, and cursed energy particle effects. It doesn't just run AI — it *channels* it.

This is not another ChatGPT wrapper. This is what happens when you build a local AI client with no compromises.

---

## ✦ Features That Hit Like a Domain Expansion

### 🧠 Universal Model Support

Switch between any locally installed model in a single click. Llama, Mistral, Gemma, Qwen, DeepSeek, Phi — if Ollama can run it, KURUMI can use it. Download new models directly from inside the app, watch layer-by-layer progress, and get back to work. No terminal required.

Need a boost? Optionally connect an **NVIDIA NIM API key** to seamlessly fallback to lightning-fast cloud models (like Llama 3.1 405B) without leaving the UI.

### 📄 Document Intelligence

Drop in a **PDF, Word doc, Excel sheet, CSV, PowerPoint, or image** and ask anything about it. KURUMI parses, chunks, embeds, and stores your documents locally using a full RAG pipeline — embeddings generated on-device, indexed into a local vector store. Your files never leave your machine. Not even close.

> Supports: `.pdf` · `.docx` · `.xlsx` · `.csv` · `.pptx` · `.txt` · `.md` · `.png` · `.jpg` · `.webp`

### 🎨 Image Generation Studio

Integrated **Stable Diffusion** support via Automatic1111 or ComfyUI running locally. Generate images inline in chat or from the dedicated studio. Prompt enhancement via LLM, img2img, style presets, full parameter control. A full creative pipeline without leaving the app.

### ⚡ Artifacts — Like Claude, But Yours

When a model responds with code, KURUMI doesn't just show it — it **runs it**. Sandboxed artifact rendering for:

- `React` components — live preview, fully interactive
- `HTML` pages — rendered in sandboxed iframe
- `Charts & Graphs` — Recharts/D3 with the KURUMI dark theme baked in
- `Mermaid` diagrams — flowcharts, sequences, ER diagrams, Gantt
- `Math / LaTeX` — KaTeX rendering, properly beautiful
- `Code` — syntax-highlighted with a custom blood-red theme, runnable for Python/JS

### 🔍 Knowledge Base & RAG

Build a persistent, local knowledge base from your documents. Semantic search across everything you've ever uploaded. Ask multi-document questions. See exactly which chunks the model referenced. Toggle RAG per message. This is what "chat with your files" should actually feel like.

### 🪄 Multi-Model Comparison

Run the exact same prompt against multiple models simultaneously, side-by-side. See who gives the sharper answer. No context switching. No re-typing.

### 🎙️ Voice Input

Push-to-talk via keyboard shortcut. Powered by Web Speech API or a local Whisper.cpp binary if you want full offline transcription.

### 📚 Prompt Library & Personas

Save your best prompts as reusable templates with `{{variables}}`. Create AI personas with locked system prompts, model preferences, and temperatures. Switch from Code Assistant to Creative Writer to Research Analyst in one click.

### 📊 System Intelligence

Real-time GPU VRAM, RAM, CPU monitoring in the status bar. Token counter, generation speed (tok/s), Ollama process status, context window saturation — all visible at a glance.

---

## ✦ The Aesthetic

KURUMI isn't just functional. It's designed to make you *want* to open it.

```
Theme:        Neo-Glassmorphism × Dark Blood × Jujutsu Kaisen
Background:   #050305 — void black
Accent:       #C41E3A → #FF2244 — crimson to neon red
Glass panels: backdrop-filter: blur(16px) saturate(180%)
Borders:      Glowing red veins, 1px with radial box-shadow
Typography:   Cinzel (display) · JetBrains Mono (code) · Nunito (body)
Particles:    Floating cursed energy emitters on canvas background
Animations:   Framer Motion — panel reveals, message entrances, glow pulses
```

Every panel is layered glass. Every border glows like a cursed technique mid-activation. Every interaction has weight. This is what desktop software should feel like in 2025.

---

## ✦ Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 30 |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS + CSS Modules |
| Animation | Framer Motion 11 |
| State | Zustand 4 |
| LLM Runtime | Ollama |
| Embeddings | @xenova/transformers (ONNX, local) |
| Vector Store | LanceDB (embedded) |
| Database | SQLite via better-sqlite3 |
| Image Gen | Automatic1111 / ComfyUI |
| Charts | Recharts + D3 |
| Diagrams | Mermaid |
| Math | KaTeX |
| Artifact Runtime | @babel/standalone in sandboxed iframe |

> **100% offline capable.** Zero telemetry. Zero cloud. Your models, your data, your machine.

---

## ✦ Roadmap

```
Phase 1 — Core Chat + Ollama Integration         [ COMPLETED ]
Phase 2 — Document Intelligence + RAG            [ COMPLETED ]
Phase 3 — Cloud LLM Integration (NVIDIA NIM)     [ COMPLETED ]
Phase 4 — Artifact Rendering Engine              [ NEXT ]
Phase 5 — Image Generation Studio               [ COMING SOON ]
Phase 6 — Polish, Animations, Power Features     [ COMING SOON ]
Phase 7 — Packaged Releases (Win/Mac/Linux)      [ COMING SOON ]
```

**On the horizon:**

- 🤖 Agent mode with local tool use
- 🔌 Plugin system for community extensions
- 🗺️ Canvas mode — infinite whiteboard with AI chat nodes
- 🔊 Local TTS for spoken responses (Piper / Kokoro)
- 📺 Screen OCR — capture any region and send to the model
- 🔄 Workflow builder — chain prompts like a local n8n for AI
- 📈 Personal analytics dashboard — usage, model comparison, preference tracking

---

## ✦ Why KURUMI?

| The Old Way | The KURUMI Way |
|---|---|
| Pay monthly for cloud access | Run everything on your hardware |
| Pray your data isn't training someone's model | Local embeddings, local vectors, local everything |
| One model, take it or leave it | Switch between 50+ models instantly |
| Basic markdown in a browser tab | Live artifacts, charts, React components, Mermaid |
| Upload docs to a third-party server | Parse locally, embed locally, query locally |
| Generic grey UI you tolerate | A UI you actually want to look at |

---

## ✦ Prerequisites

Before running KURUMI, make sure you have:

- [**Ollama**](https://ollama.com) installed and running (`ollama serve`)
- At least one model pulled: `ollama pull llama3.2` or any model you prefer
- **Node.js 20+**
- For image generation (optional): [Automatic1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui) or [ComfyUI](https://github.com/comfyanonymous/ComfyUI) running locally

---

## ✦ Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/kurumi.git
cd kurumi

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run electron:rebuild

# Start in development mode
npm run dev
```

```bash
# Build for your platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

---

## ✦ Changelog

### Phase 4.5 — Cloud Integration & Resilience (Latest)
- **NVIDIA NIM Cloud API:** Added seamless dual-provider switching to flip between local Ollama models and lightning-fast cloud endpoints.
- **Parallel Probing:** Smart model picker that probes availability in real-time, grays out plan-gated models, and defaults to working free-tier options.
- **Robust Parsing:** Ground-up rewrite of the SSE streaming parser for stable cloud connections, plus in-chat error bubbles to prevent silent crashes.

### Phase 4 — Document Intelligence (RAG) & Settings
- **Local RAG Pipeline:** Fully offline document indexing using `@xenova/transformers` and LanceDB.
- **Embedding Upgrade:** Switched to `nomic-embed-text` (274MB) for 10-20x faster document chunking and vector storage directly on the CPU.
- **Persistent Settings:** New centralized configuration for default models, context windows, RAG chunk sizes, and API keys backed by SQLite.
- **Performance:** Instant bypass of the RAG pipeline when the knowledge base is empty.

### Phase 3 — Model Management & Sidebar
- **Built-in Model Store:** Browse, filter, and pull models directly from the Ollama library or HuggingFace GGUFs without touching a terminal.
- **Streaming Downloads:** Real-time, layer-by-layer download progress bars.
- **Sidebar Upgrades:** Full conversation history, search, pinning, and clean slate capabilities.

### Phase 2 — Core UI & Aesthetic
- **Design System:** Implemented the "Neo-Glassmorphism × Dark Blood" layout.
- **Markdown Engine:** Integrated custom syntax highlighting infused with the Cursed Blood theme.
- **State Architecture:** Fully wired Zustand stores handling real-time chat, streaming responses, and UI atoms.

### Phase 1 — Scaffold
- **Foundation:** Established the Electron + React + Vite + TypeScript architecture.
- **IPC & Storage:** Created the Ollama bridge and local SQLite instance via `better-sqlite3`.

---

## ✦ Contributing

KURUMI is being built in public. The architecture is documented, the vision is clear, and there's a lot of ground to cover.

If you want to help shape what local AI tooling looks like — contributions, issues, and ideas are welcome. Check `CONTRIBUTING.md` once the first public release drops.

---

## ✦ License

MIT — take it, fork it, make it yours.

---

<div align="center">

<br/>

```
「 Your data. Your models. Your domain. 」
```

<br/>

**KURUMI is coming.**

*Star the repo. Watch the build. The technique is already in motion.*

<br/>

---

*Built with obsession. Themed with intention. Powered by open source.*

</div>
