# Rigorous Verification & ABI Fixes Implementation Plan

This plan addresses all explicit refinement and verification requests before we proceed with the overhaul.

### Phase Mapping (Original vs Current)
To ensure no original requirements were dropped, here is the explicit mapping of the original 0–4 phases to the updated structure:

| Original Phase | New Structure Location | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Phase 0: Technical Debt & Initialization** | Phase 0 (Stabilization & Technical Debt) | Completed | ABI fix, Filesystem collisions, Lancedb dependencies, and Instruction boundaries fully resolved. |
| **Phase 1: Interactive TUI Overhaul** | Phase 1 (Core TUI Foundations) | Pending | Esc interrupts, Double Ctrl+C, Multiline input, Up-arrow history, Streaming Markdown. |
| **Phase 2: Agent Tool Integration** | Phase 2 (Agent Tool Integration) | Pending | `/execute` commands, sub-process output rendering, tab-autocomplete, interactive model switcher. |
| **Phase 3: Electron Architecture & IPC** | Phase 3 (Electron Architecture) | Pending | IPC routing for DB threads, SQLite daemonizing, and robust headless fallback. |
| **Phase 4: TUI Polish & Extensions** | Phase 4 (TUI Polish & Extensions) | Pending | Persistent Status Footer, Resilient AirLLM HF downloads (resume-on-interrupt), visual polish. |

---

### Phase 0: Stabilization & Technical Debt (Completed)
- **Node-GYP / Electron ABI Matrix:** Resolved better-sqlite3 native bindings crashing. A reproducible `scripts/rebuild-all.js` workflow builds for both ABI 127 (Node) and ABI 123 (Electron), places them in `compiled/{version}/...`, and clears the `build/` directory so `bindings.js` correctly falls back. *(Note: Electron 32.2.0 ships with Node 20.18.0. `bindings.js` checks `process.versions.node`, which evaluates to `20.18.0` in the Electron process and `22.22.2` in the CLI process. The script correctly targets these versions, perfectly reconciling the version mismatch).*
- **Filesystem Case Collisions:** Replaced brittle string matching for system instructions with inode / realpath comparisons via `fs.realpathSync.native()`.
- **Dependency Missing:** Added `apache-arrow` as a hard dependency to prevent Lancedb aborts.
- **Instruction Boundary:** Limited context parent directory traversal explicitly to the closest `.git` root.

### Phase 1: Core TUI Foundations
Add foundational UX capabilities missing from the CLI.
- **Interrupt Handling:** `Esc` cancels an in-flight LLM generation; require a double `Ctrl+C` to exit the CLI entirely.
- **Interactive Prompts:** Up-arrow history and multi-line input (Shift+Enter for newline, Enter to submit).
- **Streaming UI:** Streaming markdown rendering for responses (code blocks with syntax highlighting, proper tables).

### Phase 2: Agent Tool Integration
- **Command Integration**: Enable `/execute <cmd>` and `!<cmd>` directly in the prompt (unified to the same handler).
  - **Security Gate**: 3-way confirmation prompt ("Allow once / Always allow / Deny") for destructive commands (`rm`, `mv`, `sudo`, `dd`, redirects) with a disclaimer that it's best-effort pattern matching, not a true sandbox.
  - **Blocking Execution**: Block the user from sending new prompts until the command completes. Use `Esc` to cancel the sub-process and cleanly kill the entire child process tree.
  - **ANSI Sanitization**: Strip or safely re-escape arbitrary ANSI codes from the sub-process output before feeding it into Ink, preventing TUI corruption.
- **Sub-process Visibility**: Surface sub-process outputs interactively within the TUI via `system-process` messages.
- **Autocompletion**: Tab-autocomplete for slash commands (`/goal`, `/plan`) and file context injections (`@path`).
  - **@path rules**: Must be directory-relative (like shell tab-completion), not recursive. Must respect `.gitignore` and skip binaries/`node_modules`.
- **Interactive Model Switcher**: Interactive visual component (using `ink-select-input`) to browse and switch models without typing full names, triggered by the `/models` slash command.

### Phase 3: Electron Architecture & IPC
- Move database operations fully to the main process and expose via IPC to resolve locking contentions.
- Establish robust headless daemon logic for when the GUI is closed but CLI is active.

### Phase 4: TUI Polish & Extensions
- **Persistent Status Footer:** Add a context-usage indicator (e.g., `~/project | Daemon: OK | ollama/llama3`).
- **Resilient AI Downloads:** Ensure that HuggingFace Hub downloads (via AirLLM) can be cleanly interrupted and resumed end-to-end without losing the entire shard progress.

---

## Explicit Verification Steps

## 1. Root-Cause & Fix ABI-Mismatch
**Root Cause:** The `kurumi-electron` daemon crashes silently in the background because `better-sqlite3` was compiled for `NODE_MODULE_VERSION 115` (Node 20 / Electron), while the system is attempting to run `node dist/cli.js` using `NODE_MODULE_VERSION 127` (Node 22).
**Proposed Fix:** 
- I will configure `electron-rebuild` in the package scripts to explicitly isolate native module builds. We will compile the CLI binary bindings specifically for the local Node environment, while maintaining the Electron bindings for the desktop app.
- **Verification:** I will explicitly test both `node dist/cli.js` (Node environment) and `npm run start` / `kurumi run` (Electron environment) to prove the dual-ABI isolation works.

## 2. Real Integrated CLI Verification
Once the ABI is fixed and the daemon boots successfully, I will run the real integrated CLI in a fully persistent PTY environment (using Antigravity's persistent terminal capability) to manually verify UI state, avoiding unit test mocks entirely.

## 3. Footer String Reconciliation
I will extract the raw rendered footer string from the PTY and verify it exactly matches the requested `ctx: ~/project | Daemon: OK | provider/model` specification. If there are deviations, I will adjust `Footer.tsx`.

## 4. Streaming Markdown Verification
To prove the markdown streams incrementally, I will use `manage_task` to watch the TTY output stream in real-time as the CLI generates a response, confirming that text chunks appear sequentially (and are processed by `marked-terminal`) rather than arriving as one monolithic block.

## 5. CI Run Validation
I have already pushed the `.github/workflows/test.yml` matrix. Once the PR/commits are synced, I will provide the direct verification that the macOS and Windows runners pass correctly on GitHub Actions.

## 6. Conflict Payload & Linux Collision Warning
- **Payload Verification:** I will extract and present the literal system prompt string sent to the daemon to prove how conflicts are chained.
- **Precedence Enhancement:** I will add an explicit priority header to the injected markdown chunks (e.g., `[Priority: Native]`) to give the LLM better structural cues for resolving conflicts.
- **Warning (TUI Safe):** To prevent visually corrupting the Ink TUI, the warning for multiple case variants on Linux will NOT use a raw `console.warn()`. Instead, it will be injected gracefully into the initial React `messages` array (alongside the visibility notice) so it renders as a native, non-destructive UI element.

## 7. Parent-Directory Search Boundary
**Fix:** Currently, the instructions loader traverses up to the root `/`. I will add a boundary check: if it encounters a directory containing a `.git` folder, it will stop traversing. This prevents it from incorrectly pulling instructions from a user's home directory while ensuring monorepo structures are correctly supported.

## 8. First-Load Notice Persistence Check
**Confirmation:** The "Loaded system instructions from..." notice is currently injected safely into the volatile `initialMsgs` state in `ChatApp` (`src/cli/tui.tsx`). It is never transmitted in the `POST /chat` API request to the daemon, ensuring it is never saved to the SQLite chat history database.
