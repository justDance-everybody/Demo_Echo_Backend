from typing import Dict, List, Any, Optional, Union, Literal, Annotated
from pydantic import BaseModel, Field


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
    session_id: Optional[str] = Field(None, alias="sessionId", description="会话ID")
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


# --- 新的响应 Schema --- BEGIN


class ToolCall(BaseModel):
    """单个工具调用信息"""

    tool_id: str = Field(..., description="要调用的工具ID")
    parameters: Dict[str, Any] = Field(..., description="调用工具所需的参数")


class InterpretToolCallResponse(BaseModel):
    """意图解析后要求调用工具的响应"""

    type: Literal["tool_call"] = "tool_call"
    tool_calls: List[ToolCall] = Field(..., description="需要执行的工具调用列表")
    confirmText: Optional[str] = Field(None, description="需要向用户复述确认的文本")
    sessionId: Optional[str] = Field(None, description="会话ID")


class InterpretDirectResponse(BaseModel):
    """意图解析后直接回复的响应"""

    type: Literal["direct_response"] = "direct_response"
    content: str = Field(..., description="LLM直接生成的回复内容")
    sessionId: Optional[str] = Field(None, description="会话ID")


# 创建一个具体的响应类，包含Union类型的字段，而不是直接使用Union
class InterpretSuccessResponse(BaseModel):
    """统一响应模型，包含所有可能的响应类型"""
    
    # 使用别名确保JSON输出中的字段名为sessionId 
    session_id: Optional[str] = Field(None, alias="sessionId", description="会话ID")
    
    # 使用Literal字段定义响应类型
    type: Literal["tool_call", "direct_response"]

    # 可选字段，当type=tool_call时存在
    tool_calls: Optional[List[ToolCall]] = None
    confirmText: Optional[str] = None
    
    # 可选字段，当type=direct_response时存在
    content: Optional[str] = None
    
    # 添加模型配置，确保始终使用别名
    class Config:
        populate_by_name = True  # 允许使用字段名填充值
        json_encoders = {}
        alias_generator = None
        use_enum_values = True
        validate_assignment = True
        arbitrary_types_allowed = False
        validate_all = False
        allow_population_by_field_name = True
        extra = "ignore"  # 忽略额外字段
        json_schema_extra = None  
        
        # 重要配置: 确保JSON输出使用字段的别名
        alias_priority = 2  # 给别名高优先级

# --- 新的响应 Schema --- END
