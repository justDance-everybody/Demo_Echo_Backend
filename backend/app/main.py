import os
import sys
import json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from app.routers import intent, execute, tools, auth
from app.config import settings
from app.utils.db import init_db
import time

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

# 定义lifespan上下文管理器，用于处理启动和关闭事件
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    # 应用启动时执行
    logger.info("应用启动中...")
    init_db()  # 初始化数据库
    yield
    # 应用关闭时执行
    logger.info("应用关闭中...")

# 创建应用
app = FastAPI(
    title=settings.APP_NAME,
    description="意图识别和处理API",
    version=settings.VERSION,
    docs_url="/docs",
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

# 创建健康检查路由
health_router = APIRouter(tags=["health"])

@health_router.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "timestamp": time.time()}

# 添加根路由，重定向到文档页面
@app.get("/", include_in_schema=False)
async def root():
    """重定向到API文档"""
    return RedirectResponse(url="/docs")

# 添加路由
app.include_router(health_router)
app.include_router(intent.router, prefix=settings.API_PREFIX, tags=["intent"])
app.include_router(execute.router, prefix=settings.API_PREFIX, tags=["execute"])
app.include_router(tools.router, prefix=settings.API_PREFIX, tags=["tools"])
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["auth"])

# 调试：打印所有注册的路由
logger.info("="*30 + " Registered Routes " + "="*30)
for route in app.routes:
    if hasattr(route, "methods"):
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
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 