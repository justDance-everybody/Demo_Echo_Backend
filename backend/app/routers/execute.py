from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.utils.db import get_async_db_session
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.controllers.execute_controller import execute_controller
from app.models.user import User
from app.utils.security import get_current_user
from app.config import settings

# 创建路由实例
router = APIRouter()

@router.post(
    "/execute",
    response_model=ExecuteResponse,
    response_model_exclude_none=False,
    summary="执行指定工具",
    description="使用给定参数执行指定工具并返回结果。"
)
# @stable(tested=2025-04-30, test_script=backend/test_api.py)
async def execute_tool(
    request: ExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_async_db_session),
    current_user: User = Depends(get_current_user)
) -> ExecuteResponse:
    """
    执行工具的端点。

    Args:
        request: 执行工具请求
        db: 数据库会话
        current_user: 当前认证用户 (必需)
    """
    # 强制使用认证用户的ID，确保安全
    request.user_id = current_user.id

    # 调用控制器处理请求
    response = await execute_controller(request=request, db=db)

    # 根据业务错误返回适当的HTTP状态码
    if not response.success and response.error:
        error_code = response.error.get("code", "") if isinstance(response.error, dict) else ""
        error_message = response.error.get("message", "") if isinstance(response.error, dict) else str(response.error)

        if error_code == "TOOL_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_message or "工具不存在"
            )
        elif error_code in ["INVALID_PARAMS", "VALIDATION_ERROR"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_message or "参数验证失败"
            )
        elif error_code in ["PERMISSION_DENIED", "ACCESS_DENIED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message or "权限不足"
            )
        else:
            # 其他业务错误返回400
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message or "执行失败"
            )

    return response


# 注意：/tools 端点已移至 tools.py 路由中，使用强制认证
# 此处删除重复定义以避免权限绕过问题
