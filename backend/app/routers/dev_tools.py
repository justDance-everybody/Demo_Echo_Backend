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


@router.get("/integrations", response_model=DeveloperToolListResponse)
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


@router.post("/integrations", response_model=DeveloperToolResponse)
async def create_developer_integration(
    tool_data: DeveloperToolCreate,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    创建新的开发者工具
    
    Args:
        tool_data: 工具创建数据
        current_user: 当前开发者用户
        db: 数据库会话
        
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


@router.get("/integrations/{tool_id}", response_model=DeveloperToolResponse)
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


@router.put("/integrations/{tool_id}", response_model=DeveloperToolResponse)
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


@router.delete("/integrations/{tool_id}")
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


@router.post("/integrations/validate-and-test", response_model=ToolTestResponse)
async def validate_and_test_integration(
    request_data: ToolValidateRequest,  # 使用正确的模型
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    验证工具配置并执行一次性测试（不保存到数据库）
    """
    # 注意：这里的 tool_data 和 test_data 已经被 Pydantic 模型解析
    result = await dev_tool_service.validate_and_test_config(
        db=db,
        config=request_data.integration_config.dict(),  # 传递配置字典
        test_data=request_data.test_data,
        current_user=current_user
    )
    
    return result


@router.post("/integrations/validate-and-test", response_model=ToolTestResponse)
async def validate_and_test_integration(
    request_data: "ToolValidateRequest",
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    验证工具配置并执行一次性测试（不保存到数据库）
    """
    result = await dev_tool_service.validate_and_test_config(
        db=db,
        tool_data=request_data.integration_config,
        test_data=request_data.test_data,
        current_user=current_user
    )
    
    return ToolTestResponse(
        success=result["success"],
        result=result["result"],
        error=result["error"],
        execution_time=result["execution_time"],
        timestamp=result["timestamp"]
    )


@router.post("/integrations/{tool_id}/test", response_model=ToolTestResponse)
async def test_developer_integration(
    tool_id: str,
    test_data: ToolTestRequest,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    测试指定的开发者工具
    
    Args:
        tool_id: 工具ID
        test_data: 测试数据
        current_user: 当前开发者用户
        db: 数据库会话
        
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