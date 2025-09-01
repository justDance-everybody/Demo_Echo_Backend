@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo MCPRouter Test Script (Windows)
echo ========================================

REM Test API Server
echo [INFO] Testing MCPRouter API Server...

REM Test list servers endpoint
echo [INFO] Testing /v1/list-servers endpoint...
curl -s -w "%%{http_code}" http://localhost:8027/v1/list-servers > temp_response.txt 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in (temp_response.txt) do set "response=%%a"
    set "http_code=!response:~-3!"
    set "body=!response:~0,-3!"
    
    if "!http_code!"=="200" (
        echo [SUCCESS] API Server is responding (HTTP !http_code!)
        echo Response: !body!
    ) else (
        echo [WARNING] API Server responded with HTTP !http_code!
        echo Response: !body!
    )
) else (
    echo [ERROR] Failed to connect to API Server
)

REM Test proxy server
echo [INFO] Testing MCPRouter Proxy Server...
curl -s http://localhost:8025 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Proxy Server is responding
) else (
    echo [ERROR] Failed to connect to Proxy Server
)

REM Test specific tool endpoints
echo [INFO] Testing tool endpoints...

REM Test list tools for a specific server
curl -s -w "%%{http_code}" "http://localhost:8027/v1/list-tools?server=amap-maps" > temp_tools.txt 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in (temp_tools.txt) do set "tools_response=%%a"
    set "tools_http_code=!tools_response:~-3!"
    set "tools_body=!tools_response:~0,-3!"
    
    if "!tools_http_code!"=="200" (
        echo [SUCCESS] List tools endpoint working (HTTP !tools_http_code!)
        echo Response: !tools_body!
    ) else (
        echo [WARNING] List tools endpoint responded with HTTP !tools_http_code!
        echo Response: !tools_body!
    )
) else (
    echo [WARNING] List tools endpoint not responding
)

REM Cleanup
del temp_response.txt 2>nul
del temp_tools.txt 2>nul

echo.
echo ========================================
echo Test completed!
echo ========================================
echo.
echo If all tests passed, MCPRouter is working correctly.
echo If some tests failed, check:
echo   1. MCPRouter services are running
echo   2. Ports 8025 and 8027 are not blocked
echo   3. Configuration file is correct
echo   4. MCP servers are properly configured
echo.
pause
