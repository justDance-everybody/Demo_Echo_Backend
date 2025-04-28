from typing import Generator
import time
import os
from sqlalchemy import create_engine, event, exc, text, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from loguru import logger
from app.config import settings

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