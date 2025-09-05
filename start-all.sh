#!/usr/bin/env bash
set -euo pipefail

# ========================================
# One-click starter for Backend + MCPRouter (Linux)
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
MCPROUTER_DIR="$SCRIPT_DIR/mcprouter"
LOG_DIR="$SCRIPT_DIR/logs"

BACKEND_PORT="${BACKEND_PORT:-8000}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

mkdir -p "$LOG_DIR"

echo "[1/3] Starting Backend on :$BACKEND_PORT ..."
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "  ERROR: $PYTHON_BIN not found in PATH" >&2
  exit 1
fi

# Ensure Python can import package 'app'
export PYTHONPATH="$BACKEND_DIR"
nohup "$PYTHON_BIN" -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --reload \
  >"$LOG_DIR/backend.out.log" 2>"$LOG_DIR/backend.err.log" &
echo $! > "$LOG_DIR/backend.pid"

echo "[2/3] Starting MCPRouter (API:8028 / Proxy:8026) ..."
if [[ -d "$MCPROUTER_DIR" ]]; then
  if [[ ! -x "$MCPROUTER_DIR/mcprouter" ]]; then
    if command -v go >/dev/null 2>&1; then
      echo "  Building mcprouter binary ..."
      ( cd "$MCPROUTER_DIR" && go build -o mcprouter ./ )
    else
      echo "  WARN: 'go' not found and mcprouter binary missing. Skipping MCPRouter start." >&2
      MCP_SKIP=1
    fi
  fi

  if [[ -z "${MCP_SKIP:-}" ]]; then
    nohup "$MCPROUTER_DIR/mcprouter" api >>"$LOG_DIR/mcprouter_api.log" 2>&1 &
    echo $! > "$LOG_DIR/mcprouter_api.pid"
    sleep 1
    nohup "$MCPROUTER_DIR/mcprouter" proxy >>"$LOG_DIR/mcprouter_proxy.log" 2>&1 &
    echo $! > "$LOG_DIR/mcprouter_proxy.pid"
  fi
else
  echo "  WARN: MCPRouter directory not found: $MCPROUTER_DIR" >&2
fi

echo "[3/3] Syncing MCP tools to backend database (if script present) ..."
if [[ -f "$SCRIPT_DIR/backend/sync_mcp_tools.py" ]]; then
  ( cd "$SCRIPT_DIR/backend" && "$PYTHON_BIN" sync_mcp_tools.py ) >>"$LOG_DIR/sync_tools.log" 2>&1 || true
elif [[ -f "$SCRIPT_DIR/backend/app/scripts/sync_mcp_tools.py" ]]; then
  ( cd "$SCRIPT_DIR/backend/app/scripts" && "$PYTHON_BIN" sync_mcp_tools.py ) >>"$LOG_DIR/sync_tools.log" 2>&1 || true
elif [[ -f "$SCRIPT_DIR/sync_mcp_tools.py" ]]; then
  ( cd "$SCRIPT_DIR" && "$PYTHON_BIN" sync_mcp_tools.py ) >>"$LOG_DIR/sync_tools.log" 2>&1 || true
fi

echo
echo "========================================"
echo "Services starting in background:"
echo "  Backend   : http://localhost:$BACKEND_PORT"
echo "  MCP API   : http://localhost:8028"
echo "  MCP Proxy : http://localhost:8026"
echo "Logs dir    : $LOG_DIR"
echo "PIDs        : $LOG_DIR/backend.pid, $LOG_DIR/mcprouter_api.pid, $LOG_DIR/mcprouter_proxy.pid"
echo "========================================"
echo "Use 'tail -f $LOG_DIR/backend.out.log' to watch logs."

exit 0


