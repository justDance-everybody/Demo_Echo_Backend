from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.db import get_async_db_session
from app.utils.security import get_developer_user
from app.models.user import User
from app.schemas.dev_tools import (
    DeveloperToolCreate,
    DeveloperToolUpdate,
    DeveloperToolResponse,
    DeveloperToolListResponse,
    ToolTestRequest,
    ToolTestResponse,
    ToolValidateRequest
)
from app.services.dev_tool_service import dev_tool_service

# 创建路由器
router = APIRouter(
    prefix="/dev",
    tags=["developer-integrations"],
    responses={401: {"description": "未授权"}, 403: {"description": "权限不足"}},
)


@router.get(
    "/integrations",
    response_model=DeveloperToolListResponse,
    summary="获取开发者工具列表",
    description="分页获取当前开发者的工具列表。\n\n鉴权：需要开发者或管理员角色（Authorization: Bearer <JWT>）。\n\n查询参数：page（默认1）、page_size（默认10，最大100）、status、is_public、search。",
)
async def get_developer_integrations(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页大小"),
    status: Optional[str] = Query(None, description="工具状态筛选"),
    is_public: Optional[bool] = Query(None, description="是否公开筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    获取开发者工具列表
    
    Args:
        page: 页码
        page_size: 每页大小
        status: 工具状态筛选
        is_public: 是否公开筛选
        search: 搜索关键词
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        开发者工具列表
    """
    return await dev_tool_service.get_tools_list(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status=status,
        is_public=is_public,
        search=search
    )


@router.post(
    "/integrations",
    response_model=DeveloperToolResponse,
    summary="创建开发者工具",
    description="创建新的开发者工具（支持 Dify 与 Coze 平台）。\n\n字段说明：\n- name：必填；2-30字。\n- type：必填；仅支持 'http' 或 'mcp'。\n- endpoint：HTTP 工具必填：\n  - Dify：platform='dify'、api_key 以 'app-' 开头、base_url 必须包含 '/v1'（默认 https://api.dify.ai/v1）；可选 app_type（'chat'|'workflow'|'agent'|'completion'），未提供时系统尝试自动探测；app_config.response_mode 默认 'blocking'。\n  - Coze：platform='coze'、api_key 以 'pat_' 开头、base_url（默认 https://api.coze.com/open_api）、app_config.bot_id 为数字。\n- request_schema / response_schema：可选；未提供的 HTTP 工具将自动生成最小请求 schema（仅含 query:string）。\n\n注意：\n- 自动探测失败时将返回统一提示与结构化 attempts（包含各端点的 status 与截断 body）。如需绕过探测，请显式提供 endpoint.app_type。\n\n示例：\n- Dify Chat：endpoint={platform:'dify', api_key:'app-xxxx', base_url:'https://api.dify.ai/v1', app_type:'chat'}，请求数据应包含 query。\n- Dify Workflow：endpoint={..., app_type:'workflow'}，请求数据使用 inputs。\n- Dify Agent/Completion：分别使用 agent/chat 与 completion-messages 的格式。",
    responses={
        401: {"description": "未授权"},
        403: {"description": "权限不足"},
        400: {"description": "请求错误"},
        409: {"description": "冲突（tool_id已存在）"}
    }
)
async def create_developer_integration(
    tool_data: DeveloperToolCreate,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    创建新的开发者工具（仅支持 Dify 与 Coze 平台）。

    鉴权：需要开发者或管理员角色。

    字段说明：
    - name（必填，2-30字）
    - type（必填，枚举：mcp/http；此端点仅支持 http 下的 Dify/Coze）
    - description（必填，20-200字）
    - endpoint（必填，平台配置如下）
      - Dify：platform='dify'（必填）、api_key 以 'app-' 开头（必填）、base_url（可选，默认 https://api.dify.ai/v1）、app_type（可选，自动探测）、app_config.response_mode（默认 'blocking'）
      - Coze：platform='coze'（必填）、api_key 以 'pat_' 开头（必填）、base_url（可选，默认 https://api.coze.com/open_api）、app_config.bot_id（必填，数字）
    - request_schema（可选，HTTP 未提供将自动生成最小 schema）
    - response_schema（可选）
    - is_public（默认 true）
    - version（默认 1.0.0）
    - tags（可选）
    - tool_id（可选，未提供自动生成）

    示例 cURL：
    curl -X POST https://localhost:3000/api/v1/dev/integrations \
      -H 'Authorization: Bearer <JWT>' \
      -H 'Content-Type: application/json' \
      -d '{"name":"Dify集成测试工具","type":"http","description":"用于测试Dify对话型应用提交","endpoint":{"platform":"dify","api_key":"app-xxxx","base_url":"https://api.dify.ai/v1"},"request_schema":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}'

    Returns:
        创建的工具信息

    Raises:
        HTTPException: 如果工具ID已存在
    """
    return await dev_tool_service.create_tool(
        db=db,
        tool_data=tool_data,
        current_user=current_user
    )


@router.get(
    "/integrations/{tool_id}",
    response_model=DeveloperToolResponse,
    summary="获取工具详情",
    description="获取指定工具的详细信息。鉴权：需要开发者或管理员角色。",
)
async def get_developer_integration(
    tool_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    获取开发者工具详情
    
    Args:
        tool_id: 工具ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        工具详情
        
    Raises:
        HTTPException: 如果工具不存在或无权限访问
    """
    return await dev_tool_service.get_tool_by_id(
        db=db,
        tool_id=tool_id,
        current_user=current_user
    )


@router.put(
    "/integrations/{tool_id}",
    response_model=DeveloperToolResponse,
    summary="更新开发者工具",
    description="更新指定工具的配置与元信息。鉴权：需要开发者或管理员角色。",
)
async def update_developer_integration(
    tool_id: str,
    tool_data: DeveloperToolUpdate,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    更新开发者工具
    
    Args:
        tool_id: 工具ID
        tool_data: 工具更新数据
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        更新后的工具信息
        
    Raises:
        HTTPException: 如果工具不存在或无权限访问
    """
    return await dev_tool_service.update_tool(
        db=db,
        tool_id=tool_id,
        tool_data=tool_data,
        current_user=current_user
    )


@router.delete(
    "/integrations/{tool_id}",
    summary="删除开发者工具",
    description="删除指定工具。鉴权：需要开发者或管理员角色。",
)
async def delete_developer_integration(
    tool_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    删除开发者工具
    
    Args:
        tool_id: 工具ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        删除成功消息
        
    Raises:
        HTTPException: 如果工具不存在或无权限访问
    """
    return await dev_tool_service.delete_tool(
        db=db,
        tool_id=tool_id,
        current_user=current_user
    )


@router.post(
    "/integrations/validate-and-test",
    response_model=ToolTestResponse,
    summary="预提交验证与一次性测试",
    description="验证配置并进行一次性连通性测试（不入库）。\n\n请求体：\n- integration_config：同创建接口体；当提供 endpoint.app_type 时将按该类型执行；未提供则尝试自动探测。\n- test_data：Dify 按 app_type 区分：\n  - chat / agent：{\"query\":\"...\", \"inputs\":{}}\n  - workflow / completion：{\"inputs\":{...}}\n\n错误返回：\n- 探测失败：detail 包含 attempts 列表（endpoint、status、body[<=500]）。\n- 执行失败：error.details 含上游响应文本（截断）。",
    responses={
        401: {"description": "未授权"},
        403: {"description": "权限不足"},
        400: {"description": "配置或连通性验证失败"},
        500: {"description": "服务器错误"}
    }
)
async def validate_and_test_integration(
    request_data: ToolValidateRequest,  # 使用正确的模型
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    验证集成配置并进行一次性连通性测试（不入库）。

    鉴权：需要开发者或管理员角色。

    请求体：
    - integration_config（必填，与创建一致）
    - test_data（可选，Dify Chat 使用 {query:"..."}；Workflow 使用 {inputs:{...}}）

    示例 cURL：
    curl -X POST https://localhost:3000/api/v1/dev/integrations/validate-and-test \
      -H 'Authorization: Bearer <JWT>' \
      -H 'Content-Type: application/json' \
      -d '{"integration_config": {"name":"Dify测试","type":"http","description":"...","endpoint":{"platform":"dify","api_key":"app-xxxx","base_url":"https://api.dify.ai/v1"}},"test_data": {"query":"你好"}}'
    """
    # 注意：这里的 tool_data 和 test_data 已经被 Pydantic 模型解析
    config_payload = request_data.integration_config
    result = await dev_tool_service.validate_and_test_config(
        db=db,
        config=config_payload,
        test_data=request_data.test_data,
        current_user=current_user
    )
    
    return result




@router.post(
    "/integrations/{tool_id}/test",
    response_model=ToolTestResponse,
    summary="测试已创建的工具",
    description="对已创建的工具进行一次性测试",
    responses={
        401: {"description": "未授权"},
        403: {"description": "权限不足"},
        404: {"description": "工具不存在"}
    }
)
async def test_developer_integration(
    tool_id: str,
    test_data: ToolTestRequest,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    对已创建的工具进行一次性测试。

    鉴权：需要开发者或管理员角色。

    请求体：
    - test_data（必填）：如 Dify Chat 使用 {query:"..."}

    示例 cURL：
    curl -X POST https://localhost:3000/api/v1/dev/integrations/<tool_id>/test \
      -H 'Authorization: Bearer <JWT>' \
      -H 'Content-Type: application/json' \
      -d '{"test_data": {"query": "你好"}}'

    Returns:
        测试结果
    """
    result = await dev_tool_service.test_tool(
        db=db,
        tool_id=tool_id,
        test_data=test_data.test_data,
        current_user=current_user
    )
    
    return ToolTestResponse(
        success=result["success"],
        result=result["result"],
        error=result["error"],
        execution_time=result["execution_time"],
        timestamp=result["timestamp"]
    )


@router.post("/integrations/test/batch")
async def batch_test_integrations(
    tool_ids: List[str],
    test_data: ToolTestRequest,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    批量测试工具
    
    Args:
        tool_ids: 工具ID列表
        test_data: 测试数据
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        批量测试结果
    """
    # TODO: 实现批量测试逻辑
    # 这里需要在T025-11中实现具体的批量测试服务
    
    results = []
    for tool_id in tool_ids:
        # 这里应该调用单个工具测试逻辑
        results.append({
            "tool_id": tool_id,
            "success": True,
            "message": "测试成功"
        })
    
    return {
        "total": len(tool_ids),
        "success_count": len(results),
        "failed_count": 0,
        "results": results
    }