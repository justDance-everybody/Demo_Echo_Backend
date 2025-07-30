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
        """初始化MCP客户端配置"""
        self.server_configs = {}
        # 连接池：缓存已连接的客户端实例
        self._connection_pool = {}
        self._connection_lock = {}
        
        try:
            # 加载MCP服务器配置
            import json
            mcp_config_path = os.environ.get("MCP_SERVERS_PATH", "config/mcp_servers.json")
            if not os.path.isabs(mcp_config_path):
                mcp_client_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "MCP_Client")
                mcp_config_path = os.path.join(mcp_client_dir, mcp_config_path)
            
            if not os.path.exists(mcp_config_path):
                logger.warning(f"MCP服务器配置文件不存在: {mcp_config_path}")
                self.server_configs = {}
            else:
                with open(mcp_config_path, encoding='utf-8') as f:
                    config_data = json.load(f)
                    self.server_configs = config_data.get("mcpServers", {})
            
            logger.info("MCP客户端包装器：配置加载成功")
            if self.server_configs:
                logger.info(f"已加载 {len(self.server_configs)} 个MCP服务器配置")
            else:
                logger.warning("未加载任何MCP服务器配置，请检查MCP_SERVERS_PATH环境变量和配置文件")
        except Exception as e:
            logger.error(f"MCP客户端配置加载失败: {e}")
            self.server_configs = {}
            self._connection_pool = {}
            self._connection_lock = {}
    
    async def _get_or_create_client(self, target_server: str) -> 'MCPClient':
        """获取或创建MCP客户端实例（使用连接池）"""
        # 检查目标服务器是否存在于配置中
        if target_server not in self.server_configs:
            raise ValueError(f"目标MCP服务器 '{target_server}' 未在配置中找到")

        # 检查连接池中是否已有可用连接
        if target_server in self._connection_pool:
            client = self._connection_pool[target_server]
            # 检查连接是否仍然有效
            try:
                if client and client.session:
                    logger.debug(f"复用现有MCP客户端连接: {target_server}")
                    return client
            except Exception as e:
                logger.warning(f"现有连接无效，将重新创建: {e}")
                # 清理无效连接
                try:
                    await client.close()
                except:
                    pass
                del self._connection_pool[target_server]

        logger.info(f"创建新的MCP客户端实例并连接到服务器: {target_server}")
        try:
            # 创建新的客户端实例
            client = MCPClient()
            await client.connect(target_server)
            # 将连接加入连接池
            self._connection_pool[target_server] = client
            logger.info(f"成功连接到MCP服务器并加入连接池: {target_server}")
            return client
        except Exception as e:
            logger.error(f"连接到MCP服务器 '{target_server}' 失败: {e}")
            raise RuntimeError(f"连接到MCP服务器 '{target_server}' 失败: {e}")

    async def get_tool_info(self, intent_type: str, query: str) -> Dict[str, Any]:
        """
        获取工具信息 (通过MCP客户端代理)
        
        Args:
            intent_type: 意图类型
            query: 用户查询
            
        Returns:
            Dict[str, Any]: 工具信息
        """
        # 获取所有可用的工具信息
        all_tools = []
        
        for server_name in self.server_configs.keys():
            try:
                client = await self._get_or_create_client(server_name)
                if client and client.tools:
                    for tool in client.tools:
                        tool_info = {
                            "server_name": server_name,
                            "tool_id": tool.name,
                            "name": tool.name,
                            "description": tool.description,
                            "input_schema": tool.inputSchema if hasattr(tool, 'inputSchema') else {}
                        }
                        all_tools.append(tool_info)
            except Exception as e:
                logger.warning(f"获取服务器 {server_name} 的工具信息失败: {e}")
        
        return {
            "intent_type": intent_type,
            "query": query,
            "available_tools": all_tools,
            "message": f"找到 {len(all_tools)} 个可用工具"
        }
    
    async def get_server_tools(self, server_name: str) -> Dict[str, Any]:
        """
        获取指定 MCP 服务器的所有工具信息
        
        Args:
            server_name: MCP 服务器名称
            
        Returns:
            包含工具信息的字典，格式为:
            {
                "success": bool,
                "tools": [{
                    "name": str,
                    "description": str,
                    "inputSchema": dict
                }],
                "error": str (如果失败)
            }
        """
        try:
            # 检查服务器是否存在
            if server_name not in self.server_configs:
                return {
                    "success": False,
                    "error": f"服务器 {server_name} 不存在于配置中"
                }
            
            # 获取或创建客户端连接
            client = await self._get_or_create_client(server_name)
            if not client:
                return {
                    "success": False,
                    "error": f"无法连接到服务器 {server_name}"
                }
            
            # 获取工具列表
            if not hasattr(client, 'tools') or not client.tools:
                return {
                    "success": True,
                    "tools": [],
                    "message": f"服务器 {server_name} 没有可用工具"
                }
            
            # 格式化工具信息
            tools_list = []
            for tool in client.tools:
                tools_list.append({
                    "name": tool.name,
                    "description": tool.description or "",
                    "inputSchema": tool.inputSchema or {}
                })
            
            return {
                "success": True,
                "tools": tools_list,
                "message": f"成功获取服务器 {server_name} 的 {len(tools_list)} 个工具"
            }
            
        except Exception as e:
            logger.error(f"获取服务器 {server_name} 工具信息时发生错误: {e}")
            return {
                "success": False,
                "error": f"获取工具信息失败: {str(e)}"
            }
    
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
        # 确定目标服务器
        if not target_server:
            if not self.server_configs:
                return {
                    "tool_id": tool_id,
                    "success": False,
                    "error": {
                        "code": "MCP_NO_SERVERS_CONFIGURED",
                        "message": "没有可用的MCP服务器配置"
                    }
                }
            target_server = next(iter(self.server_configs))
            logger.debug(f"未指定目标服务器，将使用默认服务器: {target_server}")

        # 使用连接池获取或创建客户端实例
        try:
            client = await self._get_or_create_client(target_server)
            
            # 检查连接后，session 是否真的存在
            if not client or not client.session:
                logger.error(f"无法执行工具 {tool_id}：未能建立到MCP服务器 '{target_server}' 的连接。")
                return {
                    "tool_id": tool_id,
                    "success": False,
                    "error": {
                        "code": "MCP_CONNECTION_FAILED",
                        "message": f"未能连接到MCP服务器 '{target_server}'"
                    }
                }

            # 直接调用 call_tool
            logger.info(f"准备通过MCP客户端 ('{target_server}') 执行工具: tool={tool_id}, params={params}")
            
            # 直接调用 MCPClient 的 session 的 call_tool 方法，添加120秒超时
            import asyncio
            tool_result = await asyncio.wait_for(
                client.session.call_tool(tool_id, params), 
                timeout=120.0
            )
            
            # 提取结果内容
            if hasattr(tool_result, 'content'):
                if hasattr(tool_result.content, 'text'):
                    response_content = tool_result.content.text
                elif isinstance(tool_result.content, list) and len(tool_result.content) > 0:
                    # 处理内容列表
                    content_parts = []
                    for item in tool_result.content:
                        if hasattr(item, 'text'):
                            content_parts.append(item.text)
                        else:
                            content_parts.append(str(item))
                    response_content = '\n'.join(content_parts)
                else:
                    response_content = str(tool_result.content)
            else:
                response_content = str(tool_result)
                 
            result = {
                "tool_id": tool_id,
                "success": True,
                "result": {
                    "message": response_content
                }
            }
            logger.info(f"MCP客户端执行工具成功: tool={tool_id}")
            
        except asyncio.TimeoutError:
            logger.error(f"MCP客户端执行工具超时: tool={tool_id} (120秒)")
            result = {
                "tool_id": tool_id,
                "success": False,
                "error": {
                    "code": "MCP_EXECUTION_TIMEOUT",
                    "message": f"工具 {tool_id} 执行超时 (120秒)，请稍后重试"
                }
            }
        except Exception as e:
            logger.error(f"MCP客户端执行工具失败: tool={tool_id}, error={e}")
            # 如果执行失败，可能是连接问题，清理连接池中的该连接
            if target_server in self._connection_pool:
                try:
                    await self._connection_pool[target_server].close()
                except:
                    pass
                del self._connection_pool[target_server]
                logger.info(f"已从连接池中移除失效连接: {target_server}")
            
            result = {
                "tool_id": tool_id,
                "success": False,
                "error": {
                    "code": "MCP_EXECUTION_FAILED",
                    "message": str(e)
                }
            }
        
        return result
        
    def check_server_exists(self, server_name: str) -> bool:
        """
        检查指定的服务器名称是否存在于配置中
        
        Args:
            server_name: 服务器名称
            
        Returns:
            bool: 服务器是否存在
        """
        return server_name in self.server_configs
    
    async def close_all_connections(self):
        """关闭所有连接池中的连接"""
        for server_name, client in self._connection_pool.items():
            try:
                await client.close()
                logger.info(f"已关闭MCP服务器连接: {server_name}")
            except Exception as e:
                logger.warning(f"关闭MCP服务器连接时出错 {server_name}: {e}")
        self._connection_pool.clear()

# 创建全局MCP客户端实例
mcp_client = MCPClientWrapper()