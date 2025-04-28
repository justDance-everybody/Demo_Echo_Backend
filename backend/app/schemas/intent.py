from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import uuid

class Entity(BaseModel):
    """实体模型"""
    type: str = Field(..., description="实体类型")
    value: str = Field(..., description="实体值")
    start: int = Field(..., description="实体在原文中的起始位置")
    end: int = Field(..., description="实体在原文中的结束位置")

class IntentData(BaseModel):
    """意图数据模型"""
    intent: str = Field(..., description="意图类型")
    confidence: float = Field(..., description="置信度")
    entities: List[Entity] = Field(default_factory=list, description="识别到的实体列表")
    query_paraphrase: str = Field(..., description="查询的改写形式")
    required_tools: List[str] = Field(default_factory=list, description="所需工具列表")
    analysis: str = Field(..., description="分析解释")

class IntentRequest(BaseModel):
    """意图请求模型"""
    query: str = Field(..., description="用户查询")
    session_id: Optional[str] = Field(None, description="会话ID")
    user_id: Optional[str] = Field(None, description="用户ID")
    context: Optional[Dict[str, Any]] = Field(None, description="上下文信息")

class IntentResponse(BaseModel):
    """意图响应模型"""
    query: str = Field(..., description="原始查询")
    processed: bool = Field(..., description="是否成功处理")
    intent: Dict[str, Any] = Field(..., description="意图分析结果")
    tools: List[str] = Field(default_factory=list, description="推荐工具列表")
    session_id: Optional[str] = Field(None, description="会话ID")
    error: Optional[str] = Field(None, description="错误信息")

class ToolExecutionRequest(BaseModel):
    """工具执行请求模型"""
    tool_id: str = Field(..., description="工具ID")
    params: Dict[str, Any] = Field(default_factory=dict, description="工具参数")
    session_id: str = Field(..., description="会话ID")
    intent_data: IntentData = Field(..., description="意图数据")

class ToolExecutionResponse(BaseModel):
    """工具执行响应模型"""
    tool_id: str = Field(..., description="工具ID")
    success: bool = Field(..., description="是否执行成功")
    result: Any = Field(..., description="执行结果")
    session_id: str = Field(..., description="会话ID")
    error: Optional[str] = Field(None, description="错误信息") 