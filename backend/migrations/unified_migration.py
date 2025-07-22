#!/usr/bin/env python3
"""
统一数据库迁移脚本
支持MySQL和SQLite
"""

import sys
from pathlib import Path
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from loguru import logger

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.config import settings

def create_tables_if_not_exists(engine):
    """创建表结构（如果不存在）"""
    metadata = MetaData()
    
    # 用户表
    users_table = Table(
        'users', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('email', String(255), unique=True, nullable=False),
        Column('full_name', String(255)),
        Column('hashed_password', String(255)),
        Column('role', String(50), default='user'),
        Column('created_at', DateTime, default=func.now()),
        Column('updated_at', DateTime, default=func.now(), onupdate=func.now())
    )
    
    # 工具表
    tools_table = Table(
        'tools', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(255), nullable=False),
        Column('description', Text),
        Column('server_name', String(255)),
        Column('developer_id', Integer, ForeignKey('users.id')),
        Column('is_public', Boolean, default=True),
        Column('status', String(20), default='draft'),
        Column('version', String(20), default='1.0.0'),
        Column('tags', Text),  # JSON字符串
        Column('download_count', Integer, default=0),
        Column('rating', Integer),
        Column('created_at', DateTime, default=func.now()),
        Column('updated_at', DateTime, default=func.now(), onupdate=func.now())
    )
    
    # 应用表
    apps_table = Table(
        'apps', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('app_id', String(50), unique=True, nullable=False),
        Column('name', String(100), nullable=False),
        Column('description', Text),
        Column('version', String(20), nullable=False, default='1.0.0'),
        Column('developer_id', Integer, ForeignKey('users.id'), nullable=False),
        Column('is_public', Boolean, nullable=False, default=True),
        Column('status', String(20), nullable=False, default='draft'),
        Column('config', Text, default='{}'),  # JSON字符串
        Column('created_at', DateTime, default=func.now()),
        Column('updated_at', DateTime, default=func.now(), onupdate=func.now())
    )
    
    # 应用工具关联表
    app_tools_table = Table(
        'app_tools', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('app_id', String(50), ForeignKey('apps.app_id'), nullable=False),
        Column('tool_id', Integer, ForeignKey('tools.id'), nullable=False),
        Column('order_index', Integer, nullable=False, default=0),
        Column('config', Text, default='{}'),  # JSON字符串
        Column('created_at', DateTime, default=func.now())
    )
    
    # 创建所有表
    metadata.create_all(engine)
    logger.info("✅ 数据库表结构创建/更新完成")

def run_migration():
    """执行迁移"""
    try:
        logger.info(f"开始数据库迁移，目标: {settings.DATABASE_URL}")
        
        # 创建引擎
        engine = create_engine(settings.DATABASE_URL, echo=False)
        
        # 测试连接
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ 数据库连接成功")
        
        # 创建表结构
        create_tables_if_not_exists(engine)
        
        logger.info("✅ 数据库迁移完成")
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {e}")
        return False

if __name__ == '__main__':
    run_migration()
