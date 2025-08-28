from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from pydantic import BaseModel
from app.utils.mcp_client import mcp_client
from app.utils.security import get_current_user
from app.models.user import User
import asyncio
import time
from loguru import logger

router = APIRouter(prefix="/api/v1/debug", tags=["调试"])

class MCPTestRequest(BaseModel):
    server_name: str = "amap-maps"

@router.post("/test-mcp-direct")
async def test_mcp_direct(
    request: MCPTestRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    直接测试MCP连接（在后端uvicorn异步环境中）
    """
    if current_user.role != 'developer':
        raise HTTPException(status_code=403, detail="需要开发者权限")
    
    start_time = time.time()
    
    try:
        logger.info(f"🔧 在后端uvicorn环境中测试MCP连接: {request.server_name}")
        
        # 直接调用MCP客户端连接
        client = await mcp_client._get_or_create_client(request.server_name)
        
        if not client:
            return {
                "success": False,
                "error": "无法创建MCP客户端",
                "duration": time.time() - start_time
            }
        
        # 测试工具调用
        test_result = await client.session.call_tool('maps_weather', {'city': '深圳'})
        
        connection_time = time.time() - start_time
        
        return {
            "success": True,
            "connection_time": connection_time,
            "test_result": str(test_result)[:200] + "..." if len(str(test_result)) > 200 else str(test_result),
            "message": f"成功在后端环境中连接并调用工具，耗时: {connection_time:.2f}秒"
        }
        
    except Exception as e:
        connection_time = time.time() - start_time
        logger.error(f"后端MCP测试失败: {e}")
        
        return {
            "success": False,
            "error": str(e),
            "duration": connection_time,
            "message": f"后端环境MCP测试失败，耗时: {connection_time:.2f}秒"
        }
