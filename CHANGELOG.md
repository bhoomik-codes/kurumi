# Changelog

## [Unreleased] - Daemon Architecture Update

### Added
- **Interactive TUI**: A new terminal user interface powered by Ink. Launch it with `kurumi`.
- **One-shot CLI**: Use `kurumi --ask "Your question"` for a quick, pipe-able response directly in your terminal.
- **Background Daemon (`kurumid`)**: A robust, persistent backend server that owns the SQLite connection and model workers, eliminating "database is locked" errors and decoupling the backend from the Electron UI.
- **Health Checks**: `kurumi doctor` to verify system health and daemon connectivity.

### Changed
- **BREAKING CHANGE**: Running `kurumi` in the terminal no longer launches the Electron GUI. It now launches the interactive Terminal UI.
- **GUI Launch**: To launch the Electron GUI, you must now run `kurumi run`.
- **Architecture**: The Electron main process, the TUI, and the CLI are now all "thin clients" that communicate with the daemon via local HTTP APIs (port 47392).
