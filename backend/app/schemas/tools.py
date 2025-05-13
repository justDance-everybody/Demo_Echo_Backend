from typing import List, Optional
from pydantic import BaseModel, Field


class ToolItem(BaseModel):
    """单个工具信息"""
    
    tool_id: str = Field(..., description="工具唯一标识")
    name: str = Field(..., description="工具名称")
    type: str = Field(..., description="工具类型，如 'mcp' 或 'http'")
    description: Optional[str] = Field(None, description="工具描述")
    source: Optional[str] = Field(None, description="工具来源，如 'MCP' 或 '开发者'")


class ToolsListResponse(BaseModel):
    """工具列表响应模型"""
    
    tools: List[ToolItem] = Field(..., description="工具列表")
    
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        alias_priority = 2  # 确保别名优先 