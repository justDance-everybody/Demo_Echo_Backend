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
set "MASTER_LOG=%LOG_DIR%\start-all.log"
set "SHOW_PY_CONSOLE=1"
set "SHOW_MCP_CONSOLE=1"
set "BACKEND_PORT=8000"
set "MCP_API_PORT=8028"
set "MCP_PROXY_PORT=8026"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
echo ======= start-all.bat run at %DATE% %TIME% =======>> "%MASTER_LOG%"

echo Checking port availability...
echo Checking port availability...>> "%MASTER_LOG%"
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if %errorlevel% neq 0 (
  echo   ERROR: Port %BACKEND_PORT% is already in use
  echo   ERROR: Port %BACKEND_PORT% is already in use>> "%MASTER_LOG%"
  goto :summary
)
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %MCP_API_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if %errorlevel% neq 0 (
  echo   ERROR: Port %MCP_API_PORT% is already in use
  echo   ERROR: Port %MCP_API_PORT% is already in use>> "%MASTER_LOG%"
  goto :summary
)
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %MCP_PROXY_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if %errorlevel% neq 0 (
  echo   ERROR: Port %MCP_PROXY_PORT% is already in use
  echo   ERROR: Port %MCP_PROXY_PORT% is already in use>> "%MASTER_LOG%"
  goto :summary
)

echo [1/3] Starting Backend (port 8000)...
echo [1/3] Starting Backend (port 8000)...>> "%MASTER_LOG%"
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo   ERROR: Python not found in PATH. Please install Python and try again.
  echo   ERROR: Python not found in PATH. Please install Python and try again.>> "%MASTER_LOG%"
  goto :after_backend
)

REM Use PYTHONPATH so app package can be imported reliably
if "%SHOW_PY_CONSOLE%"=="1" (
  echo   Showing Python console in this window...
  echo   Showing Python console in this window...>> "%MASTER_LOG%"
  start "Backend API (8000)" /b powershell -NoProfile -Command "cd '%BACKEND_DIR%'; $env:PYTHONPATH='%BACKEND_DIR%'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 2>&1 | Tee-Object -FilePath '%LOG_DIR%\backend.console.log' -Append"
) else (
  start "Backend API (8000)" /min cmd /c "cd /d %BACKEND_DIR% ^&^& set PYTHONPATH=%BACKEND_DIR% ^&^& python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 1>> \"%LOG_DIR%\backend.out.log\" 2>> \"%LOG_DIR%\backend.err.log\""
)

:after_backend
echo [2/3] Starting MCPRouter (ports 8028 API / 8026 Proxy)...
echo [2/3] Starting MCPRouter (ports 8028 API / 8026 Proxy)...>> "%MASTER_LOG%"
if not exist "%MCPROUTER_DIR%" (
  echo   ERROR: MCPRouter directory not found: %MCPROUTER_DIR%
  echo   ERROR: MCPRouter directory not found: %MCPROUTER_DIR%>> "%MASTER_LOG%"
  goto :summary
)

if not exist "%MCPROUTER_DIR%\.env.toml" (
  echo   WARNING: %MCPROUTER_DIR%\.env.toml not found. Continuing...
  echo   WARNING: %MCPROUTER_DIR%\.env.toml not found. Continuing...>> "%MASTER_LOG%"
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
  echo   Building mcprouter.exe ...>> "%MASTER_LOG%"
  go build -o mcprouter.exe main.go 1>> "%MASTER_LOG%" 2>&1
  if %errorlevel% neq 0 (
    echo   ERROR: go build failed.
    echo   ERROR: go build failed.>> "%MASTER_LOG%"
    popd >nul
    goto :summary
  )
  popd >nul
)

REM Start API and Proxy with optional live console output
if "%SHOW_MCP_CONSOLE%"=="1" (
  start "MCPRouter API (8028)" /b powershell -NoProfile -Command "cd '%MCPROUTER_DIR%'; .\\mcprouter.exe api 2>&1 | Tee-Object -FilePath '%LOG_DIR%\mcprouter_api.log' -Append"
  start "MCPRouter Proxy (8026)" /b powershell -NoProfile -Command "cd '%MCPROUTER_DIR%'; .\\mcprouter.exe proxy 2>&1 | Tee-Object -FilePath '%LOG_DIR%\mcprouter_proxy.log' -Append"
) else (
  start "MCPRouter API (8028)" /min cmd /c "cd /d %MCPROUTER_DIR% ^&^& mcprouter.exe api 1>> \"%LOG_DIR%\mcprouter_api.log\" 2>&1"
  start "MCPRouter Proxy (8026)" /min cmd /c "cd /d %MCPROUTER_DIR% ^&^& mcprouter.exe proxy 1>> \"%LOG_DIR%\mcprouter_proxy.log\" 2>&1"
)

echo Verifying MCPRouter processes...
echo Verifying MCPRouter processes...>> "%MASTER_LOG%"
timeout /t 3 /nobreak >nul
tasklist /fi "IMAGENAME eq mcprouter.exe" | findstr "mcprouter.exe" >nul
if %errorlevel% neq 0 (
  echo   ERROR: MCPRouter did not start properly
  echo   ERROR: MCPRouter did not start properly>> "%MASTER_LOG%"
  goto :summary
)
echo   ✓ MCPRouter process detected
echo   ✓ MCPRouter process detected>> "%MASTER_LOG%"

echo Checking API/Proxy endpoints...
echo Checking API/Proxy endpoints...>> "%MASTER_LOG%"
curl -s http://localhost:%MCP_API_PORT%/v1/list-servers >nul 2>&1
if %errorlevel% equ 0 (
  echo   ✓ API Server is running on http://localhost:%MCP_API_PORT%
  echo   ✓ API Server is running on http://localhost:%MCP_API_PORT%>> "%MASTER_LOG%"
) else (
  echo   ⚠ API Server may not be ready yet
  echo   ⚠ API Server may not be ready yet>> "%MASTER_LOG%"
)
curl -s http://localhost:%MCP_PROXY_PORT% >nul 2>&1
if %errorlevel% equ 0 (
  echo   ✓ Proxy Server is running on http://localhost:%MCP_PROXY_PORT%
  echo   ✓ Proxy Server is running on http://localhost:%MCP_PROXY_PORT%>> "%MASTER_LOG%"
) else (
  echo   ⚠ Proxy Server may not be ready yet
  echo   ⚠ Proxy Server may not be ready yet>> "%MASTER_LOG%"
)

REM Optional: sync tools into backend DB if script exists
if exist "%ROOT%backend\sync_mcp_tools.py" (
  echo [3/3] Syncing MCP tools to backend database...
  echo [3/3] Syncing MCP tools to backend database...>> "%MASTER_LOG%"
  pushd "%ROOT%backend" >nul
  python sync_mcp_tools.py 1>> "%LOG_DIR%\sync_tools.log" 2>&1
  popd >nul
) else if exist "%ROOT%backend\app\scripts\sync_mcp_tools.py" (
  echo [3/3] Syncing MCP tools to backend database...
  echo [3/3] Syncing MCP tools to backend database...>> "%MASTER_LOG%"
  pushd "%ROOT%backend\app\scripts" >nul
  python sync_mcp_tools.py 1>> "%LOG_DIR%\sync_tools.log" 2>&1
  popd >nul
)

:summary
echo.
echo.>> "%MASTER_LOG%"
echo ========================================
echo ========================================>> "%MASTER_LOG%"
echo Services starting in background:
echo Services starting in background:>> "%MASTER_LOG%"
echo   Backend   : http://localhost:8000
echo   Backend   : http://localhost:8000>> "%MASTER_LOG%"
echo   MCP API   : http://localhost:8028
echo   MCP API   : http://localhost:8028>> "%MASTER_LOG%"
echo   MCP Proxy : http://localhost:8026
echo   MCP Proxy : http://localhost:8026>> "%MASTER_LOG%"
echo Logs dir    : %LOG_DIR%
echo Logs dir    : %LOG_DIR%>> "%MASTER_LOG%"
echo ========================================
echo ========================================>> "%MASTER_LOG%"
echo.
echo.>> "%MASTER_LOG%"
echo Press any key to close this window (services keep running)...
echo Press any key to close this window (services keep running)...>> "%MASTER_LOG%"
pause >nul
exit /b 0


