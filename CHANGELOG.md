# Changelog

## [v2.0.0] - Daemon Architecture & Polish

### Added
- **Daemon (`kurumid`)**: A robust, persistent backend server over HTTP.
- **Interactive TUI & One-shot CLI**: Use `kurumi` for TUI or `kurumi --ask "Your question"` for CLI.
- **Setup & Doctor Commands**: Added `kurumi setup` and `kurumi doctor` to verify environment health.
- **`.env` Configuration**: Centralized all port and host config into a `.env` system.

### Changed
- **BREAKING CHANGE**: Bare `kurumi` now opens the TUI. The GUI uses HTTP/IPC and is launched with `kurumi run`.

### Fixed
- **SQLite Locking Errors**: The single-writer daemon fixes `database is locked` concurrency issues.
- **`pkg` Snapshot Path Resolution**: Fixed AirLLM supervisor failing to resolve the correct script path when running from the packaged binary.
- **Crash Recovery**: Supervisor recovery verified against live process (Supervisor restores service after an unexpected exit).

### Performance
- **Warm-Model Latency**: Model memory residency is now maintained. Warm-model latency measured at ~1.0s vs ~15.7s for cold requests.

---

## [v1.0.0] - The Domain Expansion

### Added
- **Interactive TUI**: A new terminal user interface powered by Ink. Launch it with `kurumi`.
- **One-shot CLI**: Use `kurumi --ask "Your question"` for a quick, pipe-able response directly in your terminal.
- **Background Daemon (`kurumid`)**: A robust, persistent backend server that owns the SQLite connection and model workers, eliminating "database is locked" errors and decoupling the backend from the Electron UI.
- **Health Checks**: `kurumi doctor` to verify system health and daemon connectivity.

### Changed
- **BREAKING CHANGE**: Running `kurumi` in the terminal no longer launches the Electron GUI. It now launches the interactive Terminal UI.
- **GUI Launch**: To launch the Electron GUI, you must now run `kurumi run`.
- **Architecture**: The Electron main process, the TUI, and the CLI are now all "thin clients" that communicate with the daemon via local HTTP APIs (port 47392).
