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
    endpoint: Dict[str, Any] = Field(
        ..., 
        description="工具端点配置：HTTP+dify需 platform='dify' 与以 'app-' 开头的 api_key，base_url 建议包含 '/v1'（默认 https://api.dify.ai/v1）；可选 app_type（chat/workflow/agent/completion），未提供时系统尝试自动探测；HTTP+coze需 platform='coze' 与以 'pat_' 开头的 api_key，默认 base_url=https://api.coze.com/open_api，且 app_config.bot_id 必填（数字）；MCP建议提供 server_name。",
        json_schema_extra={
            "examples": [
                {
                    "platform": "dify",
                    "api_key": "app-xxxxx",
                    "base_url": "https://api.dify.ai/v1",
                    "app_type": "chat",
                    "app_config": {"response_mode": "blocking"}
                },
                {
                    "platform": "dify",
                    "api_key": "app-xxxxx",
                    "base_url": "https://api.dify.ai/v1",
                    "app_type": "workflow",
                    "app_config": {"response_mode": "blocking"}
                },
                {
                    "platform": "dify",
                    "api_key": "app-xxxxx",
                    "base_url": "https://api.dify.ai/v1",
                    "app_type": "agent",
                    "app_config": {"response_mode": "blocking"}
                },
                {
                    "platform": "dify",
                    "api_key": "app-xxxxx",
                    "base_url": "https://api.dify.ai/v1",
                    "app_type": "completion",
                    "app_config": {"response_mode": "blocking"}
                },
                {
                    "platform": "coze",
                    "api_key": "pat_xxxxx",
                    "base_url": "https://api.coze.com/open_api",
                    "app_config": {"bot_id": 123456789}
                }
            ]
        }
    )
    request_schema: Optional[Dict[str, Any]] = Field(
        None, 
        description="请求参数的JSON Schema（HTTP工具未提供将自动生成最小Schema，仅包含 query:string）。",
        json_schema_extra={
            "example": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "用户查询内容"}},
                "required": ["query"]
            }
        }
    )
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
    updated_at: Optional[datetime] = Field(None, description="更新时间")

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
    integration_config: Dict[str, Any] = Field(
        ..., 
        description="工具的完整配置，格式同创建请求体。",
        json_schema_extra={
            "example": {
                "name": "Dify集成测试工具",
                "type": "http",
                "description": "用于测试Dify应用提交与自适应类型的端到端工作",
                "endpoint": {
                    "platform": "dify",
                    "api_key": "app-xxxxx",
                    "base_url": "https://api.dify.ai/v1"
                }
            }
        }
    )
    test_data: Optional[Dict[str, Any]] = Field(None, description="可选的测试数据")


class ToolTestRequest(BaseModel):
    """工具测试请求模型"""
    
    tool_id: Optional[str] = Field(None, description="工具ID（测试已保存工具）")
    tool_config: Optional[Dict[str, Any]] = Field(None, description="工具配置（测试未保存工具）")
    test_data: Dict[str, Any] = Field(..., description="测试数据")
    timeout: Optional[int] = Field(30, description="超时时间（秒）")
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tool_id": "dify_17200000_abcd1234",
                    "test_data": {"query": "你好", "inputs": {}},
                    "timeout": 30
                },
                {
                    "tool_config": {
                        "name": "Dify工作流测试",
                        "type": "http",
                        "description": "...",
                        "endpoint": {
                            "platform": "dify",
                            "api_key": "app-xxxxx",
                            "base_url": "https://api.dify.ai/v1",
                            "app_type": "workflow",
                            "app_config": {"response_mode": "blocking"}
                        }
                    },
                    "test_data": {"inputs": {"k1": "v1"}},
                    "timeout": 30
                },
                {
                    "tool_config": {
                        "name": "Coze测试",
                        "type": "http",
                        "description": "...",
                        "endpoint": {
                            "platform": "coze",
                            "api_key": "pat_xxxxx",
                            "base_url": "https://api.coze.com/open_api",
                            "app_config": {"bot_id": 123456789}
                        }
                    },
                    "test_data": {"query": "你好"},
                    "timeout": 30
                }
            ]
        }
    }


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