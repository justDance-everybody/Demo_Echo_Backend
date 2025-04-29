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
                response_model_exclude_none=False,
                summary="Process user intent", 
                description="Receives user query and context, processes the intent using LLM, and returns either a direct response or required tool calls."
                )
async def process_intent(
    request: IntentRequest,
    db: AsyncSession = Depends(get_async_db_session)
): # -> InterpretSuccessResponse: #  类型提示可以保留，但 FastAPI 不会强制使用它序列化
    """
    Endpoint to process user intent.
    """
    # 注意：这里直接调用 process_intent 方法
    return await intent_controller.process_intent(request, db)
