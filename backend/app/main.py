import os
import sys
import json
import signal
import asyncio
import atexit
from pathlib import Path

# 设置UTF-8编码（解决Windows中文显示问题）
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, Response, HTMLResponse
from fastapi.templating import Jinja2Templates
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from app.routers import intent, execute, tools, auth, dev_tools, dev_apps, mcp_status
from app.config import settings
from app.utils.db import init_db
from app.services.mcp_manager import mcp_manager
import time
import json
from pathlib import Path

# 设置模板目录
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# 全局关闭事件
shutdown_event = asyncio.Event()
is_shutting_down = False

# 信号处理器
def signal_handler(signum, frame):
    """处理中断信号，优雅关闭应用"""
    global is_shutting_down
    if is_shutting_down:
        logger.warning("已在关闭过程中，忽略重复信号")
        return
    
    is_shutting_down = True
    logger.info(f"收到信号 {signum}，正在优雅关闭应用...")
    
    # 设置关闭事件
    if not shutdown_event.is_set():
        shutdown_event.set()
    
    # 清理MCP资源
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(cleanup_mcp_resources())
    except Exception as e:
        logger.error(f"清理MCP资源时出错: {e}")

async def cleanup_mcp_resources():
    """清理MCP相关资源"""
    try:
        logger.info("正在清理MCP资源...")
        await mcp_manager.stop_monitoring()
        await mcp_manager.stop_all_servers()
        logger.info("✅ MCP资源清理完成")
    except Exception as e:
        logger.error(f"❌ 清理MCP资源时出错: {e}")

# 注册信号处理器
if hasattr(signal, 'SIGINT'):
    signal.signal(signal.SIGINT, signal_handler)
if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, signal_handler)

# 注册atexit处理器（最后的保障）
def emergency_cleanup():
    """紧急清理处理器"""
    global is_shutting_down
    if not is_shutting_down:
        logger.warning("程序异常退出，执行紧急清理")
        try:
            # 同步方式清理，因为atexit不支持async
            import subprocess
            import psutil
            
            # 清理可能的孤儿进程
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if any(keyword in cmdline.lower() for keyword in ['mcp', 'npx', 'playwright']):
                        logger.info(f"紧急清理进程: PID={proc.info['pid']}, CMD={cmdline[:100]}")
                        proc.terminate()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            logger.error(f"紧急清理失败: {e}")

atexit.register(emergency_cleanup)

# 配置日志
LOGS_DIR = Path(settings.LOG_FILE).parent
LOGS_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()  # 移除默认处理器
logger.add(
    sys.stderr, 
    level="DEBUG"
)
logger.add(
    settings.LOG_FILE, 
    rotation="10 MB", 
    retention="7 days", 
    level=settings.LOG_LEVEL
)

logger.info(f"启动应用: {settings.APP_NAME} v{settings.VERSION}")
logger.info(f"数据库: {settings.DATABASE_NAME}")

# 安全访问日志中间件
class SecurityAuditMiddleware(BaseHTTPMiddleware):
    """
    安全审计中间件，记录所有API访问和认证状态
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # 获取认证信息
        auth_header = request.headers.get("Authorization", "")
        has_auth = bool(auth_header and auth_header.startswith("Bearer "))
        
        # 记录请求信息
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "unknown")
        
        response = await call_next(request)
        
        # 计算处理时间
        process_time = time.time() - start_time
        
        # 记录访问日志
        log_data = {
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "has_auth": has_auth,
            "process_time": round(process_time, 4),
            "timestamp": time.time()
        }
        
        # 对于敏感端点或未认证访问进行特别记录
        sensitive_paths = ["/api/v1/execute", "/api/v1/tools"]
        if any(request.url.path.startswith(path) for path in sensitive_paths):
            if not has_auth:
                logger.warning(f"🔒 未认证访问敏感端点: {json.dumps(log_data)}")
            else:
                logger.info(f"🔐 认证访问: {json.dumps(log_data)}")
        
        return response

# 定义lifespan上下文管理器，用于处理启动和关闭事件
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    global is_shutting_down
    
    # 应用启动时执行
    logger.info("应用启动中...")
    
    try:
        init_db()  # 初始化数据库
        logger.info("✅ 数据库初始化完成")
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        raise
    
    # 启动MCP服务器管理器
    try:
        logger.info("正在启动MCP服务器管理器...")
        await mcp_manager.start_all_servers()
        await mcp_manager.start_monitoring()
        logger.info("✅ MCP服务器管理器启动完成")
    except Exception as e:
        logger.error(f"❌ MCP服务器管理器启动失败: {e}")
    
    try:
        yield
    finally:
        # 应用关闭时执行
        logger.info("应用关闭中...")
        is_shutting_down = True
        
        # 设置关闭事件（如果还没设置）
        if not shutdown_event.is_set():
            shutdown_event.set()
        
        # 优雅关闭MCP服务器管理器
        shutdown_tasks = []
        
        try:
            logger.info("正在停止MCP服务器监控...")
            stop_monitor_task = asyncio.create_task(mcp_manager.stop_monitoring())
            shutdown_tasks.append(stop_monitor_task)
        except Exception as e:
            logger.error(f"创建停止监控任务失败: {e}")
        
        try:
            logger.info("正在停止所有MCP服务器...")
            stop_servers_task = asyncio.create_task(mcp_manager.stop_all_servers())
            shutdown_tasks.append(stop_servers_task)
        except Exception as e:
            logger.error(f"创建停止服务器任务失败: {e}")
        
        # 等待所有关闭任务完成，设置超时
        if shutdown_tasks:
            try:
                logger.info(f"等待 {len(shutdown_tasks)} 个关闭任务完成...")
                await asyncio.wait_for(
                    asyncio.gather(*shutdown_tasks, return_exceptions=True),
                    timeout=30.0  # 30秒超时
                )
                logger.info("✅ 所有关闭任务已完成")
            except asyncio.TimeoutError:
                logger.warning("⚠️ 关闭任务超时，执行强制清理")
                # 取消未完成的任务
                for task in shutdown_tasks:
                    if not task.done():
                        task.cancel()
            except Exception as e:
                logger.error(f"❌ 执行关闭任务时发生错误: {e}")
        
        # 最终清理
        try:
            logger.info("执行最终进程清理...")
            await asyncio.wait_for(
                mcp_manager.cleanup_orphaned_mcp_processes(),
                timeout=10.0  # 10秒超时
            )
            logger.info("✅ 最终清理完成")
        except asyncio.TimeoutError:
            logger.warning("⚠️ 最终清理超时")
        except Exception as e:
            logger.error(f"❌ 最终清理时发生错误: {e}")
        
        logger.info("✅ 应用关闭完成")

# 创建应用
app = FastAPI(
    title=settings.APP_NAME,
    description="意图识别和处理API",
    version=settings.VERSION,
    docs_url=None,  # 禁用默认的docs
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加安全审计中间件
app.add_middleware(SecurityAuditMiddleware)

# 创建健康检查路由
health_router = APIRouter(tags=["health"])

@health_router.get("/health",
                  summary="健康检查",
                  description="检查系统运行状态，返回当前时间戳和状态信息。")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "timestamp": time.time()}

# 自定义Swagger UI路由
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html(request: Request):
    """自定义Swagger UI页面"""
    return templates.TemplateResponse(
        "swagger_ui.html", 
        {
            "request": request,
            "title": settings.APP_NAME,
            "openapi_url": app.openapi_url
        }
    )

# 添加根路由，重定向到文档页面
@app.get("/", 
         include_in_schema=False,
         summary="根路径",
         description="重定向到API文档页面。")
async def root():
    """重定向到API文档"""
    return RedirectResponse(url="/docs")

# 添加路由
app.include_router(health_router)
app.include_router(intent.router, prefix=settings.API_PREFIX, tags=["intent"])
app.include_router(execute.router, prefix=settings.API_PREFIX, tags=["execute"])
app.include_router(tools.router, prefix=settings.API_PREFIX, tags=["tools"])
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["auth"])
app.include_router(dev_tools.router, prefix=settings.API_PREFIX, tags=["dev-tools"])
app.include_router(mcp_status.router, prefix=settings.API_PREFIX, tags=["mcp-status"])
# app.include_router(dev_apps.router, prefix=settings.API_PREFIX, tags=["dev-apps"])  # 已关闭DEV-APPS功能
# app.include_router(admin.router, prefix=settings.API_PREFIX, tags=["admin"])  # admin路由暂未实现

# 路由冲突检测和安全审计
route_paths = {}
logger.info("="*30 + " Registered Routes " + "="*30)
for route in app.routes:
    if hasattr(route, "methods"):
        path_key = f"{route.path}:{','.join(route.methods)}"
        if path_key in route_paths:
            logger.warning(f"⚠️  路由冲突检测: {path_key} 已存在于 {route_paths[path_key]}")
        route_paths[path_key] = route.name
        logger.info(f"Path: {route.path}, Methods: {route.methods}, Name: {route.name}")
    else:
        # 处理非 Route 类型的路由，例如 WebSocketRoute 或 Mount
        logger.info(f"Path: {route.path}, Name: {route.name} (Type: {type(route).__name__})")
logger.info("="*78)

# 运行服务器
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )