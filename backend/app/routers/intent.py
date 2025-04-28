from typing import Dict, Any
from fastapi import APIRouter, Body, HTTPException, Depends
from loguru import logger
from app.controllers.intent_controller import intent_controller
from app.schemas.intent import IntentRequest, IntentResponse

# 创建路由器
router = APIRouter(
    prefix="/intent",
    tags=["intent"],
    responses={404: {"description": "Not found"}},
)

@router.post("/process", response_model=IntentResponse)
async def process_intent(request: IntentRequest = Body(...)):
    """
    处理用户意图
    
    Args:
        request: 意图请求
        
    Returns:
        意图响应
    """
    try:
        # 调用控制器处理意图
        return await intent_controller.process_intent(request)
    except Exception as e:
        # 记录错误
        logger.error(f"处理意图失败: {e}")
        # 抛出HTTP异常
        raise HTTPException(
            status_code=500,
            detail=f"处理意图失败: {str(e)}"
        ) 