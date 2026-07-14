#!/usr/bin/env bash
# ============================================================
#  kurumi.sh — KURUMI master launcher
#  Usage:
#    kurumi               → start KURUMI (Ollama / NVIDIA mode)
#    kurumi airllm        → start AirLLM server + KURUMI together
#    kurumi server        → start AirLLM server only (headless)
#    kurumi setup         → install all dependencies (Node + Python)
#    kurumi help          → show this help
#
#  Set the alias once with:
#    echo "alias kurumi='$HOME/Desktop/Study/KURUMI/kurumi-electron/kurumi.sh'" >> ~/.bashrc
#    source ~/.bashrc
# ============================================================
set -euo pipefail

# ── Resolve the script's own directory so it works from anywhere ──────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KURUMI_DIR="$SCRIPT_DIR"
AIRLLM_SERVER="$KURUMI_DIR/airllm_server.py"
REQ_FILE="$KURUMI_DIR/requirements-airllm.txt"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # no colour

# ── Banner ────────────────────────────────────────────────────────────────────
banner() {
  echo -e "${RED}"
  echo "  ██╗  ██╗██╗   ██╗██████╗ ██╗   ██╗███╗   ███╗██╗"
  echo "  ██║ ██╔╝██║   ██║██╔══██╗██║   ██║████╗ ████║██║"
  echo "  █████╔╝ ██║   ██║██████╔╝██║   ██║██╔████╔██║██║"
  echo "  ██╔═██╗ ██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██║"
  echo "  ██║  ██╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║"
  echo "  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝"
  echo -e "${NC}"
  echo -e "${BOLD}  Kinetic Unified Runtime for Universal Model Interaction${NC}"
  echo ""
}

# ── Help ──────────────────────────────────────────────────────────────────────
show_help() {
  banner
  echo -e "${BOLD}USAGE${NC}"
  echo "  kurumi               Start KURUMI (uses Ollama / NVIDIA as normal)"
  echo "  kurumi airllm        Start AirLLM server + KURUMI together"
  echo "  kurumi server        Start AirLLM server only (headless, good for debugging)"
  echo "  kurumi setup         Install Node + Python dependencies"
  echo "  kurumi help          Show this message"
  echo ""
  echo -e "${BOLD}AIRLLM SERVER OPTIONS (env vars)${NC}"
  echo "  AIRLLM_MODEL        HuggingFace model ID  (default: Qwen/Qwen2.5-7B-Instruct)"
  echo "  AIRLLM_SHARD_DIR    Shard storage path    (default: ~/airllm_shards)"
  echo "  AIRLLM_PORT         API port              (default: 8765)"
  echo "  AIRLLM_DEVICE       PyTorch device        (default: cuda:0)"
  echo "  AIRLLM_MAX_SEQ_LEN  Max token length      (default: 512)"
  echo "  AIRLLM_COMPRESSION  4bit or 8bit          (default: none)"
  echo "  HF_TOKEN            HuggingFace API token (for gated models)"
  echo ""
  echo -e "${BOLD}EXAMPLES${NC}"
  echo "  # Run a 32B model in KURUMI"
  echo "  AIRLLM_MODEL='Qwen/Qwen2.5-32B-Instruct' kurumi airllm"
  echo ""
  echo "  # Run a 70B model with 4-bit on-disk compression"
  echo "  AIRLLM_MODEL='meta-llama/Meta-Llama-3-70B-Instruct' \\"
  echo "  AIRLLM_COMPRESSION=4bit \\"
  echo "  HF_TOKEN=hf_xxx \\"
  echo "  kurumi airllm"
  echo ""
  echo "  # Store shards on a large drive"
  echo "  AIRLLM_SHARD_DIR=/mnt/bigdrive/shards kurumi airllm"
  echo ""
}

# ── Dependency checks ─────────────────────────────────────────────────────────
check_node() {
  if ! command -v node &>/dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed.${NC}"
    echo "       Install it from https://nodejs.org (LTS version)"
    exit 1
  fi
}

check_npm() {
  if ! command -v npm &>/dev/null; then
    echo -e "${RED}ERROR: npm is not installed. It usually ships with Node.js.${NC}"
    exit 1
  fi
}

check_python() {
  if command -v python3 &>/dev/null; then
    PYTHON="python3"
  elif command -v python &>/dev/null; then
    PYTHON="python"
  else
    echo -e "${RED}ERROR: Python 3 is not installed.${NC}"
    echo "       Install it from https://python.org or via your package manager."
    exit 1
  fi
  export PYTHON
}

check_node_modules() {
  if [ ! -d "$KURUMI_DIR/node_modules" ]; then
    echo -e "${YELLOW}[kurumi] node_modules not found — running npm install...${NC}"
    cd "$KURUMI_DIR" && npm install
  fi
}

# ── Setup command ─────────────────────────────────────────────────────────────
cmd_setup() {
  banner
  echo -e "${CYAN}[kurumi] Setting up dependencies...${NC}"
  echo ""

  # Node dependencies
  check_node
  check_npm
  echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"
  echo -e "${CYAN}[kurumi] Installing Node.js dependencies...${NC}"
  cd "$KURUMI_DIR" && npm install
  echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
  echo ""

  # Python dependencies
  check_python
  echo -e "${GREEN}✓ Python $($PYTHON --version 2>&1) detected${NC}"
  echo -e "${CYAN}[kurumi] Installing Python dependencies for AirLLM server...${NC}"
  $PYTHON -m pip install -r "$REQ_FILE"
  echo -e "${GREEN}✓ Python (AirLLM) dependencies installed${NC}"
  echo ""

  echo -e "${GREEN}${BOLD}✓ Setup complete! Run 'kurumi' to start KURUMI.${NC}"
  echo ""
  echo -e "  For big models: ${CYAN}kurumi airllm${NC}"
  echo "  For help:       ${CYAN}kurumi help${NC}"
  echo ""
}

# ── Start KURUMI only (normal mode) ──────────────────────────────────────────
cmd_start() {
  banner
  check_node
  check_node_modules
  echo -e "${CYAN}[kurumi] Starting KURUMI...${NC}"
  cd "$KURUMI_DIR" && npm run dev
}

# ── Start AirLLM server only (headless) ───────────────────────────────────────
cmd_server() {
  banner
  check_python
  echo -e "${PURPLE}[kurumi] Starting AirLLM server...${NC}"
  echo -e "         Model   : ${YELLOW}${AIRLLM_MODEL:-Qwen/Qwen2.5-7B-Instruct}${NC}"
  echo -e "         Shards  : ${YELLOW}${AIRLLM_SHARD_DIR:-$HOME/airllm_shards}${NC}"
  echo -e "         Port    : ${YELLOW}${AIRLLM_PORT:-8765}${NC}"
  echo ""

  # Verify airllm is installed
  if ! $PYTHON -c "import airllm" &>/dev/null; then
    echo -e "${YELLOW}[kurumi] AirLLM not found, installing from requirements-airllm.txt...${NC}"
    $PYTHON -m pip install -r "$REQ_FILE"
  fi

  $PYTHON "$AIRLLM_SERVER" \
    ${AIRLLM_MODEL+--model "$AIRLLM_MODEL"} \
    ${AIRLLM_SHARD_DIR+--shard-dir "$AIRLLM_SHARD_DIR"} \
    ${AIRLLM_PORT+--port "$AIRLLM_PORT"} \
    ${AIRLLM_DEVICE+--device "$AIRLLM_DEVICE"} \
    ${AIRLLM_MAX_SEQ_LEN+--max-seq-len "$AIRLLM_MAX_SEQ_LEN"} \
    ${AIRLLM_COMPRESSION+--compression "$AIRLLM_COMPRESSION"} \
    ${HF_TOKEN+--hf-token "$HF_TOKEN"}
}

# ── Start AirLLM server + KURUMI together ─────────────────────────────────────
cmd_airllm() {
  banner
  check_node
  check_node_modules
  check_python

  echo -e "${PURPLE}[kurumi] AirLLM mode — starting both AirLLM server and KURUMI${NC}"
  echo ""

  # Verify airllm is installed
  if ! $PYTHON -c "import airllm" &>/dev/null; then
    echo -e "${YELLOW}[kurumi] AirLLM not found, installing from requirements-airllm.txt...${NC}"
    $PYTHON -m pip install -r "$REQ_FILE"
  fi

  # Build the python command with only env vars that are actually set
  PYTHON_CMD=("$PYTHON" "$AIRLLM_SERVER")
  [ -n "${AIRLLM_MODEL:-}"       ] && PYTHON_CMD+=(--model        "$AIRLLM_MODEL")
  [ -n "${AIRLLM_SHARD_DIR:-}"   ] && PYTHON_CMD+=(--shard-dir    "$AIRLLM_SHARD_DIR")
  [ -n "${AIRLLM_PORT:-}"        ] && PYTHON_CMD+=(--port         "$AIRLLM_PORT")
  [ -n "${AIRLLM_DEVICE:-}"      ] && PYTHON_CMD+=(--device       "$AIRLLM_DEVICE")
  [ -n "${AIRLLM_MAX_SEQ_LEN:-}" ] && PYTHON_CMD+=(--max-seq-len  "$AIRLLM_MAX_SEQ_LEN")
  [ -n "${AIRLLM_COMPRESSION:-}" ] && PYTHON_CMD+=(--compression  "$AIRLLM_COMPRESSION")
  [ -n "${HF_TOKEN:-}"           ] && PYTHON_CMD+=(--hf-token     "$HF_TOKEN")

  echo -e "${PURPLE}[kurumi] Launching AirLLM server in background...${NC}"
  "${PYTHON_CMD[@]}" &
  AIRLLM_PID=$!

  # Trap so killing kurumi also kills the server
  cleanup() {
    echo ""
    echo -e "${YELLOW}[kurumi] Shutting down AirLLM server (PID $AIRLLM_PID)...${NC}"
    kill "$AIRLLM_PID" 2>/dev/null || true
    wait "$AIRLLM_PID" 2>/dev/null || true
    echo -e "${GREEN}[kurumi] Clean shutdown complete.${NC}"
  }
  trap cleanup EXIT INT TERM

  # Wait for server to come up (up to 600 s for first-run model download)
  echo -e "${CYAN}[kurumi] Waiting for AirLLM server to be ready (first run may download the model)...${NC}"
  PORT="${AIRLLM_PORT:-8765}"
  WAITED=0
  until curl -sf "http://127.0.0.1:${PORT}/health" &>/dev/null; do
    sleep 3
    WAITED=$((WAITED + 3))
    if ! kill -0 "$AIRLLM_PID" 2>/dev/null; then
      echo -e "${RED}ERROR: AirLLM server process died unexpectedly. Check the output above.${NC}"
      exit 1
    fi
    if [ "$WAITED" -ge 600 ]; then
      echo -e "${RED}ERROR: AirLLM server did not start within 10 minutes. Check the output above.${NC}"
      exit 1
    fi
    echo -e "  ...still loading (${WAITED}s elapsed)"
  done

  echo -e "${GREEN}✓ AirLLM server is ready at http://127.0.0.1:${PORT}${NC}"
  echo ""
  echo -e "${CYAN}[kurumi] Starting KURUMI...${NC}"
  cd "$KURUMI_DIR" && npm run dev
}

# ── Main dispatcher ───────────────────────────────────────────────────────────
CMD="${1:-start}"

case "$CMD" in
  start|"")   cmd_start   ;;
  airllm)     cmd_airllm  ;;
  server)     cmd_server  ;;
  setup)      cmd_setup   ;;
  help|--help|-h) show_help ;;
  *)
    echo -e "${RED}Unknown command: $CMD${NC}"
    echo "Run 'kurumi help' for usage."
    exit 1
    ;;
esac
