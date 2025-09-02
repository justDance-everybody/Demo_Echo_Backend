@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo MCPRouter Startup Script (Windows)
echo ========================================

REM 检查Go环境
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Go not found, please install Go first
    echo Download from: https://golang.org/dl/
    pause
    exit /b 1
)

REM 设置工作目录
set "SCRIPT_DIR=%~dp0"
set "MCPROUTER_DIR=%SCRIPT_DIR%mcprouter"

echo Checking MCPRouter directory...
if not exist "%MCPROUTER_DIR%" (
    echo ERROR: MCPRouter directory not found at: %MCPROUTER_DIR%
    echo Please ensure mcprouter is in the correct location
    pause
    exit /b 1
)

REM 进入MCPRouter目录
cd /d "%MCPROUTER_DIR%"

REM 检查配置文件
echo Checking configuration file...
if not exist ".env.toml" (
    echo ERROR: Configuration file .env.toml not found in MCPRouter directory
    echo Please ensure .env.toml exists in: %MCPROUTER_DIR%
    pause
    exit /b 1
)
echo Configuration file found

REM 编译MCPRouter
echo Building MCPRouter...
go build -o mcprouter.exe main.go
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    echo Please check Go environment and dependencies
    pause
    exit /b 1
)
echo Build completed successfully

REM 检查端口占用
echo Checking port availability...
netstat -an | findstr ":8028" >nul
if %errorlevel% equ 0 (
    echo ERROR: Port 8028 is already in use
    echo Please stop the conflicting service or change the port in config
    echo.
    echo To stop existing MCPRouter processes:
    echo   taskkill /f /im mcprouter.exe
    pause
    exit /b 1
)

netstat -an | findstr ":8026" >nul
if %errorlevel% equ 0 (
    echo ERROR: Port 8026 is already in use
    echo Please stop the conflicting service or change the port in config
    echo.
    echo To stop existing MCPRouter processes:
    echo   taskkill /f /im mcprouter.exe
    pause
    exit /b 1
)

echo ✓ Ports 8026 and 8028 are available

REM 启动API服务器
echo Starting MCPRouter API server (port: 8028)...
start "MCPRouter API Server" /min cmd /c "mcprouter.exe api"
REM start command always returns 0, so cannot check via errorlevel
REM wait a few seconds for service to start, then check process
timeout /t 3 /nobreak >nul

REM 检查API服务器是否成功启动
tasklist /fi "IMAGENAME eq mcprouter.exe" | findstr "mcprouter.exe" >nul
if %errorlevel% neq 0 (
    echo ERROR: API server failed to start
    pause
    exit /b 1
)
echo ✓ API server started successfully

REM 等待API服务器启动
echo Waiting for API server to start...
timeout /t 3 /nobreak >nul

REM 启动代理服务器
echo Starting MCPRouter Proxy server (port: 8026)...
start "MCPRouter Proxy Server" /min cmd /c "mcprouter.exe proxy"
REM wait a few seconds for service to start
timeout /t 3 /nobreak >nul

REM 检查代理服务器是否成功启动
tasklist /fi "IMAGENAME eq mcprouter.exe" | findstr "mcprouter.exe" >nul
if %errorlevel% neq 0 (
    echo ERROR: Proxy server failed to start
    pause
    exit /b 1
)
echo ✓ Proxy server started successfully

REM 验证服务状态
echo Verifying services...
curl -s http://localhost:8028/v1/list-servers >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ API Server is running on http://localhost:8028
) else (
    echo ⚠ API Server may not be ready yet
)

curl -s http://localhost:8026 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Proxy Server is running on http://localhost:8026
) else (
    echo ⚠ Proxy Server may not be ready yet
)

REM 等待服务完全启动
echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM 同步工具到Backend数据库
echo Syncing tools to Backend database...
cd /d "%SCRIPT_DIR%backend"
python sync_mcp_tools.py
if %errorlevel% equ 0 (
    echo ✓ Tools synced successfully
) else (
    echo ⚠ Tools sync failed, but services are running
)

cd /d "%SCRIPT_DIR%mcprouter"

echo.
echo ========================================
echo MCPRouter services started successfully!
echo ========================================
echo.
echo Services:
echo   - API Server: http://localhost:8028
echo   - Proxy Server: http://localhost:8026
echo.
echo API Endpoints:
echo   - List Servers: GET http://localhost:8028/v1/list-servers
echo   - List Tools: GET http://localhost:8028/v1/list-tools?server={server}
echo   - Call Tool: POST http://localhost:8028/v1/call-tool
echo.
echo Press any key to stop all services...
pause >nul

REM 停止服务
echo Stopping MCPRouter services...
taskkill /f /im mcprouter.exe >nul 2>&1
echo MCPRouter services stopped
pause
