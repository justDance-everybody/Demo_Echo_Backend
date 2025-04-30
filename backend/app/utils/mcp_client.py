from typing import Dict, List, Any, Optional
import os
import sys
import logging
import json
from dotenv import load_dotenv
from loguru import logger
from app.config import settings

# 添加MCP客户端相关环境变量 (现在使用 LLM_*)
try:
    # 读取后端配置的LLM设置
    llm_api_key = settings.LLM_API_KEY
    llm_model = settings.LLM_MODEL
    llm_api_base = settings.LLM_API_BASE

    # 为 MCP_Client 进程设置环境变量
    # MCP_Client/mcp_client.py 脚本本身依赖 LLM_* 环境变量
    if llm_api_key:
        os.environ["LLM_API_KEY"] = llm_api_key
    if llm_model:
        os.environ["LLM_MODEL"] = llm_model
    if llm_api_base:
        os.environ["LLM_API_BASE"] = llm_api_base
    
    # 设置MCP服务器配置文件路径环境变量 (MCP_Client 需要)
    mcp_client_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "MCP_Client")
    mcp_config_path = settings.MCP_SERVERS_PATH # 使用config中加载的路径
    # 确保路径是绝对的或相对于MCP_Client目录
    if not os.path.isabs(mcp_config_path):
        mcp_config_path = os.path.join(mcp_client_dir, mcp_config_path)
        
    os.environ["MCP_SERVERS_PATH"] = mcp_config_path
    
    logger.info("已设置LLM和MCP环境变量，用于启动MCP客户端进程")
    logger.info(f"MCP服务器配置文件路径: {mcp_config_path}")
except Exception as e:
    logger.warning(f"设置环境变量失败: {e}")

# 添加MCP_Client目录到sys.path
mcp_client_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "MCP_Client")
sys.path.append(mcp_client_path)
logger.debug(f"添加MCP客户端路径: {mcp_client_path}")

# 直接导入MCP客户端模块
try:
    import importlib.util
    # 注意：这里的模块名 "mcp_client" 是指 MCP_Client/mcp_client.py 文件
    spec = importlib.util.spec_from_file_location("mcp_client", os.path.join(mcp_client_path, "mcp_client.py"))
    mcp_client_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mcp_client_module)
    MCPClient = mcp_client_module.MCPClient # 这是MCP_Client/mcp_client.py中的类
    logger.info("成功导入MCP客户端库")
except Exception as e:
    logger.error(f"导入MCP客户端库失败: {e}")
    raise ImportError(f"无法导入MCP客户端: {e}")

class MCPClientWrapper:
    """MCP客户端包装器，管理与真实MCP客户端的交互"""
    
    def __init__(self):
        """初始化真实MCP客户端"""
        self.client = None
        try:
            # 初始化MCP客户端
            # MCPClient 来自 MCP_Client/mcp_client.py
            self.client = MCPClient()
            logger.info("MCP客户端包装器：内部MCPClient实例初始化成功")
            if self.client.server_configs:
                logger.info(f"已加载 {len(self.client.server_configs)} 个MCP服务器配置")
            else:
                 logger.warning("未加载任何MCP服务器配置，请检查MCP_SERVERS_PATH环境变量和配置文件")
            self._connected_server = None
        except Exception as e:
            logger.error(f"MCP客户端初始化失败: {e}")
            raise RuntimeError(f"MCP客户端初始化失败: {e}")
    
    async def _ensure_connected(self, target_server: Optional[str] = None):
        """确保已连接到指定的MCP服务器，如果未指定则连接到默认服务器"""
        server_to_connect = target_server

        # 如果没有指定目标服务器，并且已经连接了，则无需操作
        if not server_to_connect and self.client and self.client.session:
            return

        # 如果没有指定目标服务器，使用默认（第一个）
        if not server_to_connect:
            if not self.client.server_configs:
                raise RuntimeError("MCP客户端没有可用的服务器配置")
            server_to_connect = next(iter(self.client.server_configs))
            logger.debug(f"未指定目标服务器，将使用默认服务器: {server_to_connect}")

        # 检查目标服务器是否存在于配置中
        if server_to_connect not in self.client.server_configs:
             raise ValueError(f"目标MCP服务器 '{server_to_connect}' 未在配置中找到")

        # 检查是否需要切换或建立连接
        # 需要连接的情况：1. 从未连接过 2. 需要连接的目标与当前连接的不同
        should_connect = not self.client.session or self._connected_server != server_to_connect

        if should_connect:
            # 注意：这里的实现假设调用 self.client.connect() 会正确处理
            # 底层 AsyncExitStack 的重入或替换。如果 MCPClient.connect
            # 不能安全地被调用多次，这里可能需要更复杂的连接管理逻辑（例如先关闭再连接）。
            if self.client.session:
                 logger.warning(f"检测到需要切换MCP服务器，从 '{self._connected_server}' 切换到 '{server_to_connect}'. 正在尝试重新连接...")
                 # 理想情况下，这里应该先显式断开旧连接，但 MCPClient 可能没有提供接口
                 # await self.client.disconnect() # 假设有此方法

            logger.info(f"准备连接到MCP服务器: {server_to_connect}")
            try:
                await self.client.connect(server_to_connect)
                self._connected_server = server_to_connect
                logger.info(f"成功连接到MCP服务器: {self._connected_server}")
            except Exception as e:
                 logger.error(f"连接到MCP服务器 '{server_to_connect}' 失败: {e}")
                 # 连接失败后，重置连接状态
                 self._connected_server = None
                 self.client.session = None # 假设可以直接访问或有方法重置
                 raise RuntimeError(f"连接到MCP服务器 '{server_to_connect}' 失败: {e}")
        else:
            logger.debug(f"已连接到目标MCP服务器: {self._connected_server}")

    async def get_tool_info(self, intent_type: str, query: str) -> Dict[str, Any]:
        """
        获取工具信息 (通过MCP客户端代理)
        
        Args:
            intent_type: 意图类型
            query: 用户查询
            
        Returns:
            工具信息
        """
        # 确保已连接 (到默认服务器)
        await self._ensure_connected()
        
        # 构建查询
        enriched_query = f"[{intent_type}] {query}"
        
        # 调用MCP客户端处理查询
        logger.info(f"通过MCP客户端处理查询: {enriched_query}")
        response = await self.client.process_query(enriched_query)
        
        # 构建返回结果
        result = {
            "intent": intent_type,
            "query": query,
            "tools": [tool.name for tool in self.client.tools] if self.client.tools else [],
            "response": response
        }
        
        logger.info(f"MCP客户端返回处理结果，可用工具: {result['tools']}")
        return result
    
    # @stable(tested=2025-04-30, test_script=backend/test_api.py)
    async def execute_tool(self, tool_id: str, params: Dict[str, Any], target_server: Optional[str] = None) -> Dict[str, Any]:
        """
        执行工具 (通过MCP客户端代理)
        
        Args:
            tool_id: 工具ID
            params: 工具参数
            target_server: 可选，指定要连接的MCP服务器名称
            
        Returns:
            执行结果
        """
        # 确保已连接到目标或默认服务器
        await self._ensure_connected(target_server=target_server)

        # 检查连接后，session 是否真的存在
        if not self.client or not self.client.session:
             logger.error(f"无法执行工具 {tool_id}：未能建立到MCP服务器 '{self._connected_server or '默认'}' 的连接。")
             return {
                 "tool_id": tool_id,
                 "success": False,
                 "error": {
                     "code": "MCP_CONNECTION_FAILED",
                     "message": f"未能连接到MCP服务器 '{self._connected_server or '默认'}'"
                 }
             }

        # 直接调用 call_tool
        logger.info(f"准备通过MCP客户端 ('{self._connected_server}') 执行工具: tool={tool_id}, params={params}")
        try:
            # 直接调用 MCPClient 的 session 的 call_tool 方法
            tool_result = await self.client.session.call_tool(tool_id, params)
            # 提取结果内容
            response_content = getattr(tool_result.content, 'text', tool_result.content)
            if isinstance(response_content, (list, dict)):
                 response_content = str(response_content)
                 
            result = {
                "tool_id": tool_id,
                "success": True,
                "result": {
                    "message": response_content
                }
            }
            logger.info(f"MCP客户端执行工具成功: tool={tool_id}")
        except Exception as e:
            logger.error(f"MCP客户端执行工具失败: tool={tool_id}, error={e}")
            result = {
                "tool_id": tool_id,
                "success": False,
                "error": {
                    "code": "MCP_EXECUTION_FAILED",
                    "message": str(e)
                }
            }
        
        return result

# 创建全局MCP客户端实例
mcp_client = MCPClientWrapper() 