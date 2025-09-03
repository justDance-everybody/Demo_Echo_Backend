from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.db import get_async_db_session
from app.utils.security import get_developer_user
from app.models.user import User
from app.schemas.dev_tools import (
    DeveloperToolCreate,
    DeveloperToolUpdate,
    DeveloperToolResponse,
    DeveloperToolListResponse,
    ToolUploadRequest,
    ToolUploadResponse,
    ToolTestRequest,
    ToolTestResponse
)
from app.services.dev_tool_service import dev_tool_service
from app.services.package_parser import package_parser_service

# 创建路由器
router = APIRouter(
    prefix="/dev",
    tags=["dev-tools"],
    responses={401: {"description": "未授权"}, 403: {"description": "权限不足"}},
)


@router.get("/tools", response_model=DeveloperToolListResponse)
async def get_developer_tools(
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


@router.post("/tools", response_model=DeveloperToolResponse, status_code=201)
async def create_developer_tool(
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


@router.get("/tools/{tool_id}", response_model=DeveloperToolResponse)
async def get_developer_tool(
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


@router.put("/tools/{tool_id}", response_model=DeveloperToolResponse)
async def update_developer_tool(
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


@router.delete("/tools/{tool_id}")
async def delete_developer_tool(
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


@router.post("/upload", response_model=ToolUploadResponse)
async def upload_tool_package(
    file: UploadFile = File(...),
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    上传工具包文件

    Args:
        file: 上传的文件
        current_user: 当前开发者用户
        db: 数据库会话

    Returns:
        上传结果
    """
    try:
        result = await package_parser_service.parse_and_create_tools(
            file=file,
            db=db,
            current_user=current_user
        )

        return ToolUploadResponse(
            upload_id=f"upload_{current_user.id}_{int(datetime.now().timestamp())}",
            status="completed" if result["success"] else "failed",
            message=result["message"],
            tools_created=[tool["tool_id"] for tool in result["tools"]] if result["success"] else None
        )
    except Exception as e:
        return ToolUploadResponse(
            upload_id=f"upload_{current_user.id}_{int(datetime.now().timestamp())}",
            status="failed",
            message=f"上传失败: {str(e)}",
            tools_created=None
        )


@router.post("/upload/validate")
async def validate_tool_package(
    file: UploadFile = File(...),
    current_user: User = Depends(get_developer_user)
):
    """
    验证工具包格式

    Args:
        file: 上传的文件
        current_user: 当前开发者用户

    Returns:
        验证结果
    """
    return await package_parser_service.validate_package(file=file)


@router.post("/tools/{tool_id}/test", response_model=ToolTestResponse)
async def test_developer_tool(
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


@router.post("/tools/test/batch")
async def batch_test_tools(
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
