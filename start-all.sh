#!/usr/bin/env bash
set -euo pipefail

# ========================================
# One-click starter for Backend + MCPRouter (Linux)
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
MCPROUTER_DIR="$SCRIPT_DIR/mcprouter"
LOG_DIR="$SCRIPT_DIR/logs"
MASTER_LOG="$LOG_DIR/start-all.log"

BACKEND_PORT="${BACKEND_PORT:-8000}"
MCP_API_PORT="${MCP_API_PORT:-8028}"
MCP_PROXY_PORT="${MCP_PROXY_PORT:-8026}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
SHOW_PY_CONSOLE="${SHOW_PY_CONSOLE:-1}"
SHOW_MCP_CONSOLE="${SHOW_MCP_CONSOLE:-1}"

mkdir -p "$LOG_DIR"

echo "======= start-all.sh run at $(date '+%Y-%m-%d %H:%M:%S') =======" >>"$MASTER_LOG"

echo "Checking port availability..."
echo "Checking port availability..." >>"$MASTER_LOG"

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :$port )" | grep -q ":$port"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    netstat -ltn 2>/dev/null | grep -q ":$port "
  fi
}

SKIP_START=""
if port_in_use "$BACKEND_PORT"; then
  echo "  ERROR: Port $BACKEND_PORT is already in use"
  echo "  ERROR: Port $BACKEND_PORT is already in use" >>"$MASTER_LOG"
  SKIP_START=1
fi
if port_in_use "$MCP_API_PORT"; then
  echo "  ERROR: Port $MCP_API_PORT is already in use"
  echo "  ERROR: Port $MCP_API_PORT is already in use" >>"$MASTER_LOG"
  SKIP_START=1
fi
if port_in_use "$MCP_PROXY_PORT"; then
  echo "  ERROR: Port $MCP_PROXY_PORT is already in use"
  echo "  ERROR: Port $MCP_PROXY_PORT is already in use" >>"$MASTER_LOG"
  SKIP_START=1
fi

if [[ -n "$SKIP_START" ]]; then
  echo
  echo "========================================"
  echo "Services starting in background (skipped due to port in use)"
  echo "  Backend   : http://localhost:$BACKEND_PORT"
  echo "  MCP API   : http://localhost:$MCP_API_PORT"
  echo "  MCP Proxy : http://localhost:$MCP_PROXY_PORT"
  echo "Logs dir    : $LOG_DIR"
  echo "========================================"
  exit 0
fi

echo "[1/3] Starting Backend on :$BACKEND_PORT ..."
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "  ERROR: $PYTHON_BIN not found in PATH" >&2
  exit 1
fi

# Ensure Python can import package 'app' and run from backend dir for consistent DB paths
export PYTHONPATH="$BACKEND_DIR"
if [[ "$SHOW_PY_CONSOLE" == "1" || "$SHOW_PY_CONSOLE" == "true" ]]; then
  (
    cd "$BACKEND_DIR" && \
    nohup "$PYTHON_BIN" -m uvicorn app.main:app \
      --host 0.0.0.0 \
      --port "$BACKEND_PORT" \
      --reload 2>&1 | tee -a "$LOG_DIR/backend.console.log" &
    echo $! > "$LOG_DIR/backend.pid"
  )
else
  (
    cd "$BACKEND_DIR" && \
    nohup "$PYTHON_BIN" -m uvicorn app.main:app \
      --host 0.0.0.0 \
      --port "$BACKEND_PORT" \
      --reload \
      >>"$LOG_DIR/backend.out.log" 2>>"$LOG_DIR/backend.err.log" &
    echo $! > "$LOG_DIR/backend.pid"
  )
fi

echo "[2/3] Starting MCPRouter (API:$MCP_API_PORT / Proxy:$MCP_PROXY_PORT) ..."
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
    if [[ "$SHOW_MCP_CONSOLE" == "1" || "$SHOW_MCP_CONSOLE" == "true" ]]; then
      nohup "$MCPROUTER_DIR/mcprouter" api 2>&1 | tee -a "$LOG_DIR/mcprouter_api.log" &
      echo $! > "$LOG_DIR/mcprouter_api.pid"
      sleep 1
      nohup "$MCPROUTER_DIR/mcprouter" proxy 2>&1 | tee -a "$LOG_DIR/mcprouter_proxy.log" &
      echo $! > "$LOG_DIR/mcprouter_proxy.pid"
    else
      nohup "$MCPROUTER_DIR/mcprouter" api >>"$LOG_DIR/mcprouter_api.log" 2>&1 &
      echo $! > "$LOG_DIR/mcprouter_api.pid"
      sleep 1
      nohup "$MCPROUTER_DIR/mcprouter" proxy >>"$LOG_DIR/mcprouter_proxy.log" 2>&1 &
      echo $! > "$LOG_DIR/mcprouter_proxy.pid"
    fi
  fi
else
  echo "  WARN: MCPRouter directory not found: $MCPROUTER_DIR" >&2
fi

echo "Verifying MCPRouter processes..."
sleep 2
if [[ -f "$LOG_DIR/mcprouter_api.pid" ]] && ps -p "$(cat "$LOG_DIR/mcprouter_api.pid" 2>/dev/null)" >/dev/null 2>&1; then
  echo "  ✓ MCPRouter API process detected"
else
  echo "  ⚠ MCPRouter API may not be running yet"
fi
if [[ -f "$LOG_DIR/mcprouter_proxy.pid" ]] && ps -p "$(cat "$LOG_DIR/mcprouter_proxy.pid" 2>/dev/null)" >/dev/null 2>&1; then
  echo "  ✓ MCPRouter Proxy process detected"
else
  echo "  ⚠ MCPRouter Proxy may not be running yet"
fi

echo "Checking API/Proxy endpoints..."
if curl -sf "http://localhost:$MCP_API_PORT/v1/list-servers" >/dev/null 2>&1; then
  echo "  ✓ API Server is running on http://localhost:$MCP_API_PORT"
else
  echo "  ⚠ API Server may not be ready yet"
fi
if curl -sf "http://localhost:$MCP_PROXY_PORT" >/dev/null 2>&1; then
  echo "  ✓ Proxy Server is running on http://localhost:$MCP_PROXY_PORT"
else
  echo "  ⚠ Proxy Server may not be ready yet"
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
echo "  MCP API   : http://localhost:$MCP_API_PORT"
echo "  MCP Proxy : http://localhost:$MCP_PROXY_PORT"
echo "Logs dir    : $LOG_DIR"
echo "PIDs        : $LOG_DIR/backend.pid, $LOG_DIR/mcprouter_api.pid, $LOG_DIR/mcprouter_proxy.pid"
echo "========================================"
echo "Use 'tail -f $LOG_DIR/backend.out.log' to watch logs."

exit 0


