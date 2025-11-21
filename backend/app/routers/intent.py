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
    prefix="/intent",
    tags=["intent"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/interpret",
    response_model=InterpretSuccessResponse,
    response_model_exclude_none=False,
    summary="意图解析",
    description="解析用户输入并给出下一步动作（直接回复或工具调用）。鉴权：需要 JWT。注意：请求体中的 user_id 将被服务端覆盖为当前登录用户。\n\n示例 cURL：\ncurl -X POST https://localhost:3000/api/v1/intent/interpret \\\n  -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' \\\n  -d '{\"query\":\"查天气\",\"session_id\":\"s1\",\"user_id\":1}'\n\n错误示例：\n- 401 未授权",
)
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


@router.post(
    "/confirm",
    response_model=ConfirmResponse,
    response_model_exclude_none=False,
    summary="确认执行与播报",
    description="当需要用户确认时，提交确认以执行对应工具并返回用于语音播报的纯正文。鉴权：需要 JWT。\n\n请求体：\n- session_id: string（必填）\n- user_input: string（如\"确认执行\"或\"取消\"）\n\n响应模型（固定）：\n- session_id: string\n- success: boolean\n- content: string|null（成功时用于播报的纯正文，不含说明性前缀/道歉/技术细节；多工具用换行；区块链地址将统一缩写，如 0x123456…5678）\n- error: string|null（失败或超时原因的简述）\n\n前端播报：\n- 成功：仅播报 content；为空则使用通用文案\"操作执行成功\"。\n- 失败/超时：仅播报 error 的简述版本。\n\n示例 cURL：\ncurl -X POST https://localhost:3000/api/v1/intent/confirm \\\n  -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' \\\n  -d '{\"session_id\":\"s1\",\"user_input\":\"确认执行\"}'\n\n示例响应：\n- 未确认/拒绝：{\"session_id\":\"s1\",\"success\":true,\"content\":\"请重新告诉我您需要什么帮助\",\"error\":null}\n- 成功（多工具）：{\"session_id\":\"s1\",\"success\":true,\"content\":\"天气晴，22℃\\n\\n账户余额 123.45 USDT (地址 0x123456…5678)\",\"error\":null}\n- 失败：{\"session_id\":\"s1\",\"success\":false,\"content\":null,\"error\":\"执行过程中出现错误: …\"}\n- 超时：{\"session_id\":\"s1\",\"success\":false,\"content\":null,\"error\":\"确认执行超时 (180秒)\"}",
)
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
