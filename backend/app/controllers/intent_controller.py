from typing import Dict, Any
from loguru import logger
from app.services.intent_service import intent_service
from app.schemas.intent import IntentRequest, IntentResponse

class IntentController:
    """意图控制器"""
    
    async def process_intent(self, request: IntentRequest) -> IntentResponse:
        """
        处理用户意图
        
        Args:
            request: 意图请求
            
        Returns:
            意图响应
        """
        try:
            # 记录请求
            logger.info(f"收到意图处理请求: {request.query}")
            
            # 调用服务层处理意图
            result = await intent_service.process_intent(request.query)
            
            # 构建响应
            response = IntentResponse(
                query=request.query,
                processed=True,
                intent=result["intent"],
                tools=result["tools"],
                session_id=request.session_id,
                error=None
            )
            
            # 记录响应
            logger.info(f"意图处理完成: {response.intent['intent']}")
            
            return response
            
        except Exception as e:
            # 记录错误
            logger.error(f"处理意图失败: {e}")
            
            # 构建错误响应
            return IntentResponse(
                query=request.query,
                processed=False,
                intent={
                    "intent": "unknown",
                    "confidence": 0.0,
                    "entities": [],
                    "query_paraphrase": request.query,
                    "required_tools": [],
                    "analysis": "处理失败"
                },
                tools=[],
                session_id=request.session_id,
                error=str(e)
            )

# 创建全局意图控制器实例
intent_controller = IntentController() 