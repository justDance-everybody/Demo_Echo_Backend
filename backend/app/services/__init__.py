# 初始化服务包
from app.services.intent_service import intent_service
from app.services.tool_service import tool_service

# 导出服务实例
__all__ = ['intent_service', 'tool_service'] 