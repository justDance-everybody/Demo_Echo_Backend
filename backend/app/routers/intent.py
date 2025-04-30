from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.db import get_async_db_session
from app.controllers.intent_controller import intent_controller
from app.schemas.intent import (
    IntentRequest,
    InterpretSuccessResponse,
)

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
    request: IntentRequest = Body(...), db: AsyncSession = Depends(get_async_db_session)
):
    """
    处理用户意图。根据用户查询，可能返回需要调用的工具列表，或直接返回回复内容。

    Args:
        request: 意图请求
        db: 数据库会话 (由 FastAPI 注入)

    Returns:
        意图响应
    """
    # 调用控制器时传递 request 和 db
    return await intent_controller.process_intent(request=request, db=db)
