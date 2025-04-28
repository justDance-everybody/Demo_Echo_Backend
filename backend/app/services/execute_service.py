from typing import Dict, Any, Optional
from loguru import logger
from app.utils.mcp_client import mcp_client
from app.schemas.execute import ExecuteResponse, ExecuteResult
# 可以在这里导入 Session, Log 模型用于数据库操作
# from app.models.session import Session
# from app.models.log import Log
# from app.utils.db import db_session

class ExecuteService:
    """处理工具执行请求的服务"""
    
    async def execute_tool(
        self,
        tool_id: str,
        params: Dict[str, Any],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> ExecuteResponse:
        """
        执行指定的工具

        Args:
            tool_id: 工具ID
            params: 工具参数
            session_id: 会话ID (可选)
            user_id: 用户ID (可选)

        Returns:
            执行结果响应
        """
        logger.info(f"服务层：开始执行工具: tool_id={tool_id}, session_id={session_id}")
        
        # 可以在这里添加数据库日志记录：记录执行尝试
        # if session_id:
        #     Log.create(session_id=session_id, step='execute_start', status='processing', message=f"Executing tool: {tool_id}")
        #     session = Session.get(session_id)
        #     if session: session.status = 'executing'
        #     db_session.commit()
        
        try:
            # 调用MCP客户端包装器的execute_tool方法
            mcp_result = await mcp_client.execute_tool(tool_id=tool_id, params=params)
            
            # 检查MCP客户端返回的结果结构
            if mcp_result.get("success"):
                # 成功执行
                success_result = ExecuteResult(
                    message=mcp_result.get("result", {}).get("message")
                )
                response = ExecuteResponse(
                    tool_id=tool_id,
                    success=True,
                    result=success_result,
                    session_id=session_id
                )
                logger.info(f"服务层：工具执行成功: tool_id={tool_id}")
                # 可以在这里添加数据库日志记录：记录执行成功
                # if session_id:
                #     Log.create(session_id=session_id, step='execute_end', status='success', message=success_result.message)
                #     if session: session.status = 'done' # 或根据业务逻辑设置状态
                #     db_session.commit()
            else:
                # 执行失败 (由MCP客户端包装器返回失败信息)
                error_info = mcp_result.get("error", {"code": "UNKNOWN_MCP_ERROR", "message": "MCP客户端返回执行失败"})
                response = ExecuteResponse(
                    tool_id=tool_id,
                    success=False,
                    error=error_info,
                    session_id=session_id
                )
                logger.warning(f"服务层：工具执行失败 (MCP client error): tool_id={tool_id}, error={error_info}")
                # 可以在这里添加数据库日志记录：记录执行失败
                # if session_id:
                #     Log.create(session_id=session_id, step='execute_end', status='error', message=error_info.get('message'))
                #     if session: session.status = 'error'
                #     db_session.commit()
                
        except Exception as e:
            # 处理调用过程中的意外异常
            logger.error(f"服务层：执行工具时发生意外错误: tool_id={tool_id}, error={e}", exc_info=True)
            error_info = {
                "code": "EXECUTION_EXCEPTION",
                "message": f"执行工具时发生内部错误: {str(e)}"
            }
            response = ExecuteResponse(
                tool_id=tool_id,
                success=False,
                error=error_info,
                session_id=session_id
            )
            # 可以在这里添加数据库日志记录：记录系统异常
            # if session_id:
            #     Log.create(session_id=session_id, step='execute_end', status='error', message=f"System Error: {str(e)}")
            #     if session: session.status = 'error'
            #     db_session.commit()
            
        return response

# 创建服务实例 (如果不需要状态，可以直接使用类方法，或在Controller中实例化)
execute_service = ExecuteService() 