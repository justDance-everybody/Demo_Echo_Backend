import os
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from loguru import logger
from pydantic_settings import BaseSettings
from pydantic import Field, Extra

# 加载.env文件
load_dotenv()

class Settings(BaseSettings):
    """应用配置"""
    
    # 应用信息
    APP_NAME: str = "AI Assistant API"
    VERSION: str = "0.1.0"
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    
    # 环境配置
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t", "yes")
    
    # 服务器配置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///test.db")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "ai_assistant")
    
    # LLM配置 (使用通用名称)
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_API_BASE: str = os.getenv("LLM_API_BASE", "https://api.openai.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "60"))
    
    # MCP配置
    MCP_CLIENT_PATH: str = os.getenv("MCP_CLIENT_PATH", "../MCP_Client")
    MCP_SERVERS_PATH: str = os.getenv("MCP_SERVERS_PATH", "../MCP_Client/config/mcp_servers.json")
    
    # 日志配置
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/api.log")
    
    # CORS配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    
    # JWT配置
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 60 * 24 * 7  # 7天，单位:分钟
    
    # 兼容旧配置 (或特定开关)
    USE_MOCK_RESPONSES: bool = os.getenv("USE_MOCK_RESPONSES", "false").lower() == "true"
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore"  # 允许额外字段
        
    def __init__(self, **data: Any):
        super().__init__(**data)
        # 打印关键配置信息，帮助调试
        logger.info(f"加载配置文件: ENV={self.ENV}, DEBUG={self.DEBUG}")
        logger.info(f"LLM_MODEL={self.LLM_MODEL}, API_BASE存在={'是' if self.LLM_API_BASE else '否'}")
        logger.info(f"MCP_SERVERS_PATH={self.MCP_SERVERS_PATH}")

# 创建全局配置实例
settings = Settings()

# # 验证配置加载 (可选，用于调试)
# if __name__ == "__main__":
#     print(settings.dict())
#     print(f"Database URL: {settings.DATABASE_URL}") 