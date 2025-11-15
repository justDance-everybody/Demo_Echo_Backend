from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from .tools import ToolItem


class DeveloperToolCreate(BaseModel):
    """开发者工具创建请求模型"""
    
    tool_id: Optional[str] = Field(None, description="工具唯一标识（可选，留空自动生成）")
    name: str = Field(
        ..., 
        min_length=2,
        max_length=30,
        description="工具名称（2-30字），应简洁明了，如：'心理咨询助手'、'天气查询工具'"
    )
    type: str = Field(..., description="工具类型，如 'mcp' 或 'http'")
    description: str = Field(
        ..., 
        min_length=20,
        max_length=200,
        description="工具描述（20-200字）。必须包含：1) 工具功能 2) 适用场景 3) 触发关键词。例如：'专业心理咨询工具。当用户表达负面情绪（悲伤、焦虑、孤独）或需要情感支持时使用。适用：倾诉烦恼、寻求安慰、情绪低落等场景。'"
    )
    endpoint: Dict[str, Any] = Field(..., description="工具端点配置")
    request_schema: Optional[Dict[str, Any]] = Field(None, description="请求参数的JSON Schema（HTTP工具可选，自动生成）")
    response_schema: Optional[Dict[str, Any]] = Field(None, description="响应的JSON Schema")
    server_name: Optional[str] = Field(None, description="MCP服务器名称")
    is_public: bool = Field(True, description="是否公开可用")
    version: str = Field("1.0.0", description="工具版本")
    tags: Optional[List[str]] = Field(None, description="工具标签")


class DeveloperToolUpdate(BaseModel):
    """开发者工具更新请求模型"""
    
    name: Optional[str] = Field(
        None, 
        min_length=2,
        max_length=30,
        description="工具名称（2-30字）"
    )
    description: Optional[str] = Field(
        None, 
        min_length=20,
        max_length=200,
        description="工具描述（20-200字）。应包含功能、适用场景和触发关键词。"
    )
    endpoint: Optional[Dict[str, Any]] = Field(None, description="工具端点配置")
    request_schema: Optional[Dict[str, Any]] = Field(None, description="请求参数的JSON Schema")
    response_schema: Optional[Dict[str, Any]] = Field(None, description="响应的JSON Schema")
    server_name: Optional[str] = Field(None, description="MCP服务器名称")
    is_public: Optional[bool] = Field(None, description="是否公开可用")
    status: Optional[str] = Field(None, description="工具状态")
    version: Optional[str] = Field(None, description="工具版本")
    tags: Optional[List[str]] = Field(None, description="工具标签")


class DeveloperToolResponse(BaseModel):
    """开发者工具响应模型"""
    
    tool_id: str = Field(..., description="工具唯一标识")
    name: str = Field(..., description="工具名称")
    type: str = Field(..., description="工具类型")
    description: Optional[str] = Field(None, description="工具描述")
    endpoint: Dict[str, Any] = Field(..., description="工具端点配置")
    request_schema: Dict[str, Any] = Field(..., description="请求参数的JSON Schema")
    response_schema: Optional[Dict[str, Any]] = Field(None, description="响应的JSON Schema")
    server_name: Optional[str] = Field(None, description="MCP服务器名称")
    developer_id: Optional[int] = Field(None, description="开发者用户ID")
    developer_username: Optional[str] = Field(None, description="开发者用户名")
    is_public: bool = Field(..., description="是否公开可用")
    status: str = Field(..., description="工具状态")
    version: str = Field(..., description="工具版本")
    tags: Optional[List[str]] = Field(None, description="工具标签")
    download_count: int = Field(..., description="下载次数")
    rating: Optional[float] = Field(None, description="用户评分")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


class DeveloperToolListResponse(BaseModel):
    """开发者工具列表响应模型"""
    
    tools: List[DeveloperToolResponse] = Field(..., description="工具列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    
    class Config:
        from_attributes = True


class ToolValidateRequest(BaseModel):
    """预提交测试请求模型"""
    integration_config: Dict[str, Any] = Field(..., description="工具的完整配置")
    test_data: Optional[Dict[str, Any]] = Field(None, description="可选的测试数据")


class ToolTestRequest(BaseModel):
    """工具测试请求模型"""
    
    tool_id: Optional[str] = Field(None, description="工具ID（测试已保存工具）")
    tool_config: Optional[Dict[str, Any]] = Field(None, description="工具配置（测试未保存工具）")
    test_data: Dict[str, Any] = Field(..., description="测试数据")
    timeout: Optional[int] = Field(30, description="超时时间（秒）")


class ToolTestResponse(BaseModel):
    """工具测试响应模型"""
    
    success: bool = Field(..., description="测试是否成功")
    result: Optional[Dict[str, Any]] = Field(None, description="测试结果")
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: float = Field(..., description="执行时间（秒）")
    timestamp: datetime = Field(..., description="测试时间")


class DeveloperAppCreate(BaseModel):
    """开发者应用创建请求模型"""
    
    name: str = Field(..., description="应用名称")
    description: Optional[str] = Field(None, description="应用描述")
    version: str = Field("1.0.0", description="应用版本")
    is_public: bool = Field(True, description="是否公开")
    tool_ids: Optional[List[int]] = Field(None, description="关联的工具ID列表")


class DeveloperAppUpdate(BaseModel):
    """开发者应用更新请求模型"""
    
    name: Optional[str] = Field(None, description="应用名称")
    description: Optional[str] = Field(None, description="应用描述")
    version: Optional[str] = Field(None, description="应用版本")
    is_public: Optional[bool] = Field(None, description="是否公开")
    status: Optional[str] = Field(None, description="应用状态")
    tool_ids: Optional[List[int]] = Field(None, description="关联的工具ID列表")


class DeveloperAppResponse(BaseModel):
    """开发者应用响应模型"""
    
    app_id: str = Field(..., description="应用ID")
    name: str = Field(..., description="应用名称")
    description: Optional[str] = Field(None, description="应用描述")
    version: str = Field(..., description="应用版本")
    developer_id: int = Field(..., description="开发者用户ID")
    is_public: bool = Field(..., description="是否公开")
    status: str = Field(..., description="应用状态")
    tools: List[int] = Field(..., description="关联的工具ID列表")
    config: Dict[str, Any] = Field(default_factory=dict, description="应用配置")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


class DeveloperAppListResponse(BaseModel):
    """开发者应用列表响应模型"""
    
    apps: List[DeveloperAppResponse] = Field(..., description="应用列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    
    class Config:
        from_attributes = True


class DeveloperToolBase(BaseModel):
    """开发者工具基础模型"""
    name: str = Field(..., min_length=2, max_length=50, description="工具名称")
    type: str = Field(..., description="工具类型 (mcp, http)")
    description: Optional[str] = Field(None, max_length=500, description="工具描述")
    endpoint: Dict[str, Any] = Field(..., description="工具端点配置")
    request_schema: Optional[Dict[str, Any]] = Field(None, description="请求参数的JSON Schema")
    response_schema: Optional[Dict[str, Any]] = Field(None, description="响应数据的JSON Schema")
    is_public: bool = Field(False, description="是否公开")
    version: str = Field("1.0.0", description="工具版本")
    tags: Optional[List[str]] = Field(None, description="工具标签")
    
    class Config:
        orm_mode = True
        
        
class DeveloperToolCreate(DeveloperToolBase):
    """开发者工具创建模型"""
    tool_id: Optional[str] = Field(None, min_length=3, max_length=50, description="自定义工具ID")
    server_name: Optional[str] = Field(None, description="MCP服务器名称")


class DeveloperToolUpdate(BaseModel):
    """开发者工具更新模型"""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    endpoint: Optional[Dict[str, Any]] = None
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    version: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class DeveloperToolResponse(DeveloperToolBase):
    """开发者工具响应模型"""
    tool_id: str
    developer_id: int
    developer_username: Optional[str] = None
    status: str
    download_count: int
    rating: float
    created_at: datetime
    updated_at: datetime
    server_name: Optional[str] = None


class DeveloperToolListResponse(BaseModel):
    """开发者工具列表响应模型"""
    tools: List[DeveloperToolResponse]
    total: int
    page: int
    page_size: int


class ToolTestRequest(BaseModel):
    """工具测试请求模型"""
    test_data: Dict[str, Any]


class ToolValidateRequest(BaseModel):
    """预提交测试请求模型"""
    integration_config: DeveloperToolCreate
    test_data: Optional[Dict[str, Any]] = None


class ToolTestResponse(BaseModel):
    """工具测试响应模型"""
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time: float
    timestamp: datetime