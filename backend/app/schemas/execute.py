from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    """执行工具的请求模型"""

    tool_id: str = Field(..., description="要执行的工具的ID")
    params: Dict[str, Any] = Field(..., description="传递给工具的参数")
    session_id: Optional[str] = Field(None, description="当前会话的ID")
    user_id: Optional[int] = Field(None, description="发起请求的用户ID")
    
    # 添加模型配置
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        extra = "ignore"


class ExecuteResult(BaseModel):
    """工具执行结果的详细信息"""

    message: Optional[str] = Field(None, description="工具执行返回的消息或结果")
    # 可以根据需要添加更多结构化字段，例如 data: Optional[Dict] = None


class ExecuteResponse(BaseModel):
    """执行工具的响应模型"""

    tool_id: str = Field(..., description="被执行的工具ID")
    success: bool = Field(..., description="工具是否成功执行")
    data: Optional[Dict[str, Any]] = Field(None, description="工具执行成功时返回的数据")
    error: Optional[Dict[str, Any]] = Field(
        None,
        description="工具执行失败时的错误信息, e.g., {'code': '...', 'message': '...'}",
    )
    session_id: Optional[str] = Field(None, description="当前会话的ID")

    # 添加模型配置
    class Config:
        populate_by_name = True
        extra = "ignore"
