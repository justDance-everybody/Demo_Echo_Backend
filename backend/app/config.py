import os
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path # 导入 Path
from dotenv import load_dotenv
from loguru import logger
from pydantic_settings import BaseSettings
from pydantic import Field, Extra

# # load_dotenv() # pydantic-settings 会自动加载 env_file 指定的文件

# 获取 backend 目录的绝对路径
BACKEND_DIR = Path(__file__).parent.parent
DOTENV_PATH = BACKEND_DIR / ".env"

logger.info(f"尝试加载 .env 文件: {DOTENV_PATH}, 是否存在: {DOTENV_PATH.exists()}")

# 默认数据库配置 - 生产环境应通过环境变量覆盖
DEFAULT_SQLITE_URL = "sqlite:///app.db"  # 使用更通用的数据库名称

class Settings(BaseSettings):
    """应用配置"""
    
    # 应用信息
    APP_NAME: str = Field(default="AI Assistant API", env="APP_NAME")
    VERSION: str = Field(default="0.1.0", env="VERSION")
    API_PREFIX: str = Field(default="/api/v1", env="API_PREFIX")
    
    # 环境配置
    ENV: str = Field(default="development", env="ENV")
    # DEBUG 需要特殊处理，因为环境变量通常是字符串
    DEBUG_STR: str = Field(default="True", env="DEBUG") 
    @property
    def DEBUG(self) -> bool:
        return self.DEBUG_STR.lower() in ("true", "1", "t", "yes")

    # 服务器配置
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=3000, env="PORT")
    
    # 数据库配置
    # 让 pydantic-settings 处理 env var 和 default
    DATABASE_URL: str = Field(default=DEFAULT_SQLITE_URL, env="DATABASE_URL") 
    DATABASE_NAME: str = Field(default="ai_assistant", env="DATABASE_NAME")
    
    # LLM配置 (使用通用名称)
    LLM_API_KEY: str = Field(default="", env="LLM_API_KEY")
    LLM_API_BASE: str = Field(default="", env="LLM_API_BASE")  # 移除硬编码的API地址
    LLM_MODEL: str = Field(default="", env="LLM_MODEL")  # 移除硬编码的模型名称
    LLM_TIMEOUT: int = Field(default=60, env="LLM_TIMEOUT")
    # 新增 LLM 参数
    LLM_TEMPERATURE: float = Field(default=0.7, env="LLM_TEMPERATURE")
    LLM_MAX_TOKENS: int = Field(default=1000, env="LLM_MAX_TOKENS")
    
    # MCP配置
    MCP_CLIENT_PATH: str = Field(default="../MCP_Client", env="MCP_CLIENT_PATH")
    MCP_SERVERS_PATH: str = Field(default="../MCP_Client/config/mcp_servers.json", env="MCP_SERVERS_PATH")
    
    # 日志配置
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: str = Field(default="logs/api.log", env="LOG_FILE")
    
    # CORS配置
    CORS_ORIGINS_STR: str = Field(default="", env="CORS_ORIGINS")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """解析CORS_ORIGINS环境变量为列表"""
        if not self.CORS_ORIGINS_STR:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(',') if origin.strip()]
    
    # 安全配置
    JWT_SECRET: str = Field(default="", env="JWT_SECRET")  # 移除硬编码的密钥
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_EXPIRATION: int = Field(default=60 * 24 * 7, env="JWT_EXPIRATION") # 7天，单位:分钟
    
    # 兼容旧配置 (或特定开关)
    USE_MOCK_RESPONSES_STR: str = Field(default="false", env="USE_MOCK_RESPONSES")
    @property
    def USE_MOCK_RESPONSES(self) -> bool:
        return self.USE_MOCK_RESPONSES_STR.lower() == "true"
    
    class Config:
        env_file = DOTENV_PATH # 显式指定 .env 文件路径
        env_file_encoding = 'utf-8'
        extra = "ignore"  # 允许额外字段
        case_sensitive = False # 环境变量名不区分大小写
        
    def __init__(self, **data: Any):
        super().__init__(**data)
        # 验证关键配置是否已设置
        if self.DATABASE_URL == DEFAULT_SQLITE_URL:
            logger.warning("使用默认SQLite数据库，生产环境请设置DATABASE_URL环境变量")
        
        # 从DATABASE_URL提取数据库名（如果需要）
        if self.DATABASE_URL and self.DATABASE_URL != DEFAULT_SQLITE_URL:
            try:
                db_name_from_url = self.DATABASE_URL.split('/')[-1]
                if '?' in db_name_from_url:
                    db_name_from_url = db_name_from_url.split('?')[0]
                if db_name_from_url:
                    self.DATABASE_NAME = db_name_from_url
            except Exception:
                logger.warning("无法从DATABASE_URL中提取数据库名，使用默认值")
                 
        # 打印关键配置信息，帮助调试
        logger.info(f"加载配置文件: ENV={self.ENV}, DEBUG={self.DEBUG}")
        logger.info(f"LLM_MODEL={self.LLM_MODEL}, API_BASE存在={'是' if self.LLM_API_BASE else '否'}")
        logger.info(f"MCP_SERVERS_PATH={self.MCP_SERVERS_PATH}")
        # logger.info(f"DATABASE_URL (最终使用): {self.DATABASE_URL}") # 不再打印数据库URL
        logger.info(f"DATABASE_NAME (最终使用): {self.DATABASE_NAME}")

# 创建全局配置实例
settings = Settings()

# # 验证配置加载 (可选，用于调试)
# if __name__ == "__main__":
#     print(settings.dict())
#     print(f"Database URL: {settings.DATABASE_URL}")