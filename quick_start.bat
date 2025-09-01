@echo off
REM MCPRouter 快速启动脚本 (Windows)

echo ==================================================
echo MCPRouter 集成系统快速启动
echo ==================================================

REM 检查环境变量
if "%LLM_API_KEY%"=="" (
    echo ❌ 错误: 未设置 LLM_API_KEY 环境变量
    echo 请设置您的 OpenAI API 密钥:
    echo set LLM_API_KEY=your-api-key-here
    pause
    exit /b 1
)

echo ✅ LLM_API_KEY 已配置

REM 检查 Go 环境
go version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装 Go
    echo 请安装 Go 1.21+ 版本
    pause
    exit /b 1
)

echo ✅ Go 环境检查通过

REM 检查 Python 环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装 Python
    echo 请安装 Python 3.8+ 版本
    pause
    exit /b 1
)

echo ✅ Python 环境检查通过

REM 启动 MCPRouter
echo 🚀 启动 MCPRouter...
call start-mcprouter.bat

REM 等待 MCPRouter 启动
echo ⏳ 等待 MCPRouter 启动...
timeout /t 5 /nobreak >nul

REM 检查 MCPRouter 状态
curl -s http://localhost:8027/v1/list-servers >nul 2>&1
if errorlevel 1 (
    echo ❌ MCPRouter 启动失败
    pause
    exit /b 1
)

echo ✅ MCPRouter 启动成功

REM 启动 Python 后端
echo 🚀 启动 Python 后端...
cd backend
start "Python Backend" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

REM 等待后端启动
echo ⏳ 等待后端启动...
timeout /t 3 /nobreak >nul

REM 检查后端状态
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 后端启动失败
    pause
    exit /b 1
)

echo ✅ Python 后端启动成功

echo.
echo 🎉 系统启动完成！
echo.
echo 服务状态:
echo - MCPRouter API: http://localhost:8027
echo - MCPRouter Proxy: http://localhost:8025
echo - Python Backend: http://localhost:8000
echo - API 文档: http://localhost:8000/docs
echo.
echo 测试命令:
echo - 健康检查: curl http://localhost:8000/health
echo - 工具列表: curl http://localhost:8000/api/v1/tools/public
echo - 完整测试: cd MCPTEST ^&^& python test_mcprouter_system.py
echo.
echo 按任意键退出...

pause >nul
