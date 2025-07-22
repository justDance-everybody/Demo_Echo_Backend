from typing import Generator, AsyncGenerator
import time
import os
from sqlalchemy import create_engine, event, exc, text, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from loguru import logger
from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# 数据库连接参数
DB_RETRY_COUNT = 3
DB_RETRY_DELAY = 2  # 秒

# SQLAlchemy基础模型类
Base = declarative_base()

# 创建数据库引擎
def create_db_engine(db_url=None):
    """创建数据库引擎"""
    if db_url is None:
        db_url = settings.DATABASE_URL
    
    # 创建数据库引擎，禁用连接池事件监听器，以修复某些环境下的连接问题
    engine_params = {
        "echo": settings.DEBUG,
        "pool_pre_ping": True,
    }
    
    # 针对SQLite增加特定配置
    if 'sqlite' in db_url:
        engine_params["connect_args"] = {"check_same_thread": False}
    
    # 创建引擎实例
    engine = create_engine(db_url, **engine_params)
    
    # 添加SQLite特定的PRAGMA设置
    @event.listens_for(engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        if 'sqlite' in db_url:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.close()
    
    try:
        # 测试连接
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("数据库连接成功")
        return engine
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

# 创建数据库引擎
engine = create_db_engine()

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建线程安全的会话
db_session = scoped_session(SessionLocal)

# 获取数据库会话的上下文管理器
@contextmanager
def get_db() -> Generator:
    """获取数据库会话"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"数据库操作失败: {e}")
        raise
    finally:
        session.close()

# 初始化数据库
def init_db():
    """初始化数据库，创建所有表"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建成功")
    except Exception as e:
        logger.error(f"数据库表创建失败: {e}")
        raise

# 移除连接池监听器，避免pid相关错误
# @event.listens_for(engine, "connect")
# def connect(dbapi_connection, connection_record):
#     connection_record.info['pid'] = os.getpid()

# @event.listens_for(engine, "checkout")
# def checkout(dbapi_connection, connection_record, connection_proxy):
#     pid = os.getpid()
#     if connection_record.info['pid'] != pid:
#         connection_record.connection = connection_proxy.connection = None
#         raise exc.DisconnectionError(
#             "Connection record belongs to pid %s, "
#             "attempting to check out in pid %s" %
#             (connection_record.info['pid'], pid)
#         ) 

# --- 异步数据库配置 --- BEGIN

# 创建异步数据库引擎
def create_async_db_engine(db_url=None):
    """创建异步数据库引擎"""
    if db_url is None:
        db_url = settings.DATABASE_URL

    # 确保 URL 是异步兼容的 (例如 mysql+aiomysql)
    if db_url.startswith("mysql+pymysql://"):
        async_db_url = db_url.replace("mysql+pymysql://", "mysql+aiomysql://", 1)
        logger.info(f"数据库URL已转换为异步兼容: {async_db_url}")
    elif db_url.startswith("sqlite:///") or db_url.startswith("sqlite://"):
        async_db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///")
        logger.info(f"数据库URL已转换为异步兼容: {async_db_url}")
    else:
        # 假设 URL 已经是异步兼容的或其他不支持的类型
        async_db_url = db_url
        logger.warning(f"数据库URL可能不是异步兼容的或未被识别: {async_db_url}")

    engine_params = {
        "echo": settings.DEBUG,
        "pool_pre_ping": True,
        # 可以添加其他异步特定参数，例如 pool_size, max_overflow
    }

    # 针对 aiosqlite 增加特定配置
    if 'sqlite+aiosqlite' in async_db_url:
         engine_params["connect_args"] = {"check_same_thread": False} # aiosqlite不需要这个，但以防万一

    try:
        async_engine = create_async_engine(async_db_url, **engine_params)
        logger.info("异步数据库引擎创建成功")
        return async_engine
    except Exception as e:
        logger.error(f"创建异步数据库引擎失败: {e}")
        raise

async_engine = create_async_db_engine()

# 创建异步会话工厂
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 获取异步数据库会话的依赖函数 (用于 FastAPI Depends)
async def get_async_db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供异步数据库会话的生成器"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit() # 异步提交
        except Exception as e:
            await session.rollback() # 异步回滚
            logger.error(f"异步数据库操作失败: {e}")
            raise
        finally:
            # 关闭在 AsyncSessionLocal() 的 context manager 中自动处理
            pass

# --- 异步数据库配置 --- END

# 创建同步数据库引擎 (保留，可能其他地方还在用)
engine = create_db_engine()

# 创建同步会话工厂 (保留)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建线程安全的同步会话 (保留)
db_session = scoped_session(SessionLocal)

# 获取同步数据库会话的上下文管理器 (保留)
@contextmanager
def get_db() -> Generator:
    """获取数据库会话"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"数据库操作失败: {e}")
        raise
    finally:
        session.close()

def get_db_url():
    """获取数据库URL"""
    return settings.DATABASE_URL

# 初始化数据库 (使用同步引擎创建表)
def init_db():
    """初始化数据库，创建所有表 (使用同步引擎)"""
    try:
        logger.info("开始使用同步引擎创建数据库表...")
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建成功 (使用同步引擎)")
    except Exception as e:
        logger.error(f"数据库表创建失败: {e}")
        raise

# ... (移除连接池监听器代码) ...