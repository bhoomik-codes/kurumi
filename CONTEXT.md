# KURUMI Codebase Context File

*Context file for understanding the KURUMI codebase. Last updated: 2026-05-13*

## Repository layout

This workspace contains **two parallel app trees**:

1. **Root** — `electron/`, `src/`, `package.json` at the repository root (primary `npm run dev` target for this fork).
2. **`kurumi/`** — Nested Electron + React tree with extended features (RAG, NVIDIA, artifacts in `kurumi/src`), kept in sync for Image Gen / Model Store where files were mirrored.

## Root tree (`local-guide/`)

```
local-guide/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   ├── ollama.ipc.ts
│   │   ├── sqlite.ipc.ts
│   │   ├── store.ipc.ts      ← Ollama search + HF GGUF (catalog: language | image | all)
│   │   ├── system.ipc.ts
│   │   └── imagegen.ipc.ts   ← A1111 txt2img / img2img / sd-models / save PNG
│   └── services/
│       ├── DatabaseService.ts
│       ├── OllamaService.ts
│       └── ImageGenService.ts
├── src/
│   ├── pages/
│   │   ├── Models.tsx        ← Ollama models + SD checkpoint panel
│   │   ├── ModelStore.tsx    ← Dual source + search scope (LLM vs image)
│   │   ├── ImageGen.tsx      ← Phase 8 studio UI
│   │   └── …
│   └── stores/
│       └── modelStore.ts     ← activeModel + activeImageGenCheckpoint (localStorage)
└── kurumi/                   ← see nested README; mirrors many of the same pages
```

## Key technologies (root)

| Layer | Technology |
|-------|------------|
| Desktop | Electron 30 |
| UI | React 18 + TypeScript + Tailwind |
| LLM | Ollama (local) |
| Image gen | AUTOMATIC1111 REST (`ImageGenService`) |
| Notifications | Sonner (renderer toasts) |
| Tests | Vitest (Node unit tests) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| DB | better-sqlite3 + FTS5 |

## Core functionality

### Chat & models
- Ollama streaming, SQLite persistence, Models page for installed Ollama models.
- **Image checkpoints:** `Models.tsx` loads `/sdapi/v1/sd-models` via `imagegen:sd-models`; selection stored in Zustand + `localStorage` (`kurumi.imageGen.checkpoint`).
- **Model Store:** Shared debounced search; **Search scope** toggles `catalog` for HuggingFace (`store:hf:search`) and client filters for Ollama library HTML results.

### Image Generation (Phase 8)
- **IPC:** `imagegen:probe`, `imagegen:sd-models`, `imagegen:txt2img`, `imagegen:img2img`, `imagegen:save-image`.
- **Automatic1111:** txt2img + img2img; optional `override_settings.sd_model_checkpoint`; PNG save under `userData/generated-images`.
- **ComfyUI:** probe only (no `/prompt` queue in this build).
- **Timeout tuning:** `KURUMI_A1111_TIMEOUT_MS` for txt2img/img2img, `KURUMI_A1111_PROBE_MS` for connectivity probes.
- **User feedback:** Sonner toasts in the renderer surface probe / generation / save successes and failures.

### Document Intelligence (Phase 6)
- **RAG IPC:** canonical `rag:index` and `rag:search` channels are registered in `kurumi/electron/ipc/rag.ipc.ts` (legacy `docs:*` remains for compatibility).
- **Service architecture:** `kurumi/electron/services/ParseService.ts`, `EmbeddingService.ts`, and `VectorStore.ts` handle extraction, embeddings, and ranked retrieval.
- **Grounding:** chat responses include explicit `Sources` entries (`filename` + `chunk`) when local context is injected.

### IPC summary (root)
| Channel | Purpose |
|---------|---------|
| `ollama:*` | Chat, models, pull, delete, warmup |
| `sqlite:*` / `db:*` | Conversations & messages (`sqlite.ipc.ts` uses `db:` prefix) |
| `store:ollama:search` | Scrape/query Ollama library |
| `store:hf:search` | HF GGUF models + `catalog` filter |
| `imagegen:*` | Stable Diffusion WebUI bridge |

## Tests & CI

- **Unit tests**: Vitest suite in `electron/services/imageGenPayload.test.ts` exercises URL normalization and txt2img payload construction (including checkpoint overrides).
- **CI workflow**: `.github/workflows/ci.yml` runs `npm ci`, typechecks renderer + Electron (`tsconfig.json`, `tsconfig.node.json`), and executes `npm run test` on pushes and pull requests.

## Roadmap (aligned with README)

| Phase | Status | Notes |
|-------|--------|--------|
| 1–5b | Done | Scaffold through Markdown / sidebar (per README) |
| 6 | **Done** | Document intelligence finalized in `kurumi/` (RAG IPC, parsing, retrieval quality, source attribution) |
| 7 | Done in `kurumi/src` | Artifacts + Mermaid + KaTeX in nested renderer |
| 8 | **Done (core) in root** | A1111 txt2img/img2img + Models + Store scope; Comfy probe only |
| 9+ | Planned | Voice, personas, releases, etc. |

## Build

```bash
npm install   # at repository root
npm run dev
```

---

*MIT licensed. Ollama must be running for chat; AUTOMATIC1111 optional for Image Gen.*
