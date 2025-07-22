from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.db import get_async_db_session
from app.controllers.intent_controller import intent_controller
from app.schemas.intent import (
    IntentRequest,
    InterpretSuccessResponse,
    ConfirmRequest,
    ConfirmResponse,
)
from app.models.user import User
from app.utils.security import get_current_user
from typing import Optional

# 创建路由器
router = APIRouter(
    tags=["intent"],
    responses={404: {"description": "Not found"}},
)


@router.post("/interpret", 
             response_model=InterpretSuccessResponse,
             response_model_exclude_none=False)
# @stable(tested=2025-04-30, test_script=backend/test_api.py)
async def process_intent(
    request: IntentRequest = Body(...), 
    db: AsyncSession = Depends(get_async_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    处理用户意图。根据用户查询，可能返回需要调用的工具列表，或直接返回回复内容。

    Args:
        request: 意图请求
        db: 数据库会话 (由 FastAPI 注入)
        current_user: 当前认证用户 (由JWT令牌提供，可为None)

    Returns:
        意图响应
    """
    # 将用户ID从认证用户中获取，确保安全
    request.user_id = current_user.id
    
    # 调用控制器时传递 request 和 db
    return await intent_controller.process_intent(request=request, db=db)


@router.post("/confirm", 
             response_model=ConfirmResponse,
             response_model_exclude_none=False)
async def confirm_execution(
    request: ConfirmRequest = Body(...),
    db: AsyncSession = Depends(get_async_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    处理用户确认执行请求。当用户确认执行工具调用时，系统将执行相应的工具并返回结果。
    
    Args:
        request: 确认请求
        db: 数据库会话 (由 FastAPI 注入)
        current_user: 当前认证用户 (由JWT令牌提供)
        
    Returns:
        确认执行响应
    """
    # 调用控制器处理确认执行
    return await intent_controller.process_confirmation(request=request, db=db, user_id=current_user.id)
