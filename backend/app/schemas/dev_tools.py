from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from .tools import ToolItem


class DeveloperToolCreate(BaseModel):
    """开发者工具创建请求模型"""
    
    tool_id: str = Field(..., description="工具唯一标识")
    name: str = Field(..., description="工具名称")
    type: str = Field(..., description="工具类型，如 'mcp' 或 'http'")
    description: Optional[str] = Field(None, description="工具描述")
    endpoint: Dict[str, Any] = Field(..., description="工具端点配置")
    request_schema: Dict[str, Any] = Field(..., description="请求参数的JSON Schema")
    response_schema: Optional[Dict[str, Any]] = Field(None, description="响应的JSON Schema")
    server_name: Optional[str] = Field(None, description="MCP服务器名称")
    is_public: bool = Field(True, description="是否公开可用")
    version: str = Field("1.0.0", description="工具版本")
    tags: Optional[List[str]] = Field(None, description="工具标签")


class DeveloperToolUpdate(BaseModel):
    """开发者工具更新请求模型"""
    
    name: Optional[str] = Field(None, description="工具名称")
    description: Optional[str] = Field(None, description="工具描述")
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


class ToolUploadRequest(BaseModel):
    """工具包上传请求模型"""
    
    name: str = Field(..., description="工具包名称")
    description: Optional[str] = Field(None, description="工具包描述")
    version: str = Field("1.0.0", description="版本号")
    tags: Optional[List[str]] = Field(None, description="标签")
    is_public: bool = Field(True, description="是否公开")


class ToolUploadResponse(BaseModel):
    """工具包上传响应模型"""
    
    upload_id: str = Field(..., description="上传ID")
    status: str = Field(..., description="上传状态")
    message: str = Field(..., description="状态消息")
    tools_created: Optional[List[str]] = Field(None, description="创建的工具ID列表")


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