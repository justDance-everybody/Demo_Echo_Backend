@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM One-click starter for Backend + MCPRouter (Windows)
REM ========================================

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "MCPROUTER_DIR=%ROOT%mcprouter"
set "LOG_DIR=%ROOT%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

echo [1/3] Starting Backend (port 8000)...
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo   ERROR: Python not found in PATH. Please install Python and try again.
  goto :after_backend
)

REM Use PYTHONPATH so app package can be imported reliably
start "Backend API (8000)" /min cmd /c "cd /d %ROOT% ^&^& set PYTHONPATH=%BACKEND_DIR% ^&^& python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 1>> \"%LOG_DIR%\backend.out.log\" 2>> \"%LOG_DIR%\backend.err.log\""

:after_backend
echo [2/3] Starting MCPRouter (ports 8028 API / 8026 Proxy)...
if not exist "%MCPROUTER_DIR%" (
  echo   ERROR: MCPRouter directory not found: %MCPROUTER_DIR%
  goto :summary
)

if not exist "%MCPROUTER_DIR%\.env.toml" (
  echo   WARNING: %MCPROUTER_DIR%\.env.toml not found. Continuing...
)

REM Build mcprouter.exe if missing
if not exist "%MCPROUTER_DIR%\mcprouter.exe" (
  where go >nul 2>nul
  if %errorlevel% neq 0 (
    echo   ERROR: Go not found and mcprouter.exe missing. Skipping MCPRouter build/start.
    goto :summary
  )
  pushd "%MCPROUTER_DIR%" >nul
  echo   Building mcprouter.exe ...
  go build -o mcprouter.exe main.go
  if %errorlevel% neq 0 (
    echo   ERROR: go build failed.
    popd >nul
    goto :summary
  )
  popd >nul
)

REM Start API and Proxy in background windows
start "MCPRouter API (8028)" /min cmd /c "cd /d %MCPROUTER_DIR% ^&^& mcprouter.exe api 1>> \"%LOG_DIR%\mcprouter_api.log\" 2>&1"
start "MCPRouter Proxy (8026)" /min cmd /c "cd /d %MCPROUTER_DIR% ^&^& mcprouter.exe proxy 1>> \"%LOG_DIR%\mcprouter_proxy.log\" 2>&1"

REM Optional: sync tools into backend DB if script exists
if exist "%ROOT%backend\sync_mcp_tools.py" (
  echo [3/3] Syncing MCP tools to backend database...
  pushd "%ROOT%backend" >nul
  python sync_mcp_tools.py 1>> "%LOG_DIR%\sync_tools.log" 2>&1
  popd >nul
) else if exist "%ROOT%backend\app\scripts\sync_mcp_tools.py" (
  echo [3/3] Syncing MCP tools to backend database...
  pushd "%ROOT%backend\app\scripts" >nul
  python sync_mcp_tools.py 1>> "%LOG_DIR%\sync_tools.log" 2>&1
  popd >nul
)

:summary
echo.
echo ========================================
echo Services starting in background:
echo   Backend   : http://localhost:8000
echo   MCP API   : http://localhost:8028
echo   MCP Proxy : http://localhost:8026
echo Logs dir    : %LOG_DIR%
echo ========================================
echo.
echo Press any key to close this window (services keep running)...
pause >nul
exit /b 0


