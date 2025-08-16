import os
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path # 导入 Path
from dotenv import load_dotenv
from loguru import logger
from pydantic_settings import BaseSettings
from pydantic import Field, Extra
import os

# # load_dotenv() # pydantic-settings 会自动加载 env_file 指定的文件

# 获取 backend 目录的绝对路径
BACKEND_DIR = Path(__file__).parent.parent
DOTENV_PATH = BACKEND_DIR / ".env"

logger.info(f"尝试加载 .env 文件: {DOTENV_PATH}, 是否存在: {DOTENV_PATH.exists()}")

# 定义测试环境的 MySQL 连接字符串
TEST_MYSQL_URL = "mysql+pymysql://testuser:testpass123@localhost:3306/ai_assistant_test"
DEFAULT_SQLITE_URL = "sqlite:///test.db"

class Settings(BaseSettings):
    """测试环境应用配置"""
    
    # 应用信息
    APP_NAME: str = Field(default="AI Assistant API - Test", env="APP_NAME")
    VERSION: str = Field(default="0.1.0-test", env="VERSION")
    API_PREFIX: str = Field(default="/api/v1", env="API_PREFIX")
    
    # 环境配置
    ENV: str = Field(default="testing", env="ENV")
    # DEBUG 需要特殊处理，因为环境变量通常是字符串
    DEBUG_STR: str = Field(default="True", env="DEBUG") 
    @property
    def DEBUG(self) -> bool:
        return self.DEBUG_STR.lower() in ("true", "1", "t", "yes")

    # 服务器配置
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=3000, env="PORT")
    
    # 测试模式标识
    TEST_MODE: bool = Field(default=True, env="TEST_MODE")
    
    # 数据库配置 - 测试环境专用
    DATABASE_URL: str = Field(default=TEST_MYSQL_URL, env="DATABASE_URL") 
    DATABASE_NAME: str = Field(default="ai_assistant_test", env="DATABASE_NAME")
    DB_USER: str = Field(default="testuser", env="DB_USER")
    DB_PASSWORD: str = Field(default="testpass123", env="DB_PASSWORD")
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=3306, env="DB_PORT")
    DB_NAME: str = Field(default="ai_assistant_test", env="DB_NAME")
    
    # LLM配置 (使用通用名称)
    LLM_API_KEY: str = Field(default="", env="LLM_API_KEY")
    LLM_API_BASE: str = Field(default="https://api.openai.com/v1", env="LLM_API_BASE")
    LLM_MODEL: str = Field(default="gpt-3.5-turbo", env="LLM_MODEL")
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
    CORS_ORIGINS: List[str] = Field(default=["http://localhost:3000","http://localhost:3001","*"], env="CORS_ORIGINS")
    
    # JWT配置
    JWT_SECRET: str = Field(default="your-secret-key", env="JWT_SECRET")
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
        # 测试环境强制检查并设置数据库URL
        if self.DATABASE_URL == DEFAULT_SQLITE_URL or not self.DATABASE_URL:
            logger.warning(f"DATABASE_URL 未从环境或.env正确加载 (当前值: '{self.DATABASE_URL}'), 强制设置为测试环境的 MySQL URL")
            self.DATABASE_URL = TEST_MYSQL_URL
            # 重新提取数据库名，以防万一
            try:
                db_name_from_url = self.DATABASE_URL.split('/')[-1]
                if '?' in db_name_from_url:
                    db_name_from_url = db_name_from_url.split('?')[0]
                self.DATABASE_NAME = db_name_from_url
            except Exception:
                 logger.warning("无法从强制设置的URL中提取数据库名，将使用测试默认值")
                 self.DATABASE_NAME = "ai_assistant_test"
                 
        # 打印关键配置信息，帮助调试
        logger.info(f"加载测试配置文件: ENV={self.ENV}, DEBUG={self.DEBUG}, TEST_MODE={self.TEST_MODE}")
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