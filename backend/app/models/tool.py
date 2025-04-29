from sqlalchemy import Column, String, JSON, Enum, DateTime
from sqlalchemy.sql import func
from app.utils.db import Base

class Tool(Base):
    """工具模型"""
    __tablename__ = "tools"
    
    tool_id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    type = Column(Enum('mcp', 'http', name='tool_type'), nullable=False)
    description = Column(String(512), nullable=True)
    endpoint = Column(JSON, nullable=False)  # 对于MCP工具，存储script_path等信息；对于HTTP工具，存储URL等信息
    request_schema = Column(JSON, nullable=False)  # 请求参数的JSON Schema
    response_schema = Column(JSON, nullable=True)  # 响应的JSON Schema
    server_name = Column(String(64), nullable=True) # 对于MCP工具，存储其所属服务器的名称 (对应 config/mcp_servers.json 中的 key)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Tool(tool_id={self.tool_id}, name={self.name}, type={self.type})>" 