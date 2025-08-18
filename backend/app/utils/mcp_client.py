from typing import Dict, List, Any, Optional
import os
import sys
import logging
import json
import asyncio
import random
import subprocess
import time
from enum import Enum
from dotenv import load_dotenv
from loguru import logger
from app.config import settings


class MCPErrorType(Enum):
    """MCP错误类型枚举 - 提供精确的错误分类"""

    # 连接相关错误
    CONNECTION_FAILED = "CONNECTION_FAILED"
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT"
    CONNECTION_LOST = "CONNECTION_LOST"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"

    # 服务器相关错误
    SERVER_NOT_FOUND = "SERVER_NOT_FOUND"
    SERVER_START_FAILED = "SERVER_START_FAILED"
    SERVER_UNAVAILABLE = "SERVER_UNAVAILABLE"
    SERVER_CRASHED = "SERVER_CRASHED"

    # 工具执行错误
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
    TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED"
    TOOL_EXECUTION_TIMEOUT = "TOOL_EXECUTION_TIMEOUT"
    TOOL_INVALID_PARAMS = "TOOL_INVALID_PARAMS"

    # 配置相关错误
    CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND"
    CONFIG_INVALID = "CONFIG_INVALID"
    CONFIG_MISSING_REQUIRED = "CONFIG_MISSING_REQUIRED"

    # 进程相关错误
    PROCESS_START_FAILED = "PROCESS_START_FAILED"
    PROCESS_CRASHED = "PROCESS_CRASHED"
    PROCESS_ZOMBIE = "PROCESS_ZOMBIE"
    PROCESS_PERMISSION_DENIED = "PROCESS_PERMISSION_DENIED"

    # 通用错误
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"


class MCPErrorClassifier:
    """MCP错误分类器 - 根据错误信息自动分类错误类型"""

    @staticmethod
    def classify_error(error_message: str, exception_type: type = None) -> MCPErrorType:
        """
        根据错误信息和异常类型自动分类错误

        Args:
            error_message: 错误信息
            exception_type: 异常类型

        Returns:
            MCPErrorType: 分类后的错误类型
        """
        if not error_message:
            return MCPErrorType.UNKNOWN_ERROR

        error_lower = error_message.lower()

        # 连接相关错误
        if any(keyword in error_lower for keyword in [
            "connection refused", "connection reset", "connection aborted",
            "broken pipe", "transport", "session closed"
        ]):
            if "refused" in error_lower:
                return MCPErrorType.CONNECTION_REFUSED
            elif "timeout" in error_lower:
                return MCPErrorType.CONNECTION_TIMEOUT
            else:
                return MCPErrorType.CONNECTION_LOST

        # 超时错误
        if exception_type == asyncio.TimeoutError or "timeout" in error_lower:
            if "tool" in error_lower or "execution" in error_lower:
                return MCPErrorType.TOOL_EXECUTION_TIMEOUT
            else:
                return MCPErrorType.CONNECTION_TIMEOUT

        # 服务器相关错误
        if any(keyword in error_lower for keyword in [
            "server not found", "no such server", "unknown server"
        ]):
            return MCPErrorType.SERVER_NOT_FOUND

        if any(keyword in error_lower for keyword in [
            "server start failed", "failed to start", "startup failed"
        ]):
            return MCPErrorType.SERVER_START_FAILED

        if any(keyword in error_lower for keyword in [
            "server crashed", "process died", "process terminated"
        ]):
            return MCPErrorType.SERVER_CRASHED

        # 工具相关错误
        if any(keyword in error_lower for keyword in [
            "tool not found", "unknown tool", "no such tool"
        ]):
            return MCPErrorType.TOOL_NOT_FOUND

        if any(keyword in error_lower for keyword in [
            "invalid argument", "invalid parameter", "missing required"
        ]):
            return MCPErrorType.TOOL_INVALID_PARAMS

        # 配置相关错误
        if any(keyword in error_lower for keyword in [
            "config not found", "configuration missing", "no config"
        ]):
            return MCPErrorType.CONFIG_NOT_FOUND

        if any(keyword in error_lower for keyword in [
            "invalid config", "malformed config", "config error"
        ]):
            return MCPErrorType.CONFIG_INVALID

        # 进程相关错误
        if any(keyword in error_lower for keyword in [
            "permission denied", "access denied", "forbidden"
        ]):
            return MCPErrorType.PROCESS_PERMISSION_DENIED

        if any(keyword in error_lower for keyword in [
            "process start failed", "failed to launch", "cannot start"
        ]):
            return MCPErrorType.PROCESS_START_FAILED

        # 资源相关错误
        if any(keyword in error_lower for keyword in [
            "out of memory", "resource exhausted", "too many"
        ]):
            return MCPErrorType.RESOURCE_EXHAUSTED

        # 默认分类
        if "tool" in error_lower:
            return MCPErrorType.TOOL_EXECUTION_FAILED
        elif "server" in error_lower:
            return MCPErrorType.SERVER_UNAVAILABLE
        else:
            return MCPErrorType.UNKNOWN_ERROR

    @staticmethod
    def get_user_friendly_message(error_type: MCPErrorType, original_message: str = "") -> str:
        """
        获取用户友好的错误信息

        Args:
            error_type: 错误类型
            original_message: 原始错误信息

        Returns:
            str: 用户友好的错误信息
        """
        messages = {
            MCPErrorType.CONNECTION_FAILED: "无法连接到MCP服务器，请检查服务器状态",
            MCPErrorType.CONNECTION_TIMEOUT: "连接MCP服务器超时，请稍后重试",
            MCPErrorType.CONNECTION_LOST: "与MCP服务器的连接已断开",
            MCPErrorType.CONNECTION_REFUSED: "MCP服务器拒绝连接，请检查服务器配置",

            MCPErrorType.SERVER_NOT_FOUND: "指定的MCP服务器不存在",
            MCPErrorType.SERVER_START_FAILED: "MCP服务器启动失败，请检查配置",
            MCPErrorType.SERVER_UNAVAILABLE: "MCP服务器当前不可用",
            MCPErrorType.SERVER_CRASHED: "MCP服务器已崩溃，正在尝试重启",

            MCPErrorType.TOOL_NOT_FOUND: "指定的工具不存在",
            MCPErrorType.TOOL_EXECUTION_FAILED: "工具执行失败",
            MCPErrorType.TOOL_EXECUTION_TIMEOUT: "工具执行超时，请稍后重试",
            MCPErrorType.TOOL_INVALID_PARAMS: "工具参数无效，请检查输入",

            MCPErrorType.CONFIG_NOT_FOUND: "MCP配置文件不存在",
            MCPErrorType.CONFIG_INVALID: "MCP配置文件格式错误",
            MCPErrorType.CONFIG_MISSING_REQUIRED: "MCP配置缺少必需参数",

            MCPErrorType.PROCESS_START_FAILED: "进程启动失败",
            MCPErrorType.PROCESS_CRASHED: "进程已崩溃",
            MCPErrorType.PROCESS_ZOMBIE: "检测到僵尸进程",
            MCPErrorType.PROCESS_PERMISSION_DENIED: "权限不足，无法启动进程",

            MCPErrorType.UNKNOWN_ERROR: "发生未知错误",
            MCPErrorType.INTERNAL_ERROR: "系统内部错误",
            MCPErrorType.VALIDATION_ERROR: "数据验证失败",
            MCPErrorType.RESOURCE_EXHAUSTED: "系统资源不足",
        }

        base_message = messages.get(error_type, "发生未知错误")
        if original_message and len(original_message) < 200:  # 只在原始消息不太长时附加
            return f"{base_message}: {original_message}"
        return base_message

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
        """初始化MCP客户端管理器"""
        self.server_configs = {}
        self._connection_pool = {}
        self._process_lock = asyncio.Lock()
        self._managed_processes = {}

        # 加载服务器配置
        self._load_server_configs()

        # 初始化时清理可能存在的重复进程
        self._cleanup_existing_processes()

        logger.info(f"MCP客户端管理器初始化完成，配置了 {len(self.server_configs)} 个服务器")

    def _load_server_configs(self):
        """加载MCP服务器配置"""
        try:
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

    def _cleanup_existing_processes(self):
        """清理可能存在的重复MCP进程"""
        try:
            import psutil

            # 清理已知的重复进程
            for server_name, managed_info in list(self._managed_processes.items()):
                pid = managed_info["pid"]
                try:
                    process = psutil.Process(pid)
                    if process.is_running():
                        logger.warning(f"发现重复MCP进程，尝试清理: {server_name} (PID: {pid})")
                        # 尝试优雅关闭
                        if hasattr(process, 'terminate'):
                            process.terminate()
                        if hasattr(process, 'wait'):
                            process.wait(timeout=5) # 等待5秒
                        logger.info(f"重复MCP进程 {server_name} (PID: {pid}) 已清理")
                        del self._managed_processes[server_name]
                        # 同时清理对应的连接池
                        if server_name in self._connection_pool:
                            del self._connection_pool[server_name]
                            logger.info(f"同时清理连接池: {server_name}")
                    else:
                        logger.debug(f"重复MCP进程 {server_name} (PID: {pid}) 已不存在，无需清理")
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    logger.warning(f"重复MCP进程 {server_name} (PID: {pid}) 状态异常，尝试清理")
                    # 尝试强制删除
                    try:
                        del self._managed_processes[server_name]
                        if server_name in self._connection_pool:
                            del self._connection_pool[server_name]
                            logger.info(f"重复MCP进程 {server_name} 连接池已清理")
                    except Exception as e:
                        logger.warning(f"清理重复MCP进程 {server_name} 连接池时出错: {e}")
                except Exception as e:
                    logger.warning(f"检查重复MCP进程 {server_name} 状态时出错: {e}")

            # 清理系统中可能存在的amap-maps相关进程
            self._cleanup_amap_related_processes()

        except Exception as e:
            logger.warning(f"清理重复MCP进程时出错: {e}")

    def _cleanup_amap_related_processes(self):
        """清理系统中可能存在的amap-maps相关进程"""
        try:
            import psutil

            # 查找所有Python进程
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info['cmdline']
                    if not cmdline:
                        continue

                    # 检查是否是amap-maps相关的进程
                    cmd_str = ' '.join(cmdline)
                    if any(keyword in cmd_str.lower() for keyword in [
                        'amap-maps', 'amap_maps', '@amap/amap-maps-mcp-server',
                        'mcp-amap', 'mcp_amap'
                    ]):
                        # 检查是否是我们管理的进程
                        pid = proc.info['pid']
                        is_managed = any(
                            managed_info['pid'] == pid
                            for managed_info in self._managed_processes.values()
                        )

                        if not is_managed:
                            logger.warning(f"发现未管理的amap-maps相关进程: {proc.info['name']} (PID: {pid})")
                            logger.warning(f"命令行: {cmd_str}")

                            # 尝试终止进程
                            try:
                                proc.terminate()
                                proc.wait(timeout=3)
                                logger.info(f"已终止未管理的amap-maps进程: PID {pid}")
                            except psutil.TimeoutExpired:
                                logger.warning(f"进程 {pid} 未在3秒内终止，尝试强制终止")
                                proc.kill()
                                logger.info(f"已强制终止进程: PID {pid}")
                            except Exception as e:
                                logger.warning(f"终止进程 {pid} 时出错: {e}")

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                except Exception as e:
                    logger.debug(f"检查进程时出错: {e}")

        except Exception as e:
            logger.warning(f"清理amap-maps相关进程时出错: {e}")

    def _get_server_timeout(self, server_name: str, operation_type: str = 'default') -> float:
        """
        根据服务器配置动态获取超时时间

        Args:
            server_name: 服务器名称
            operation_type: 操作类型 ('ping', 'warmup', 'validation', 'default')

        Returns:
            float: 超时时间（秒）
        """
        # 默认超时时间
        default_timeouts = {
            'ping': 10.0,
            'warmup': 10.0,
            'validation': 10.0,
            'default': 10.0
        }

        # 检查服务器配置中是否有自定义超时设置
        if server_name in self.server_configs:
            config = self.server_configs[server_name]

            # 检查是否有超时配置
            if 'timeout' in config:
                timeout_config = config['timeout']
                if isinstance(timeout_config, dict):
                    return timeout_config.get(operation_type, timeout_config.get('default', default_timeouts[operation_type]))
                elif isinstance(timeout_config, (int, float)):
                    return float(timeout_config)

            # 基于服务器描述或名称判断是否为慢服务器
            description = config.get('description', '').lower()
            if any(keyword in description for keyword in ['区块链', 'blockchain', 'web3', 'rpc']):
                return 30.0  # 区块链相关服务器使用更长超时

        return default_timeouts.get(operation_type, default_timeouts['default'])

    async def _get_or_create_client(self, target_server: str) -> 'MCPClient':
        """
        获取或创建MCP客户端连接（任务7：完善重试和恢复机制）

        增强功能：
        - 智能重试策略（指数退避 + 抖动）
        - 增强连接池健康检查
        - 智能故障恢复机制
        - 连接预热和故障转移

        Args:
            target_server: 目标服务器名称

        Returns:
            MCPClient: MCP客户端实例

        Raises:
            ValueError: 当服务器配置不存在时
            RuntimeError: 当连接失败时
        """
        # 智能重试配置
        max_retries = 5  # 增加重试次数
        base_delay = 1.0  # 基础延迟
        max_delay = 30.0  # 最大延迟
        backoff_factor = 2.0  # 退避因子
        jitter_factor = 0.1  # 抖动因子

        last_exception = None

        for attempt in range(max_retries):
            try:
                # 1. 增强连接池健康检查
                if target_server in self._connection_pool:
                    existing_client = self._connection_pool[target_server]
                    health_check_result = await self._enhanced_connection_health_check(target_server, existing_client)

                    if health_check_result["healthy"]:
                        logger.debug(f"复用健康连接: {target_server}")
                        return existing_client
                    else:
                        logger.warning(f"连接健康检查失败: {target_server}, 原因: {health_check_result['reason']}")
                        await self._cleanup_connection(target_server)

                # 2. 获取服务器配置
                server_config = self.server_configs.get(target_server)
                if not server_config:
                    raise ValueError(f"未找到服务器配置: {target_server}")

                # 3. 智能故障恢复：使用MCPServerManager协调接口
                recovery_result = await self._intelligent_server_recovery(target_server, attempt)
                if not recovery_result["success"]:
                    error_msg = f"无法启动MCP服务器 {target_server}: {recovery_result['message']}"
                    error_code = recovery_result.get("error", "")

                    # 分析错误类型决定是否重试
                    if "冷却期" in error_msg or "cooldown" in error_msg.lower() or error_code == "COOLDOWN_ACTIVE":
                        error_type = MCPErrorType.SERVER_UNAVAILABLE
                    elif "未运行" in error_msg or "not running" in error_msg.lower() or error_code == "SERVER_NOT_RUNNING":
                        error_type = MCPErrorType.SERVER_NOT_FOUND
                    elif error_code == "CONNECTION_FAILED":
                        error_type = MCPErrorType.CONNECTION_FAILED
                    else:
                        error_type = MCPErrorClassifier.classify_error(recovery_result.get('error', ''), type(RuntimeError))

                    if not self._should_retry_for_error(error_type, attempt, max_retries):
                        raise RuntimeError(error_msg)

                    if attempt < max_retries - 1:
                        delay = self._calculate_retry_delay(attempt, base_delay, max_delay, backoff_factor, jitter_factor)
                        logger.warning(f"{error_msg}，第 {attempt + 1} 次重试，延迟 {delay:.2f} 秒...")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise RuntimeError(error_msg)

                # 4. 检查是否已经返回了可用的客户端连接
                if recovery_result.get("client"):
                    client = recovery_result["client"]
                    logger.info(f"使用智能恢复返回的客户端连接: {target_server}")

                    # 连接验证和加入连接池
                    if await self._validate_new_connection(target_server, client):
                        self._connection_pool[target_server] = client
                        logger.info(f"成功使用恢复的连接并加入连接池: {target_server} (尝试 {attempt + 1}/{max_retries})")
                        return client
                    else:
                        logger.warning(f"恢复的连接验证失败: {target_server}，尝试创建新连接")
                        # 继续尝试创建新连接

                # 5. 创建客户端连接（带连接预热）
                client = await self._create_client_connection_with_warmup(target_server, attempt)

                # 6. 连接验证和加入连接池
                if await self._validate_new_connection(target_server, client):
                    self._connection_pool[target_server] = client
                    logger.info(f"成功连接到MCP服务器并加入连接池: {target_server} (尝试 {attempt + 1}/{max_retries})")
                    return client
                else:
                    logger.warning(f"新连接验证失败: {target_server}")
                    await self._cleanup_connection(target_server)
                    raise RuntimeError(f"连接验证失败: {target_server}")

            except ValueError:
                # 配置错误不重试
                raise
            except Exception as e:
                last_exception = e
                error_type = MCPErrorClassifier.classify_error(str(e), type(e))

                if not self._should_retry_for_error(error_type, attempt, max_retries):
                    logger.error(f"连接到MCP服务器 '{target_server}' 失败，错误类型不可重试: {error_type}")
                    raise RuntimeError(f"连接到MCP服务器 '{target_server}' 失败: {e}")

                if attempt < max_retries - 1:
                    delay = self._calculate_retry_delay(attempt, base_delay, max_delay, backoff_factor, jitter_factor)
                    logger.warning(f"连接到MCP服务器 '{target_server}' 失败 (尝试 {attempt + 1}/{max_retries}): {e}，{delay:.2f} 秒后重试...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"连接到MCP服务器 '{target_server}' 最终失败: {e}")
                    raise RuntimeError(f"连接到MCP服务器 '{target_server}' 失败: {e}")

        # 理论上不会到达这里
        raise RuntimeError(f"连接到MCP服务器 '{target_server}' 失败: 超出最大重试次数，最后错误: {last_exception}")

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

            # 构建进程匹配模式 - 从配置动态生成
            search_patterns = [target_server, cmd] + args

            # 添加基于配置的额外搜索模式
            if 'command' in server_config:
                command_parts = server_config['command']
                if isinstance(command_parts, list) and len(command_parts) > 0:
                    # 添加命令的基础名称
                    base_command = os.path.basename(command_parts[0])
                    search_patterns.append(base_command)

                    # 如果是npm/npx命令，添加包名
                    if len(command_parts) > 1 and command_parts[0] in ['npm', 'npx']:
                        if 'exec' in command_parts:
                            # npm exec @package/name 格式
                            exec_index = command_parts.index('exec')
                            if exec_index + 1 < len(command_parts):
                                package_name = command_parts[exec_index + 1]
                                search_patterns.append(package_name)
                                # 添加包的简短名称
                                if '/' in package_name:
                                    short_name = package_name.split('/')[-1]
                                    search_patterns.append(short_name)
                        else:
                            # 直接的包名
                            package_name = command_parts[1]
                            search_patterns.append(package_name)
                            if '/' in package_name:
                                short_name = package_name.split('/')[-1]
                                search_patterns.append(short_name)

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

    async def _ensure_server_via_manager(self, target_server: str, connect_only: bool = False) -> Dict[str, Any]:
        """
        通过MCPServerManager确保服务器运行（第二阶段协调接口）

        这是第二阶段新增的协调方法，替代原来的_ensure_mcp_process

        Args:
            target_server: 服务器名称
            connect_only: 如果为True，仅尝试连接现有服务器，不启动新服务器

        Returns:
            Dict[str, Any]: 服务器状态信息
        """
        try:
            # 导入MCPServerManager
            from app.services.mcp_manager import mcp_manager

            # 使用协调接口确保服务器运行
            result = await mcp_manager.ensure_server_running(target_server, connect_only=connect_only)

            if result["success"] and result["pid"]:
                # 更新本地进程记录
                import time
                self._managed_processes[target_server] = {
                    "pid": result["pid"],
                    "start_time": time.time()
                }
                logger.info(f"通过管理器确保服务器运行: {target_server} (PID: {result['pid']})")

            return result

        except Exception as e:
            logger.error(f"通过管理器确保服务器运行时出错 {target_server}: {e}")

            # 使用错误分类器进行精确分类
            error_type = MCPErrorClassifier.classify_error(str(e), type(e))
            user_message = MCPErrorClassifier.get_user_friendly_message(error_type, str(e))

            return {
                "success": False,
                "running": False,
                "pid": None,
                "message": user_message,
                "error": error_type.value,
                "error_type": error_type.name,
                "original_error": str(e)
            }

    async def _create_client_connection(self, target_server: str, attempt: int) -> 'MCPClient':
        """
        创建客户端连接（带重试逻辑的辅助方法）

        Args:
            target_server: 服务器名称
            attempt: 当前尝试次数

        Returns:
            MCPClient: 客户端实例
        """
        try:
            client = MCPClient()

            # 连接前等待一小段时间，确保服务器完全启动
            if attempt > 0:
                await asyncio.sleep(0.5)

            # 使用超时包装连接过程，避免长时间阻塞
            timeout = self._get_server_timeout(target_server, 'default')

            # 使用改进的连接方法，避免asyncio上下文问题
            await self._connect_with_context_management(client, target_server, timeout)

            # 标记连接创建时间，用于后续的健康检查
            client._created_at = time.time()

            return client

        except asyncio.TimeoutError:
            logger.warning(f"创建客户端连接超时 {target_server} (尝试 {attempt + 1}): {timeout}秒")
            raise RuntimeError(f"连接超时: {timeout}秒")
        except Exception as e:
            logger.warning(f"创建客户端连接失败 {target_server} (尝试 {attempt + 1}): {e}")
            raise

    async def _connect_with_context_management(self, client: 'MCPClient', target_server: str, timeout: float):
        """
        使用改进的上下文管理来建立连接，避免asyncio资源清理问题

        Args:
            client: MCP客户端实例
            target_server: 目标服务器名称
            timeout: 连接超时时间
        """
        try:
            # 直接调用连接，不使用asyncio.wait_for包装
            await client.connect(target_server)
        except Exception as e:
            # 如果连接失败，记录详细错误信息
            logger.error(f"连接到MCP服务器 {target_server} 失败: {e}")
            raise

    async def _cleanup_connection(self, target_server: str):
        """
        清理失效的连接（辅助方法）

        Args:
            target_server: 服务器名称
        """
        try:
            if target_server in self._connection_pool:
                old_client = self._connection_pool[target_server]

                # 尝试优雅关闭连接
                if hasattr(old_client, 'close'):
                    try:
                        # 使用超时包装关闭过程，但捕获asyncio上下文错误
                        await self._safe_close_connection(old_client, target_server)
                    except Exception as e:
                        logger.debug(f"关闭连接时出现非致命错误: {e}")

                # 清理连接池
                del self._connection_pool[target_server]
                logger.debug(f"已清理失效连接: {target_server}")

        except Exception as e:
            logger.warning(f"清理连接时出错 {target_server}: {e}")
            # 强制清理，避免连接池泄漏
            if target_server in self._connection_pool:
                del self._connection_pool[target_server]

    async def _safe_close_connection(self, client, target_server: str):
        """
        安全地关闭MCP客户端连接，避免asyncio上下文问题

        Args:
            client: MCP客户端实例
            target_server: 服务器名称
        """
        try:
            # 检查是否有session和exit_stack
            if hasattr(client, 'session') and client.session:
                # 尝试关闭session
                if hasattr(client.session, 'close'):
                    await client.session.close()

            if hasattr(client, 'exit_stack') and client.exit_stack:
                # 使用exit_stack来安全清理资源
                await client.exit_stack.aclose()

        except Exception as e:
            # 捕获所有异常，避免影响主流程
            logger.debug(f"安全关闭连接时出现非致命错误 {target_server}: {e}")

    async def _enhanced_connection_health_check(self, target_server: str, client) -> dict:
        """
        增强连接健康检查（任务7）

        Args:
            target_server: 目标服务器名称
            client: 客户端实例

        Returns:
            dict: {"healthy": bool, "reason": str}
        """
        try:
            # 1. 基础连接状态检查
            if not hasattr(client, 'is_connected') or not client.is_connected():
                return {"healthy": False, "reason": "连接已断开"}

            # 2. 简单ping测试（如果支持）
            if hasattr(client, 'ping'):
                try:
                    # 动态获取服务器的ping超时时间
                    ping_timeout = self._get_server_timeout(target_server, 'ping')

                    await asyncio.wait_for(client.ping(), timeout=ping_timeout)
                except asyncio.TimeoutError:
                    # 对于慢服务器，ping超时不一定意味着连接不健康
                    # 基于配置判断是否为慢服务器
                    if ping_timeout > 15.0:  # 如果配置的超时时间较长，认为是慢服务器
                        logger.warning(f"服务器 {target_server} ping超时，但仍认为连接有效")
                        return {"healthy": True, "reason": "ping超时但连接可用"}
                    return {"healthy": False, "reason": "ping超时"}
                except Exception as e:
                    return {"healthy": False, "reason": f"ping失败: {e}"}

            # 3. 检查连接创建时间（避免使用过旧的连接）
            if hasattr(client, '_created_at'):
                connection_age = time.time() - client._created_at
                max_age = 3600  # 1小时
                if connection_age > max_age:
                    return {"healthy": False, "reason": f"连接过旧 ({connection_age:.0f}秒)"}

            return {"healthy": True, "reason": "连接健康"}

        except Exception as e:
            return {"healthy": False, "reason": f"健康检查异常: {e}"}

    async def _try_connect_existing_server(self, target_server: str) -> dict:
        """
        尝试连接到已运行的服务器实例（修复任务1：连接逻辑优化）

        修复要点：
        1. 不仅检查服务器状态，还要实际尝试建立连接
        2. 区分"服务器未运行"和"连接失败"两种情况
        3. 对于运行中的服务器，直接尝试连接而不依赖重启

        Args:
            target_server: 目标服务器名称

        Returns:
            dict: {"success": bool, "message": str, "error": str, "pid": int, "client": MCPClient}
        """
        try:
            from app.services.mcp_manager import mcp_manager

            # 检查服务器是否已在运行
            server_status = mcp_manager.get_server_status(target_server)
            if not server_status or not server_status.running:
                return {
                    "success": False,
                    "message": f"服务器 {target_server} 未运行",
                    "error": "SERVER_NOT_RUNNING",
                    "pid": None,
                    "client": None
                }

            # 获取进程信息
            pid = None
            if server_status.process_info:
                pid = server_status.process_info.get("pid")

            # 验证进程是否真的存在（对于有PID的服务器）
            if pid:
                try:
                    import psutil
                    process = psutil.Process(pid)
                    if not process.is_running():
                        logger.warning(f"服务器 {target_server} 状态不一致，PID {pid} 不存在")
                        # 清理不一致的状态
                        server_status.running = False
                        server_status.process_info = None
                        return {
                            "success": False,
                            "message": f"服务器 {target_server} 进程已退出",
                            "error": "PROCESS_DEAD",
                            "pid": None,
                            "client": None
                        }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    logger.warning(f"服务器 {target_server} 状态不一致，PID {pid} 不存在")
                    # 清理不一致的状态
                    server_status.running = False
                    server_status.process_info = None
                    return {
                        "success": False,
                        "message": f"服务器 {target_server} 进程不可访问",
                        "error": "PROCESS_INACCESSIBLE",
                        "pid": None,
                        "client": None
                    }

            # 实际尝试建立连接
            logger.info(f"尝试连接到运行中的服务器: {target_server} (PID: {pid})")
            try:
                # 创建客户端连接
                client = await self._create_client_connection(target_server, attempt=0)

                # 验证连接是否有效
                if await self._validate_new_connection(target_server, client):
                    logger.info(f"成功连接到运行中的服务器: {target_server}")
                    return {
                        "success": True,
                        "message": f"连接到运行中的服务器: {target_server}",
                        "error": None,
                        "pid": pid,
                        "client": client
                    }
                else:
                    logger.warning(f"连接验证失败: {target_server}")
                    return {
                        "success": False,
                        "message": f"连接验证失败: {target_server}",
                        "error": "CONNECTION_VALIDATION_FAILED",
                        "pid": pid,
                        "client": None
                    }

            except Exception as conn_e:
                logger.warning(f"连接到运行中服务器失败 {target_server}: {conn_e}")
                return {
                    "success": False,
                    "message": f"连接失败: {conn_e}",
                    "error": "CONNECTION_FAILED",
                    "pid": pid,
                    "client": None
                }

        except Exception as e:
            logger.error(f"检查运行中服务器时出错 {target_server}: {e}")
            return {
                "success": False,
                "message": f"检查服务器状态失败: {e}",
                "error": str(e),
                "pid": None,
                "client": None
            }

    async def _intelligent_server_recovery(self, target_server: str, attempt: int) -> dict:
        """
        智能故障恢复机制（修复任务1：优化连接逻辑）

        修复要点：
        1. 优先尝试连接现有服务器，避免不必要的重启
        2. 区分连接失败和服务器未运行的情况
        3. 只有在连接失败时才考虑重启服务器

        Args:
            target_server: 目标服务器名称
            attempt: 当前尝试次数

        Returns:
            dict: {"success": bool, "message": str, "error": str, "client": MCPClient}
        """
        try:
            # 第一次尝试：优先连接现有服务器
            if attempt == 0:
                connect_result = await self._try_connect_existing_server(target_server)
                if connect_result["success"]:
                    # 连接成功，直接返回
                    logger.info(f"成功连接到现有服务器: {target_server}")
                    return connect_result

                # 分析连接失败的原因
                error_type = connect_result.get("error", "")
                if error_type == "SERVER_NOT_RUNNING":
                    # 服务器未运行，尝试启动（不使用connect_only模式）
                    logger.debug(f"服务器 {target_server} 未运行，尝试启动")
                    manager_result = await self._ensure_server_via_manager(target_server, connect_only=False)
                    # 将manager结果转换为统一格式
                    return {
                        "success": manager_result["success"],
                        "message": manager_result["message"],
                        "error": manager_result.get("error", ""),
                        "client": None  # 需要后续创建连接
                    }
                else:
                    # 服务器运行但连接失败，记录详细信息
                    logger.warning(f"服务器 {target_server} 运行中但连接失败: {connect_result['message']}")
                    return connect_result

            elif attempt == 1:
                # 第二次尝试：清理僵尸进程后重新连接
                try:
                    from app.services.mcp_manager import mcp_manager
                    if hasattr(mcp_manager, '_cleanup_zombie_processes'):
                        await mcp_manager._cleanup_zombie_processes()
                        logger.debug(f"已清理僵尸进程，重新尝试连接 {target_server}")
                except Exception as e:
                    logger.warning(f"清理僵尸进程失败: {e}")

                # 再次尝试连接
                connect_result = await self._try_connect_existing_server(target_server)
                if connect_result["success"]:
                    return connect_result

                # 连接仍然失败，尝试通过manager启动
                manager_result = await self._ensure_server_via_manager(target_server)
                return {
                    "success": manager_result["success"],
                    "message": manager_result["message"],
                    "error": manager_result.get("error", ""),
                    "client": None
                }

            elif attempt == 2:
                # 第三次尝试：重置服务器失败状态
                try:
                    from app.services.mcp_manager import mcp_manager
                    if hasattr(mcp_manager, 'reset_server_failures'):
                        mcp_manager.reset_server_failures(target_server)
                        logger.debug(f"已重置服务器 {target_server} 失败状态")
                except Exception as e:
                    logger.warning(f"重置服务器失败状态失败: {e}")

                manager_result = await self._ensure_server_via_manager(target_server)
                return {
                    "success": manager_result["success"],
                    "message": manager_result["message"],
                    "error": manager_result.get("error", ""),
                    "client": None
                }

            else:
                # 后续尝试：强制重启服务器
                try:
                    from app.services.mcp_manager import mcp_manager
                    if hasattr(mcp_manager, 'restart_server'):
                        logger.info(f"强制重启服务器: {target_server} (尝试 {attempt + 1})")
                        restart_result = await mcp_manager.restart_server(target_server)
                        if restart_result:
                            return {
                                "success": True,
                                "message": "服务器重启成功",
                                "error": None,
                                "client": None
                            }
                        else:
                            return {
                                "success": False,
                                "message": "服务器重启失败",
                                "error": "RESTART_FAILED",
                                "client": None
                            }
                    else:
                        manager_result = await self._ensure_server_via_manager(target_server)
                        return {
                            "success": manager_result["success"],
                            "message": manager_result["message"],
                            "error": manager_result.get("error", ""),
                            "client": None
                        }
                except Exception as e:
                    logger.error(f"强制重启服务器失败 {target_server}: {e}")
                    manager_result = await self._ensure_server_via_manager(target_server)
                    return {
                        "success": manager_result["success"],
                        "message": manager_result["message"],
                        "error": manager_result.get("error", ""),
                        "client": None
                    }

        except Exception as e:
            logger.error(f"智能恢复过程中发生异常 {target_server}: {e}")
            return {
                "success": False,
                "message": f"智能恢复失败: {e}",
                "error": str(e),
                "client": None
            }

    def _calculate_retry_delay(self, attempt: int, base_delay: float, max_delay: float,
                              backoff_factor: float, jitter_factor: float) -> float:
        """
        计算重试延迟（指数退避 + 抖动）

        Args:
            attempt: 当前尝试次数
            base_delay: 基础延迟
            max_delay: 最大延迟
            backoff_factor: 退避因子
            jitter_factor: 抖动因子

        Returns:
            float: 计算出的延迟时间
        """
        # 指数退避
        delay = min(base_delay * (backoff_factor ** attempt), max_delay)

        # 添加抖动避免雷群效应
        jitter = delay * jitter_factor * (0.5 - random.random())

        return max(0.1, delay + jitter)  # 最小延迟0.1秒

    def _should_retry_for_error(self, error_type: MCPErrorType, attempt: int, max_retries: int) -> bool:
        """
        根据错误类型决定是否应该重试

        Args:
            error_type: 错误类型
            attempt: 当前尝试次数
            max_retries: 最大重试次数

        Returns:
            bool: 是否应该重试
        """
        if attempt >= max_retries - 1:
            return False

        # 不可重试的错误类型
        non_retryable_errors = {
            MCPErrorType.CONFIG_INVALID,
            MCPErrorType.CONFIG_NOT_FOUND,
            MCPErrorType.PROCESS_PERMISSION_DENIED,
            MCPErrorType.VALIDATION_ERROR,
            MCPErrorType.TOOL_NOT_FOUND,
            MCPErrorType.TOOL_INVALID_PARAMS
        }

        return error_type not in non_retryable_errors

    async def _create_client_connection_with_warmup(self, target_server: str, attempt: int):
        """
        创建客户端连接并进行预热（任务7）

        Args:
            target_server: 目标服务器名称
            attempt: 当前尝试次数

        Returns:
            MCPClient: 客户端实例
        """
        # 创建基础连接
        client = await self._create_client_connection(target_server, attempt)

        # 连接预热：记录创建时间
        if hasattr(client, '__dict__'):
            client._created_at = time.time()

        # 预热连接：执行简单的健康检查
        try:
            if hasattr(client, 'list_tools'):
                # 动态获取服务器的预热超时时间
                warmup_timeout = self._get_server_timeout(target_server, 'warmup')

                # 尝试列出工具作为预热
                await asyncio.wait_for(client.list_tools(), timeout=warmup_timeout)
                logger.debug(f"连接预热成功: {target_server}")
        except Exception as e:
            logger.warning(f"连接预热失败，但继续使用: {target_server}, 错误: {e}")

        return client

    async def _validate_new_connection(self, target_server: str, client) -> bool:
        """
        验证新连接的有效性

        Args:
            target_server: 目标服务器名称
            client: 客户端实例

        Returns:
            bool: 连接是否有效
        """
        try:
            # 基础连接状态检查
            if hasattr(client, 'session') and client.session is None:
                logger.warning(f"连接验证失败: {target_server} - session为空")
                return False

            # 功能验证：尝试获取工具列表来验证连接
            if hasattr(client, 'session') and client.session:
                # 动态获取服务器的验证超时时间
                timeout = self._get_server_timeout(target_server, 'validation')

                try:
                    await asyncio.wait_for(client.session.list_tools(), timeout=timeout)
                    logger.debug(f"连接验证成功: {target_server}")
                except asyncio.TimeoutError:
                    logger.warning(f"工具列表获取超时({timeout}s): {target_server}，但基础连接正常，继续使用")
                    # 对于超时但基础连接正常的情况，我们仍然认为连接有效
                    # 这是为了兼容响应较慢的服务器
                    pass

            return True

        except Exception as e:
            logger.warning(f"连接验证失败: {target_server}, 错误: {e}")
            return False

    async def _ensure_mcp_process(self, target_server: str, server_config: dict) -> int:
        """
        确保MCP进程运行（兼容性方法，已弃用）

        注意：此方法已在第二阶段重构中弃用，保留仅为向后兼容
        新代码应使用_ensure_server_via_manager方法

        Args:
            target_server: 服务器名称
            server_config: 服务器配置

        Returns:
            int: 运行中的进程PID

        Raises:
            RuntimeError: 当找不到运行中的MCP进程时
        """
        logger.warning(f"使用已弃用的_ensure_mcp_process方法: {target_server}")

        # 委托给新的协调接口
        result = await self._ensure_server_via_manager(target_server)
        if result["success"] and result["pid"]:
            return result["pid"]
        else:
            raise RuntimeError(f"无法确保MCP进程运行: {result['message']}")

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

    # 移除 _start_mcp_process 方法
    # 职责分离重构：进程启动现在完全由MCPServerManager负责
    # 客户端包装器只负责连接到已存在的MCP服务器进程

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
    async def execute_tool(
        self, tool_id: str, params: Dict[str, Any], target_server: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        执行MCP工具

        Args:
            tool_id: 工具ID
            params: 工具参数
            target_server: 可选，指定要连接的MCP服务器名称

        Returns:
            执行结果
        """
        if not target_server:
            target_server = 'amap-maps'  # 默认使用amap-maps

        try:
            # 使用独立进程执行器来避免asyncio上下文问题
            return await self._execute_tool_in_process(tool_id, params, target_server)

        except Exception as e:
            logger.error(f"执行MCP工具时发生异常 {tool_id}: {e}")
            return {
                "tool_id": tool_id,
                "success": False,
                "error": {"message": f"执行异常: {e}"}
            }

    async def _execute_tool_in_process(self, tool_id: str, params: Dict[str, Any], target_server: str) -> Dict[str, Any]:
        """
        在独立进程中执行MCP工具，避免asyncio上下文问题
        """
        try:
            import subprocess
            import json
            import tempfile

            # 创建临时Python脚本
            script_content = f'''
import asyncio
import sys
import os
import json

# 获取当前工作目录和脚本目录
current_dir = os.getcwd()
script_dir = os.path.dirname(os.path.abspath(__file__))
print(f"DEBUG: 当前工作目录: {{current_dir}}")
print(f"DEBUG: 脚本目录: {{script_dir}}")

# 尝试多种路径来找到MCP客户端
possible_paths = [
    "{os.path.abspath(os.path.join(os.getcwd(), "MCP_Client"))}",  # 从当前工作目录
    "{os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "MCP_Client"))}",  # 从脚本目录
    "{os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "MCP_Client"))}",  # 从backend目录
    os.path.join(current_dir, "MCP_Client"),
    os.path.join(current_dir, "..", "MCP_Client"),
    os.path.join(current_dir, "..", "..", "MCP_Client"),
]

print(f"DEBUG: 可能的MCP客户端路径: {{possible_paths}}")

# 找到第一个存在的路径
mcp_client_path = None
for path in possible_paths:
    if os.path.exists(path):
        mcp_client_path = path
        print(f"DEBUG: 找到MCP客户端路径: {{mcp_client_path}}")
        break

if not mcp_client_path:
    print("DEBUG: 未找到MCP客户端路径")
    print(json.dumps({{
        "success": False,
        "error": {{"message": "无法找到MCP客户端路径"}}
    }}, ensure_ascii=False))
    exit(1)

# 添加到Python路径
if mcp_client_path not in sys.path:
    sys.path.insert(0, mcp_client_path)
    print(f"DEBUG: 已添加路径: {{mcp_client_path}}")

print(f"DEBUG: 当前sys.path: {{sys.path}}")

async def execute_tool():
    try:
        print("DEBUG: 开始导入MCP客户端...")
        from mcp_client import MCPClient
        print("DEBUG: MCP客户端导入成功")

        # 设置环境变量
        env = {self.server_configs.get(target_server, {}).get('env', {})}
        for key, value in env.items():
            os.environ[key] = value
            print(f"DEBUG: 设置环境变量 {{key}}={{value}}")

        client = MCPClient()
        print("DEBUG: MCP客户端创建成功")

        print(f"DEBUG: 连接到服务器: {target_server}")
        await client.connect('{target_server}')
        print("DEBUG: 连接成功")

        print(f"DEBUG: 调用工具: {tool_id}")
        result = await client.session.call_tool('{tool_id}', {params})
        print("DEBUG: 工具调用成功")

        # 提取结果
        if hasattr(result, 'content'):
            if hasattr(result.content, 'text'):
                content = result.content.text
            else:
                content = str(result.content)
        else:
            content = str(result)

        print(json.dumps({{
            "success": True,
            "result": {{"message": content}}
        }}, ensure_ascii=False))

    except Exception as e:
        print(f"DEBUG: 执行出错: {{e}}")
        print(json.dumps({{
            "success": False,
            "error": {{"message": str(e)}}
        }}, ensure_ascii=False))

if __name__ == "__main__":
    print("DEBUG: 开始执行...")
    asyncio.run(execute_tool())
'''

            # 写入临时脚本
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                script_path = f.name
                f.write(script_content)

            try:
                # 执行脚本
                result = subprocess.run(
                    [sys.executable, script_path],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    env={**os.environ, **self.server_configs.get(target_server, {}).get('env', {})}
                )

                if result.returncode == 0:
                    # 解析输出
                    output_lines = result.stdout.strip().split('\n')
                    for line in output_lines:
                        if line.startswith('{'):
                            try:
                                data = json.loads(line)
                                return {
                                    "tool_id": tool_id,
                                    "success": data.get("success", False),
                                    "result": data.get("result", {}),
                                    "error": data.get("error", {})
                                }
                            except json.JSONDecodeError:
                                continue

                    return {
                        "tool_id": tool_id,
                        "success": False,
                        "error": {"message": "无法解析输出结果"}
                    }
                else:
                    return {
                        "tool_id": tool_id,
                        "success": False,
                        "error": {"message": f"执行失败: {result.stderr}"}
                    }

            finally:
                # 清理临时文件
                try:
                    os.unlink(script_path)
                except:
                    pass

        except Exception as e:
            logger.error(f"进程执行器出错: {e}")
            return {
                "tool_id": tool_id,
                "success": False,
                "error": {"message": f"进程执行器错误: {e}"}
            }

    def check_server_exists(self, server_name: str) -> bool:
        """
        检查指定的服务器名称是否存在于配置中

        Args:
            server_name: 服务器名称

        Returns:
            bool: 服务器是否存在
        """
        return server_name in self.server_configs

    async def check_connection_pool_health(self) -> Dict[str, Any]:
        """
        检查连接池健康状态（第二阶段新增功能）

        Returns:
            Dict[str, Any]: 连接池健康状态报告
        """
        import time

        health_report = {
            "total_connections": len(self._connection_pool),
            "healthy_connections": 0,
            "unhealthy_connections": 0,
            "connection_details": {},
            "timestamp": time.time()
        }

        unhealthy_servers = []

        for server_name, client in self._connection_pool.items():
            try:
                # 检查连接是否健康
                is_healthy = False
                if hasattr(client, 'is_connected'):
                    is_healthy = client.is_connected()
                elif hasattr(client, 'session') and client.session:
                    is_healthy = bool(client.session._transport)
                else:
                    # 如果没有明确的健康检查方法，假设连接有效
                    is_healthy = True

                if is_healthy:
                    health_report["healthy_connections"] += 1
                    health_report["connection_details"][server_name] = {
                        "status": "healthy",
                        "error": None
                    }
                else:
                    health_report["unhealthy_connections"] += 1
                    health_report["connection_details"][server_name] = {
                        "status": "unhealthy",
                        "error": "Connection not active"
                    }
                    unhealthy_servers.append(server_name)

            except Exception as e:
                health_report["unhealthy_connections"] += 1
                health_report["connection_details"][server_name] = {
                    "status": "error",
                    "error": str(e)
                }
                unhealthy_servers.append(server_name)

        # 清理不健康的连接
        for server_name in unhealthy_servers:
            logger.warning(f"清理不健康的连接: {server_name}")
            await self._cleanup_connection(server_name)

        logger.info(f"连接池健康检查完成: {health_report['healthy_connections']}/{health_report['total_connections']} 连接健康")
        return health_report

    async def refresh_connection_pool(self) -> Dict[str, Any]:
        """
        刷新连接池（第二阶段新增功能）

        清理所有连接并重新建立，用于故障恢复

        Returns:
            Dict[str, Any]: 刷新结果
        """
        import time

        logger.info("开始刷新连接池...")

        # 记录当前连接的服务器
        connected_servers = list(self._connection_pool.keys())

        # 关闭所有现有连接
        await self.close_all_connections()

        # 清理进程记录
        self._managed_processes.clear()

        refresh_result = {
            "total_servers": len(connected_servers),
            "successful_reconnections": 0,
            "failed_reconnections": 0,
            "reconnection_details": {},
            "timestamp": time.time()
        }

        # 尝试重新连接到之前连接的服务器
        for server_name in connected_servers:
            try:
                # 使用MCPServerManager检查服务器健康状态
                from app.services.mcp_manager import mcp_manager
                if mcp_manager.is_server_healthy(server_name):
                    # 尝试重新连接
                    await self._get_or_create_client(server_name)
                    refresh_result["successful_reconnections"] += 1
                    refresh_result["reconnection_details"][server_name] = {
                        "status": "success",
                        "error": None
                    }
                    logger.info(f"成功重新连接到服务器: {server_name}")
                else:
                    refresh_result["failed_reconnections"] += 1
                    refresh_result["reconnection_details"][server_name] = {
                        "status": "failed",
                        "error": "Server not healthy"
                    }
                    logger.warning(f"服务器不健康，跳过重连: {server_name}")

            except Exception as e:
                refresh_result["failed_reconnections"] += 1
                refresh_result["reconnection_details"][server_name] = {
                    "status": "error",
                    "error": str(e)
                }
                logger.error(f"重新连接到服务器失败 {server_name}: {e}")

        logger.info(f"连接池刷新完成: {refresh_result['successful_reconnections']}/{refresh_result['total_servers']} 连接成功")
        return refresh_result

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
