from sqlalchemy import Column, String, JSON, Enum, DateTime, Integer, Boolean, Float, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.utils.db import Base

class Tool(Base):
    """工具模型"""
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tool_id = Column(String(64), nullable=False)
    name = Column(String(128), nullable=False)
    type = Column(Enum('mcp', 'http', name='tool_type'), nullable=False)
    description = Column(String(512), nullable=True)
    endpoint = Column(JSON, nullable=False)  # 对于MCP工具，存储script_path等信息；对于HTTP工具，存储URL等信息
    request_schema = Column(JSON, nullable=False)  # 请求参数的JSON Schema
    response_schema = Column(JSON, nullable=True)  # 响应的JSON Schema
    server_name = Column(String(64), nullable=True) # 对于MCP工具，存储其所属服务器的名称 (对应 config/mcp_servers.json 中的 key)

    # 开发者相关字段
    developer_id = Column(BigInteger, ForeignKey('users.id'), nullable=True)  # 开发者用户ID，外键关联User表
    is_public = Column(Boolean, default=True, nullable=False)  # 是否公开可用
    status = Column(Enum('active', 'inactive', 'pending', name='tool_status'), default='active', nullable=False)  # 工具状态
    version = Column(String(32), default='1.0.0', nullable=False)  # 工具版本
    tags = Column(JSON, nullable=True)  # 工具标签，JSON格式存储
    download_count = Column(Integer, default=0, nullable=False)  # 下载次数
    rating = Column(Float, nullable=True)  # 用户评分

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    developer = relationship("User", back_populates="tools")

    def __repr__(self):
        return f"<Tool(tool_id={self.tool_id}, name={self.name}, type={self.type})>"
