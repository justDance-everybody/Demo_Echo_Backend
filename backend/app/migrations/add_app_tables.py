"""添加App和AppTool表的数据库迁移脚本"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.db import get_async_db_session
import asyncio
import logging

logger = logging.getLogger(__name__)

# App表创建SQL（MySQL语法）
CREATE_APP_TABLE = """
CREATE TABLE IF NOT EXISTS apps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    app_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    developer_id BIGINT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    config JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (developer_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

# AppTool关联表创建SQL（MySQL语法）
CREATE_APP_TOOL_TABLE = """
CREATE TABLE IF NOT EXISTS app_tools (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    app_id VARCHAR(50) NOT NULL,
    tool_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    config JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_app_tool (app_id, tool_id),
    FOREIGN KEY (app_id) REFERENCES apps(app_id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);
"""

# 创建索引（MySQL语法）
CREATE_INDEXES = [
    "CREATE INDEX idx_apps_developer_id ON apps(developer_id);",
    "CREATE INDEX idx_apps_status ON apps(status);",
    "CREATE INDEX idx_apps_is_public ON apps(is_public);",
    "CREATE INDEX idx_apps_created_at ON apps(created_at);",
    "CREATE INDEX idx_app_tools_app_id ON app_tools(app_id);",
    "CREATE INDEX idx_app_tools_tool_id ON app_tools(tool_id);",
]

# MySQL不需要额外的更新时间触发器，因为已经在表定义中使用了ON UPDATE CURRENT_TIMESTAMP
CREATE_UPDATE_TRIGGER = ""

async def run_migration():
    """执行数据库迁移"""
    try:
        async for db in get_async_db_session():
            logger.info("开始执行App表迁移...")
            
            # 创建App表
            await db.execute(text(CREATE_APP_TABLE))
            logger.info("App表创建成功")
            
            # 创建AppTool关联表
            await db.execute(text(CREATE_APP_TOOL_TABLE))
            logger.info("AppTool关联表创建成功")
            
            # 创建索引
            for index_sql in CREATE_INDEXES:
                await db.execute(text(index_sql))
            logger.info("索引创建成功")
            
            # MySQL已在表定义中处理更新时间，无需额外触发器
            if CREATE_UPDATE_TRIGGER:
                await db.execute(text(CREATE_UPDATE_TRIGGER))
                logger.info("更新时间触发器创建成功")
            
            # 提交事务
            await db.commit()
            logger.info("App表迁移完成")
            break
            
    except Exception as e:
        logger.error(f"App表迁移失败: {str(e)}")
        raise

async def rollback_migration():
    """回滚数据库迁移"""
    try:
        async for db in get_async_db_session():
            logger.info("开始回滚App表迁移...")
            
            # MySQL无需删除触发器
            
            # 删除表（注意顺序，先删除有外键依赖的表）
            await db.execute(text("DROP TABLE IF EXISTS app_tools;"))
            await db.execute(text("DROP TABLE IF EXISTS apps;"))
            
            # 提交事务
            await db.commit()
            logger.info("App表迁移回滚完成")
            break
            
    except Exception as e:
        logger.error(f"App表迁移回滚失败: {str(e)}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())