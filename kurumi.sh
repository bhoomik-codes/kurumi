#!/usr/bin/env bash
# ============================================================
#  kurumi.sh — KURUMI master launcher (Daemon-based architecture)
#  Usage:
#    kurumi               → start KURUMI TUI
#    kurumi --ask "..."   → One-shot query in terminal
#    kurumi run           → start KURUMI Electron GUI
#    kurumi server        → start backend daemon in foreground
#    kurumi setup         → install dependencies
#    kurumi doctor        → check system health
#    kurumi help          → show this help
#
#  Set the alias once with:
#    echo "alias kurumi='$HOME/Desktop/Study/KURUMI/kurumi-electron/kurumi.sh'" >> ~/.bashrc
#    source ~/.bashrc
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ "${1:-}" = "run" ]; then
  # Launch Electron GUI
  npm run dev
elif [ "${1:-}" = "help" ] || [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  if [ -f "$SCRIPT_DIR/dist/kurumi-cli" ]; then
    "$SCRIPT_DIR/dist/kurumi-cli" help
  else
    npx tsx src/cli/index.ts help
  fi
else
  # Forward all other commands (TUI, setup, server, doctor, --ask) to the Node CLI
  if [ -f "$SCRIPT_DIR/dist/kurumi-cli" ]; then
    "$SCRIPT_DIR/dist/kurumi-cli" "$@"
  else
    npx tsx src/cli/index.ts "$@"
  fi
fi
