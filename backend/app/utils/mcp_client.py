from typing import Dict, List, Any, Optional
import os
import sys
import logging
import json
import asyncio
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
        # 进程管理：跟踪已启动的MCP进程
        self._managed_processes = {}  # {server_name: {"pid": int, "start_time": float}}
        self._process_lock = asyncio.Lock()
        
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
        """
        获取或创建MCP客户端实例（使用优化的连接池）
        
        Args:
            target_server: 目标MCP服务器名称
            
        Returns:
            MCPClient: MCP客户端实例
            
        Raises:
            ValueError: 当目标服务器不存在于配置中时
            RuntimeError: 当连接失败时
        """
        # 检查目标服务器是否存在于配置中
        if target_server not in self.server_configs:
            raise ValueError(f"目标MCP服务器 '{target_server}' 未在配置中找到")

        # 优化的连接复用逻辑：更严格的连接验证
        if target_server in self._connection_pool:
            client = self._connection_pool[target_server]
            if client and hasattr(client, 'session') and client.session:
                try:
                    # 简单的连接健康检查
                    if hasattr(client.session, '_transport') and client.session._transport:
                        logger.info(f"复用现有MCP客户端连接: {target_server}")
                        return client
                except Exception as health_check_err:
                    logger.warning(f"连接健康检查失败: {health_check_err}")
            
            # 清理无效连接
            logger.info(f"清理无效连接: {target_server}")
            try:
                if client and hasattr(client, 'close'):
                    await client.close()
            except:
                pass
            del self._connection_pool[target_server]
            
            # 同时清理进程管理记录（如果连接失败，进程可能也有问题）
            async with self._process_lock:
                if target_server in self._managed_processes:
                    managed_info = self._managed_processes[target_server]
                    logger.warning(f"连接失败，清理进程管理记录 (PID: {managed_info['pid']}): {target_server}")
                    del self._managed_processes[target_server]

        logger.info(f"为服务器 {target_server} 创建新的MCP客户端连接")
        
        # 优化的进程检查逻辑：支持多种MCP服务器类型
        server_config = self.server_configs.get(target_server)
        if not server_config:
            raise ValueError(f"未找到服务器配置: {target_server}")
        
        # 使用进程管理器检查和启动进程
        async with self._process_lock:
            process_pid = await self._ensure_mcp_process(target_server, server_config)
        
        # 创建客户端连接
        try:
            client = MCPClient()
            await client.connect(target_server)
            
            # 将连接加入连接池
            self._connection_pool[target_server] = client
            logger.info(f"成功连接到MCP服务器并加入连接池: {target_server}")
            return client
            
        except Exception as e:
            logger.error(f"连接到MCP服务器 '{target_server}' 失败: {e}")
            raise RuntimeError(f"连接到MCP服务器 '{target_server}' 失败: {e}")
    
    async def _find_existing_process(self, target_server: str, server_config: dict) -> Optional[int]:
        """
        查找现有的MCP进程
        
        Args:
            target_server: 服务器名称
            server_config: 服务器配置
            
        Returns:
            Optional[int]: 进程PID，如果没有找到则返回None
        """
        try:
            import psutil
            
            cmd = server_config["command"]
            args = server_config.get("args", [])
            
            # 构建进程匹配模式
            search_patterns = []
            
            # 根据不同的服务器类型构建搜索模式
            if target_server == "minimax-mcp-js":
                search_patterns = ["minimax-mcp-js", "minimax"]
            elif target_server == "amap-maps":
                search_patterns = ["amap-maps-mcp-server", "amap"]
            elif target_server == "playwright":
                search_patterns = ["playwright", "@playwright/mcp"]
            elif target_server == "web3-rpc":
                search_patterns = ["web3-mcp", "web3"]
            else:
                # 通用模式：使用命令和参数
                search_patterns = [target_server, cmd] + args
            
            for proc in psutil.process_iter(['pid', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    
                    # 检查是否匹配任何搜索模式
                    for pattern in search_patterns:
                        if pattern and pattern in cmdline:
                            logger.debug(f"找到匹配进程: PID={proc.info['pid']}, cmdline={cmdline}")
                            return proc.info['pid']
                            
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                    
        except Exception as e:
            logger.warning(f"检查现有进程时出错: {e}")
            
        return None
    
    async def _ensure_mcp_process(self, target_server: str, server_config: dict) -> int:
        """
        确保MCP进程运行（统一的进程管理入口）
        
        Args:
            target_server: 服务器名称
            server_config: 服务器配置
            
        Returns:
            int: 运行中的进程PID
        """
        import time
        
        # 1. 检查我们管理的进程是否还在运行
        if target_server in self._managed_processes:
            managed_info = self._managed_processes[target_server]
            pid = managed_info["pid"]
            
            try:
                import psutil
                if psutil.pid_exists(pid):
                    proc = psutil.Process(pid)
                    if proc.is_running():
                        logger.info(f"复用已管理的MCP进程 (PID: {pid}): {target_server}")
                        return pid
                    else:
                        logger.warning(f"已管理的进程不再运行，清理记录: {target_server}")
                        del self._managed_processes[target_server]
                else:
                    logger.warning(f"已管理的进程PID不存在，清理记录: {target_server}")
                    del self._managed_processes[target_server]
            except Exception as e:
                logger.warning(f"检查已管理进程时出错: {e}，清理记录")
                del self._managed_processes[target_server]
        
        # 2. 查找系统中现有的进程
        existing_pid = await self._find_existing_process(target_server, server_config)
        if existing_pid:
            # 将现有进程纳入管理
            self._managed_processes[target_server] = {
                "pid": existing_pid,
                "start_time": time.time()
            }
            logger.info(f"发现并纳入管理现有MCP进程 (PID: {existing_pid}): {target_server}")
            return existing_pid
        
        # 3. 启动新进程
        new_pid = await self._start_mcp_process(target_server, server_config)
        self._managed_processes[target_server] = {
            "pid": new_pid,
            "start_time": time.time()
        }
        logger.info(f"启动并管理新的MCP进程 (PID: {new_pid}): {target_server}")
        return new_pid
    
    async def cleanup_dead_processes(self):
        """
        清理已死亡的进程记录（定期维护方法）
        """
        async with self._process_lock:
            dead_servers = []
            
            for server_name, managed_info in self._managed_processes.items():
                pid = managed_info["pid"]
                try:
                    import psutil
                    if not psutil.pid_exists(pid) or not psutil.Process(pid).is_running():
                        dead_servers.append(server_name)
                        logger.info(f"发现死亡进程，准备清理: {server_name} (PID: {pid})")
                except Exception as e:
                    dead_servers.append(server_name)
                    logger.warning(f"检查进程状态时出错，准备清理: {server_name} (PID: {pid}), 错误: {e}")
            
            # 清理死亡进程的记录
            for server_name in dead_servers:
                del self._managed_processes[server_name]
                # 同时清理对应的连接池
                if server_name in self._connection_pool:
                    del self._connection_pool[server_name]
                    logger.info(f"同时清理连接池: {server_name}")
            
            if dead_servers:
                logger.info(f"已清理 {len(dead_servers)} 个死亡进程记录: {dead_servers}")
    
    def get_managed_processes_info(self) -> dict:
        """
        获取当前管理的进程信息（用于调试和监控）
        
        Returns:
            dict: 进程信息字典
        """
        import time
        result = {}
        
        for server_name, managed_info in self._managed_processes.items():
            pid = managed_info["pid"]
            start_time = managed_info["start_time"]
            uptime = time.time() - start_time
            
            try:
                import psutil
                is_running = psutil.pid_exists(pid) and psutil.Process(pid).is_running()
            except:
                is_running = False
            
            result[server_name] = {
                "pid": pid,
                "start_time": start_time,
                "uptime_seconds": uptime,
                "is_running": is_running
            }
        
        return result
    
    async def _start_mcp_process(self, target_server: str, server_config: dict) -> int:
        """
        启动新的MCP服务器进程
        
        Args:
            target_server: 服务器名称
            server_config: 服务器配置
            
        Returns:
            int: 新进程的PID
            
        Raises:
            RuntimeError: 当进程启动失败时
        """
        import subprocess
        import time
        
        cmd = server_config["command"]
        args = server_config.get("args", [])
        env_vars = server_config.get("env", {})
        
        # 准备环境变量
        process_env = os.environ.copy()
        process_env.update(env_vars)
        
        logger.info(f"启动MCP服务器进程: {cmd} {' '.join(args)}")
        
        try:
            # 启动进程
            process = subprocess.Popen(
                [cmd] + args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                env=process_env,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None  # 创建新的进程组
            )
            
            # 等待进程启动
            time.sleep(3)  # 给进程更多启动时间
            
            if process.poll() is None:  # 进程仍在运行
                logger.info(f"成功启动MCP服务器进程 (PID: {process.pid}): {target_server}")
                return process.pid
            else:
                # 进程已退出，读取错误信息
                stdout, stderr = process.communicate()
                error_msg = stderr.decode('utf-8') if stderr else stdout.decode('utf-8')
                logger.error(f"MCP服务器进程启动失败，退出码: {process.returncode}")
                logger.error(f"错误输出: {error_msg}")
                raise RuntimeError(f"MCP服务器进程启动失败: {error_msg}")
                
        except Exception as e:
            logger.error(f"启动MCP服务器进程失败: {e}")
            raise RuntimeError(f"启动MCP服务器进程失败: {e}")

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
            
            # 优化的错误处理：只在特定错误类型时清理连接
            error_str = str(e).lower()
            should_cleanup_connection = any([
                "connection" in error_str,
                "transport" in error_str,
                "broken pipe" in error_str,
                "connection reset" in error_str,
                "session closed" in error_str
            ])
            
            if should_cleanup_connection and target_server in self._connection_pool:
                try:
                    await self._connection_pool[target_server].close()
                except:
                    pass
                del self._connection_pool[target_server]
                logger.info(f"由于连接错误，已从连接池中移除连接: {target_server}")
                
                # 同时清理进程管理记录
                async with self._process_lock:
                    if target_server in self._managed_processes:
                        managed_info = self._managed_processes[target_server]
                        logger.warning(f"工具执行失败，清理进程管理记录 (PID: {managed_info['pid']}): {target_server}")
                        del self._managed_processes[target_server]
            else:
                logger.debug(f"保留连接池中的连接，错误可能是临时的: {target_server}")
            
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