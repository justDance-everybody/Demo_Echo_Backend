#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import os
import time
import psutil
import signal
import threading
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from loguru import logger
from app.config import settings
from app.utils.mcp_client import MCPClientWrapper

@dataclass
class MCPServerStatus:
    """MCP服务器状态信息"""
    name: str
    enabled: bool = True
    running: bool = False
    last_check: Optional[datetime] = None
    restart_count: int = 0
    consecutive_failures: int = 0
    last_restart_time: Optional[datetime] = None
    marked_failed: bool = False  # 连续失败3次后标记
    error_message: Optional[str] = None
    process_info: Optional[Dict[str, Any]] = None

@dataclass
class PerformanceMetrics:
    """性能指标数据结构（任务9）"""
    server_name: str
    timestamp: datetime
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    memory_percent: float = 0.0
    open_files: int = 0
    connections: int = 0
    response_time_ms: float = 0.0
    error_count: int = 0
    restart_count: int = 0

@dataclass
class AlertRule:
    """告警规则配置（任务9）"""
    name: str
    metric: str  # cpu_percent, memory_percent, response_time_ms, error_count
    threshold: float
    operator: str  # '>', '<', '>=', '<=', '=='
    duration_seconds: int = 60  # 持续时间
    enabled: bool = True
    last_triggered: Optional[datetime] = None

@dataclass
class Alert:
    """告警信息（任务9）"""
    rule_name: str
    server_name: str
    message: str
    severity: str  # 'warning', 'error', 'critical'
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class MCPServerManager:
    """MCP服务器管理器 - 统一管理服务器进程和客户端连接"""

    def __init__(self):
        self.servers: Dict[str, MCPServerStatus] = {}
        self.server_configs: Dict[str, Dict] = {}
        self.mcp_client: Optional[MCPClientWrapper] = None
        self.monitoring_task: Optional[asyncio.Task] = None
        self.check_interval = 3600  # 健康检查间隔（秒）- 60分钟
        self.max_consecutive_failures = 3  # 最大连续失败次数
        self.restart_cooldown = 60  # 重启冷却时间（秒）

        # 进程启动锁，防止并发启动同一服务器
        self._startup_locks: Dict[str, asyncio.Lock] = {}
        self._global_startup_lock = asyncio.Lock()

        # 专注于进程管理：启动、监控、管理MCP服务器进程

        # 加载MCP服务器配置
        self._load_server_configs()

        # 环境变量验证规则 - 从配置文件动态生成
        self._env_validation_rules = self._generate_env_validation_rules()

        # 任务9：性能监控和告警系统初始化
        self.performance_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))  # 保留最近1000条记录
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}  # 修复：改为字典类型以支持按key存储告警
        self.metrics_collection_interval = 10  # 秒
        self.metrics_collection_active = False
        self.metrics_collection_task = None
        self._metrics_lock = threading.Lock()

        # 初始化默认告警规则
        self._initialize_default_alert_rules()

        # 配置版本管理
        self.config_version = 1
        self.config_history = deque(maxlen=50)

        # 专注于进程管理，确保MCP服务器进程稳定运行

    def _load_server_configs(self):
        """加载MCP服务器配置"""
        try:
            config_path = os.getenv("MCP_SERVERS_PATH", "/home/devbox/project/MCP_Client/config/mcp_servers.json")
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                self.server_configs = config_data.get("mcpServers", {})

            # 初始化服务器状态
            for server_name, config in self.server_configs.items():
                self.servers[server_name] = MCPServerStatus(
                    name=server_name,
                    enabled=config.get("enabled", True)
                )

            logger.info(f"已加载 {len(self.server_configs)} 个MCP服务器配置")

        except Exception as e:
            logger.error(f"加载MCP服务器配置失败: {e}")
            raise

    def _generate_env_validation_rules(self) -> dict:
        """
        从配置文件动态生成环境变量验证规则

        Returns:
            dict: 环境变量验证规则字典
        """
        validation_rules = {}

        for server_name, config in self.server_configs.items():
            # 从配置中提取环境变量要求
            env_config = config.get('env', {})
            required_vars = []
            optional_vars = []

            # 分析环境变量配置
            for var_name, var_config in env_config.items():
                if isinstance(var_config, dict):
                    # 如果是字典格式，检查是否为必需
                    if var_config.get('required', False):
                        required_vars.append(var_name)
                    else:
                        optional_vars.append(var_name)
                else:
                    # 如果是简单值，默认为可选
                    optional_vars.append(var_name)

            # 基于服务器名称的默认规则（向后兼容）
            if server_name == "amap-maps" and not required_vars:
                required_vars = ["AMAP_MAPS_API_KEY"]
            elif server_name == "minimax-mcp-js" and not required_vars:
                required_vars = ["MINIMAX_API_KEY"]
                if not optional_vars:
                    optional_vars = ["MINIMAX_API_HOST", "MINIMAX_MCP_BASE_PATH"]
            elif server_name == "web3-rpc" and not optional_vars:
                optional_vars = ["WEB3_RPC_URL", "PRIVATE_KEY"]

            validation_rules[server_name] = {
                "required": required_vars,
                "optional": optional_vars
            }

        logger.info(f"生成了 {len(validation_rules)} 个服务器的环境变量验证规则")
        return validation_rules

    def _get_success_indicators(self, server_name: str, config: dict) -> list:
        """
        从配置动态生成启动成功指示符

        Args:
            server_name: 服务器名称
            config: 服务器配置

        Returns:
            list: 成功指示符列表
        """
        # 通用成功指示符
        indicators = [
            "running on stdio",
            "mcp server running",
            "server started",
            "listening",
            "registering",
            "initialized",
            "ready",
            "started",
            "loading",
            "connecting"
        ]

        # 从配置中获取特定的成功指示符
        if 'success_indicators' in config:
            custom_indicators = config['success_indicators']
            if isinstance(custom_indicators, list):
                indicators.extend(custom_indicators)
            elif isinstance(custom_indicators, str):
                indicators.append(custom_indicators)

        # 基于服务器名称的默认指示符（向后兼容）
        if server_name == "web3-rpc":
            indicators.extend([
                "registering general tools",
                "registering solana tools",
                "looking for .env file"
            ])
        elif server_name == "amap-maps":
            indicators.extend([
                "amap maps mcp server running on stdio",
                "maps mcp server running"
            ])

        return indicators

    def _generate_mcp_patterns(self) -> list:
        """
        从配置文件动态生成MCP服务器识别模式

        Returns:
            list: MCP服务器识别模式列表
        """
        patterns = set()

        # 从配置文件中提取模式
        for server_name, config in self.server_configs.items():
            # 添加服务器名称本身
            patterns.add(server_name.lower())

            # 从命令中提取模式
            if 'command' in config:
                command = config['command']
                if isinstance(command, list) and command:
                    # 提取可执行文件名
                    executable = command[0].lower()
                    patterns.add(executable)

                    # 如果是npm/npx命令，提取包名
                    if executable in ['npm', 'npx'] and len(command) > 1:
                        if 'exec' in command and len(command) > 2:
                            package_name = command[2].lower()
                            patterns.add(package_name)
                        elif len(command) > 1:
                            package_name = command[1].lower()
                            patterns.add(package_name)

            # 从参数中提取模式
            if 'args' in config and isinstance(config['args'], list):
                for arg in config['args']:
                    if isinstance(arg, str) and 'mcp' in arg.lower():
                        patterns.add(arg.lower())

        # 添加通用MCP模式
        patterns.update([
            'mcp-server',
            'mcp_server',
            'model-context-protocol',
            'mcp-amap',  # 向后兼容
        ])

        # 向后兼容：添加已知的特定模式
        patterns.update([
            'playwright-mcp-server',
            '@executeautomation/playwright-mcp-server',
            '@amap/amap-maps-mcp-server',
            'amap-maps-mcp-server',
            'minimax-mcp-js',
            '@minimax/mcp-server',
            'web3-mcp',
            'web3-rpc-mcp'
        ])

        return list(patterns)

    async def _prepare_and_validate_env(self, server_name: str, config: dict) -> Optional[dict]:
        """
        准备和验证MCP服务器的环境变量

        Args:
            server_name: 服务器名称
            config: 服务器配置

        Returns:
            dict: 验证通过的环境变量字典，失败时返回None
        """
        try:
            # 1. 复制当前环境变量
            env = os.environ.copy()

            # 2. 获取配置中的环境变量
            config_env = config.get("env", {})

            # 3. 获取验证规则
            validation_rules = self._env_validation_rules.get(server_name, {"required": [], "optional": []})
            required_vars = validation_rules.get("required", [])

            # 4. 验证必需的环境变量
            missing_vars = []
            for var_name in required_vars:
                # 检查配置文件中是否提供了该变量
                if var_name not in config_env:
                    # 检查系统环境变量中是否存在
                    if var_name not in env:
                        missing_vars.append(var_name)
                    else:
                        logger.debug(f"MCP服务器 {server_name}: 使用系统环境变量 {var_name}")
                else:
                    # 验证配置文件中的值不为空
                    if not config_env[var_name] or config_env[var_name].strip() == "":
                        missing_vars.append(var_name)
                    else:
                        logger.debug(f"MCP服务器 {server_name}: 使用配置文件中的环境变量 {var_name}")

            if missing_vars:
                logger.error(f"MCP服务器 {server_name} 缺少必需的环境变量: {', '.join(missing_vars)}")
                return None

            # 5. 设置环境变量（配置文件优先）
            for var_name, var_value in config_env.items():
                if var_value and str(var_value).strip():
                    env[var_name] = str(var_value)
                    # 只记录非敏感信息
                    if "key" in var_name.lower() or "token" in var_name.lower():
                        logger.debug(f"MCP服务器 {server_name}: 设置环境变量 {var_name}=***")
                    else:
                        logger.debug(f"MCP服务器 {server_name}: 设置环境变量 {var_name}={var_value}")
                else:
                    logger.warning(f"MCP服务器 {server_name}: 环境变量 {var_name} 的值为空，跳过设置")

            # 6. 最终验证：确保所有必需变量在最终环境中存在
            final_missing = []
            for var_name in required_vars:
                if var_name not in env or not env[var_name].strip():
                    final_missing.append(var_name)

            if final_missing:
                logger.error(f"MCP服务器 {server_name} 最终环境变量验证失败，缺少: {', '.join(final_missing)}")
                return None

            logger.info(f"MCP服务器 {server_name} 环境变量验证通过，已设置 {len(config_env)} 个变量")
            return env

        except Exception as e:
            logger.error(f"MCP服务器 {server_name} 环境变量处理异常: {e}")
            return None

    def add_env_validation_rule(self, server_name: str, required_vars: List[str] = None, optional_vars: List[str] = None):
        """
        动态添加或更新环境变量验证规则

        Args:
            server_name: 服务器名称
            required_vars: 必需的环境变量列表
            optional_vars: 可选的环境变量列表
        """
        if required_vars is None:
            required_vars = []
        if optional_vars is None:
            optional_vars = []

        self._env_validation_rules[server_name] = {
            "required": required_vars,
            "optional": optional_vars
        }
        logger.info(f"已更新MCP服务器 {server_name} 的环境变量验证规则")

    def get_env_validation_rules(self) -> dict:
        """
        获取当前的环境变量验证规则

        Returns:
            dict: 环境变量验证规则字典
        """
        return self._env_validation_rules.copy()

    async def _check_process_uniqueness(self, server_name: str, config: dict) -> Optional[int]:
        """
        检查进程唯一性，防止重复启动同一个MCP服务（增强版本）

        Args:
            server_name: 服务器名称
            config: 服务器配置

        Returns:
            Optional[int]: 如果找到现有进程，返回PID；否则返回None
        """
        try:
            import psutil
            cmd = config["command"]
            args = config.get("args", [])

            # 构建完整的命令行用于匹配
            full_cmd = [cmd] + args

            # 多次检查确保进程状态稳定（防止进程正在启动或关闭）
            found_pids = []
            for check_round in range(3):
                current_pids = []

                for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'status', 'create_time']):
                    try:
                        proc_info = proc.info
                        if proc_info['cmdline'] and proc_info['status'] != 'zombie':
                            # 检查命令行是否匹配
                            proc_cmdline = proc_info['cmdline']

                            # 对于不同类型的MCP服务器，使用不同的匹配策略
                            if self._is_matching_mcp_process(server_name, full_cmd, proc_cmdline):
                                # 验证进程是否真正在运行且健康
                                if await self._verify_process_health_quick(proc_info['pid']):
                                    current_pids.append(proc_info['pid'])
                                    logger.debug(f"检查轮次 {check_round + 1}: 发现MCP进程 {server_name} (PID: {proc_info['pid']})")

                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        continue

                found_pids.append(current_pids)

                # 如果不是最后一轮，等待一小段时间
                if check_round < 2:
                    await asyncio.sleep(0.1)

            # 找到在所有检查轮次中都存在的稳定进程
            stable_pids = set(found_pids[0])
            for pids in found_pids[1:]:
                stable_pids &= set(pids)

            if stable_pids:
                stable_pid = list(stable_pids)[0]  # 取第一个稳定的PID
                logger.info(f"发现稳定运行的MCP进程 {server_name} (PID: {stable_pid})")
                return stable_pid

        except Exception as e:
            logger.warning(f"检查进程唯一性时出错: {e}")

        return None

    async def _verify_process_health_quick(self, pid: int) -> bool:
        """
        快速验证进程健康状态

        Args:
            pid: 进程ID

        Returns:
            bool: 进程是否健康
        """
        try:
            import psutil
            proc = psutil.Process(pid)

            # 检查进程状态
            if proc.status() in ['zombie', 'dead']:
                return False

            # 检查进程是否响应（简单检查）
            proc.cpu_percent()  # 触发CPU使用率计算
            return True

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return False
        except Exception as e:
            logger.debug(f"快速健康检查出错 (PID: {pid}): {e}")
            return False

    def _is_matching_mcp_process(self, server_name: str, expected_cmd: list, actual_cmd: list) -> bool:
        """
        判断进程命令行是否匹配指定的MCP服务器

        Args:
            server_name: 服务器名称
            expected_cmd: 期望的命令行
            actual_cmd: 实际的进程命令行

        Returns:
            bool: 是否匹配
        """
        try:
            # 转换为字符串进行比较
            expected_str = ' '.join(expected_cmd).lower()
            actual_str = ' '.join(actual_cmd).lower()

            # 从配置文件动态生成匹配模式
            if server_name not in self.server_configs:
                return False

            config = self.server_configs[server_name]
            command = config.get('command', '').lower()
            args = config.get('args', [])

            # 基本命令匹配
            if command and command in actual_str:
                # 检查参数匹配
                for arg in args:
                    if isinstance(arg, str) and arg.lower() in actual_str:
                        return True

            # 特殊处理：检查包名匹配（用于npm/npx启动的服务）
            for arg in args:
                if isinstance(arg, str):
                    # 提取包名（去掉@符号和版本号）
                    if '@' in arg and '/' in arg:
                        # 处理 @scope/package 格式，如 @amap/amap-maps-mcp-server
                        package_name = arg.split('@')[1] if arg.startswith('@') else arg
                        if package_name.lower() in actual_str:
                            return True

                        # 特殊处理：npm包可能生成简化的可执行文件名
                        # 如 @amap/amap-maps-mcp-server 可能生成 mcp-amap
                        if '/' in package_name:
                            scope, package = package_name.split('/', 1)
                            # 检查scope是否在实际命令中
                            if scope.lower() in actual_str:
                                return True
                            # 检查包名的关键部分
                            package_parts = package.replace('-', ' ').split()
                            if len(package_parts) >= 2 and all(part in actual_str for part in package_parts[:2] if len(part) > 2):
                                return True
                            # 检查简化的可执行文件名模式，如 mcp-amap
                            if 'mcp' in package and scope in actual_str:
                                return True
                    elif arg.lower() in actual_str:
                        return True

            # 额外的兼容性检查：检查服务器名称本身
            server_name_parts = server_name.replace('-', ' ').split()
            if len(server_name_parts) > 1 and all(part.lower() in actual_str for part in server_name_parts if len(part) > 2):
                return True

            # 通用匹配：检查关键命令组件
            if len(expected_cmd) >= 2:
                # 检查命令和主要参数是否匹配
                cmd_base = expected_cmd[0].lower()
                main_arg = expected_cmd[1].lower() if len(expected_cmd) > 1 else ''

                if cmd_base in actual_str and main_arg in actual_str:
                    return True

            # 特殊处理：检查node_modules/.bin/下的符号链接
            # 如果实际命令包含node_modules/.bin/，尝试匹配包名
            if 'node_modules/.bin/' in actual_str:
                for arg in args:
                    if isinstance(arg, str) and '@' in arg and '/' in arg:
                        # 从@scope/package-name提取可能的bin名称
                        if arg.startswith('@'):
                            scope_package = arg[1:]  # 去掉@
                            if '/' in scope_package:
                                scope, package = scope_package.split('/', 1)
                                # 检查各种可能的bin名称模式
                                possible_bins = [
                                    f"mcp-{scope}",  # mcp-amap
                                    f"{scope}-mcp",  # amap-mcp
                                    package.split('-')[0] if '-' in package else package,  # 包名的第一部分
                                    scope  # scope名称
                                ]
                                for bin_name in possible_bins:
                                    if bin_name.lower() in actual_str:
                                        return True

        except Exception as e:
            logger.debug(f"进程匹配检查出错: {e}")

        return False

    async def start_server(self, server_name: str, force_restart: bool = False) -> bool:
        """
        启动指定的MCP服务器（增强版本，包含进程唯一性检查和并发控制）

        Args:
            server_name: 服务器名称
            force_restart: 是否强制重启，忽略冷却期限制

        Returns:
            bool: 启动是否成功
        """
        if server_name not in self.server_configs:
            logger.error(f"未找到服务器配置: {server_name}")
            return False

        # 获取或创建服务器专用锁
        if server_name not in self._startup_locks:
            self._startup_locks[server_name] = asyncio.Lock()

        # 使用锁防止并发启动同一服务器
        async with self._startup_locks[server_name]:
            logger.debug(f"获取启动锁: {server_name}")

            # 再次检查进程唯一性（在锁内进行最终检查）
            config = self.server_configs[server_name]
            existing_pid = await self._check_process_uniqueness(server_name, config)
            if existing_pid and not force_restart:
                logger.info(f"服务器 {server_name} 已在运行 (PID: {existing_pid})，跳过启动")
                # 更新服务器状态
                server_status = self.servers[server_name]
                server_status.running = True
                server_status.process_info = {"pid": existing_pid}
                return True

            server_status = self.servers[server_name]

            # 检查是否被标记为失败
            if server_status.marked_failed:
                logger.warning(f"服务器 {server_name} 已被标记为失败，跳过启动")
                return False

        # 智能冷却期机制：区分正常冷却和故障恢复
        if not force_restart and server_status.last_restart_time:
            time_since_restart = datetime.now() - server_status.last_restart_time
            cooldown_period = timedelta(seconds=self.restart_cooldown)

            # 如果连续失败次数较多，缩短冷却期以便快速恢复
            if server_status.consecutive_failures >= 2:
                cooldown_period = timedelta(seconds=self.restart_cooldown // 2)
                logger.debug(f"服务器 {server_name} 连续失败 {server_status.consecutive_failures} 次，缩短冷却期至 {cooldown_period.total_seconds()} 秒")

            if time_since_restart < cooldown_period:
                remaining_time = (cooldown_period - time_since_restart).total_seconds()
                logger.info(f"服务器 {server_name} 在冷却期内（剩余 {remaining_time:.1f} 秒），跳过重启")

                # 记录冷却期状态，便于调试
                logger.debug(f"冷却期详情: 连续失败={server_status.consecutive_failures}, "
                           f"上次重启={server_status.last_restart_time}, "
                           f"冷却期={cooldown_period.total_seconds()}秒")
                return False

        config = self.server_configs[server_name]

        # 如果是强制重启，需要清理现有进程
        if force_restart:
            existing_pid = await self._check_process_uniqueness(server_name, config)
            if existing_pid:
                logger.info(f"MCP服务器 {server_name} 已在运行 (PID: {existing_pid})，强制重启模式，清理进程树")
                try:
                    # 清理整个进程树，确保没有遗留的子进程
                    cleanup_success = await self._cleanup_process_tree(existing_pid, server_name)
                    if not cleanup_success:
                        logger.error(f"清理进程树失败，无法启动新进程")
                        return False

                    # 等待一小段时间确保进程完全清理
                    await asyncio.sleep(1)
                    logger.info(f"进程树已清理，继续启动新进程")

                except Exception as e:
                    logger.error(f"清理进程树时出错: {e}")
                    return False

        try:
            logger.info(f"正在启动MCP服务器: {server_name}")

            # 构建启动命令
            cmd = config["command"]
            args = config.get("args", [])

            # 环境变量预处理和验证
            env = await self._prepare_and_validate_env(server_name, config)
            if env is None:
                logger.error(f"MCP服务器 {server_name} 环境变量验证失败")
                server_status.error_message = "环境变量验证失败"
                return False

            # 启动进程
            process = await asyncio.create_subprocess_exec(
                cmd, *args,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # 等待一小段时间检查进程是否成功启动
            await asyncio.sleep(2)

            if process.returncode is None:  # 进程正在运行
                try:
                    # 等待一小段时间让进程输出启动信息
                    await asyncio.sleep(1.0)

                    # 非阻塞读取stdout和stderr
                    stdout_data = b''
                    stderr_data = b''

                    # 多次尝试读取输出，确保能捕获到启动信息
                    for attempt in range(3):
                        try:
                            # 尝试读取stdout
                            if process.stdout.at_eof() == False:
                                stdout_chunk = await asyncio.wait_for(process.stdout.read(1024), timeout=2.0)
                                if stdout_chunk:
                                    stdout_data += stdout_chunk
                        except (asyncio.TimeoutError, Exception):
                            pass

                        try:
                            # 尝试读取stderr
                            if process.stderr.at_eof() == False:
                                stderr_chunk = await asyncio.wait_for(process.stderr.read(1024), timeout=2.0)
                                if stderr_chunk:
                                    stderr_data += stderr_chunk
                        except (asyncio.TimeoutError, Exception):
                            pass

                        # 如果已经有输出了，就不需要继续等待
                        if stdout_data or stderr_data:
                            break

                        # 短暂等待后再次尝试
                        await asyncio.sleep(0.5)

                    # 检查输出内容，判断是否成功启动
                    stdout_text = stdout_data.decode('utf-8', errors='ignore')
                    stderr_text = stderr_data.decode('utf-8', errors='ignore')

                    # 对于不同MCP服务器的成功启动指示符
                    # 从配置动态生成成功指示符
                    success_indicators = self._get_success_indicators(server_name, config)

                    output_text = stdout_text + stderr_text
                    logger.debug(f"MCP服务器 {server_name} 启动输出: {repr(output_text)}")

                    # 调试：检查每个指示符的匹配情况
                    matched_indicators = []
                    output_lower = output_text.lower().strip()
                    for indicator in success_indicators:
                        if indicator.lower() in output_lower:
                            matched_indicators.append(indicator)

                    logger.debug(f"MCP服务器 {server_name} 匹配的成功指示符: {matched_indicators}")
                    is_success = len(matched_indicators) > 0

                    # 对于MCP服务器，只有明确的错误信息才认为启动失败
                    # 更严格的错误指示符，避免误判正常输出
                    error_indicators = [
                        "error:",
                        "failed to",
                        "command not found",
                        "permission denied",
                        "cannot find",
                        "unable to",
                        "missing required",
                        "invalid argument",
                        "enoent",
                        "module not found",
                        "package not found",
                        "syntax error",
                        "connection refused",
                        "timeout",
                        "access denied"
                    ]

                    # 更严格的错误检测：只有明确的错误才认为失败
                    has_error = False
                    for indicator in error_indicators:
                        if indicator.lower() in output_lower:
                            has_error = True
                            break

                    # 修复后的启动成功判断逻辑：
                    # 1. 必须匹配到成功指示符才认为成功
                    # 2. 或者无输出且进程仍在运行（stdio模式）
                    # 3. 有明确错误指示符则认为失败
                    # 4. 进程存活性验证
                    process_alive = process.returncode is None

                    startup_success = (
                        is_success or                                    # 匹配到成功指示符
                        (not output_text.strip() and process_alive)     # 无输出但进程存活（stdio模式）
                    ) and not has_error                                 # 且没有明确错误

                    logger.debug(f"MCP服务器 {server_name} 启动判断: is_success={is_success}, has_output={bool(output_text.strip())}, has_error={has_error}, startup_success={startup_success}")

                    if startup_success:
                        server_status.running = True
                        server_status.consecutive_failures = 0
                        server_status.last_restart_time = datetime.now()
                        server_status.restart_count += 1
                        server_status.error_message = None
                        # 增强的进程信息记录
                        process_info = await self._collect_detailed_process_info(
                            process.pid, cmd, args, output_text
                        )
                        server_status.process_info = process_info

                        logger.info(f"MCP服务器 {server_name} 启动成功 (PID: {process.pid})")
                        if output_text.strip():
                            logger.debug(f"启动输出: {output_text.strip()}")
                        return True
                    else:
                        # 输出中包含错误信息，但进程仍在运行
                        server_status.error_message = output_text or "启动后无输出"
                        logger.error(f"MCP服务器 {server_name} 启动失败: {server_status.error_message}")
                        # 终止进程
                        process.terminate()
                        return False

                except Exception as e:
                    logger.warning(f"读取MCP服务器 {server_name} 启动输出时出错: {e}，假设启动成功")
                    # 如果读取输出出错，但进程仍在运行，假设启动成功
                    server_status.running = True
                    server_status.consecutive_failures = 0
                    server_status.last_restart_time = datetime.now()
                    server_status.restart_count += 1
                    server_status.error_message = None
                    # 增强的进程信息记录（异常情况下的简化版本）
                    process_info = await self._collect_detailed_process_info(
                        process.pid, cmd, args, "启动输出读取异常"
                    )
                    server_status.process_info = process_info

                    logger.info(f"MCP服务器 {server_name} 启动成功 (PID: {process.pid})")
                    return True
            else:
                # 进程已退出，检查输出确定是否为正常退出
                stdout, stderr = await process.communicate()
                stdout_text = stdout.decode() if stdout else ""
                stderr_text = stderr.decode() if stderr else ""
                output_text = stdout_text + stderr_text

                # 检查输出是否包含成功指示符（与上面保持一致）
                success_indicators = [
                    "running on stdio",
                    "mcp server running",
                    "server started",
                    "listening",
                    "registering general tools",
                    "registering solana tools",
                    "amap maps mcp server running on stdio",
                    "maps mcp server running",
                    "looking for .env file",
                    "registering",
                    "initialized",
                    "ready",
                    "started",
                    "loading",
                    "connecting"
                ]

                output_lower = output_text.lower().strip()
                is_success_output = any(indicator.lower() in output_lower for indicator in success_indicators)

                if is_success_output:
                    # 虽然进程退出了，但输出表明启动成功（可能是正常的stdio模式）
                    logger.info(f"MCP服务器 {server_name} 输出成功指示符，认为启动成功")
                    logger.debug(f"成功输出: {output_text}")

                    # 对于stdio模式的服务器，进程退出是正常的
                    server_status.running = True
                    server_status.consecutive_failures = 0
                    server_status.last_restart_time = datetime.now()
                    server_status.restart_count += 1
                    server_status.error_message = None
                    server_status.process_info = {
                        "pid": None,  # 进程已退出
                        "cmd": f"{cmd} {' '.join(args)}",
                        "exit_mode": "stdio"
                    }
                    return True
                elif process.returncode == 0:
                    # 进程正常退出（退出码0），对于MCP服务器通常是正常的
                    logger.info(f"MCP服务器 {server_name} 正常退出（退出码0），认为启动成功（stdio模式）")

                    server_status.running = True
                    server_status.consecutive_failures = 0
                    server_status.last_restart_time = datetime.now()
                    server_status.restart_count += 1
                    server_status.error_message = None
                    server_status.process_info = {
                        "pid": None,  # 进程已退出
                        "cmd": f"{cmd} {' '.join(args)}",
                        "exit_mode": "stdio",
                        "startup_output": output_text[:500] if output_text.strip() else "无输出（stdio模式）"
                    }
                    return True
                else:
                    # 检查是否有明确的错误指示符
                    output_lower = output_text.lower().strip()
                    error_indicators = [
                        "error:", "failed to", "command not found", "permission denied",
                        "cannot find", "unable to", "missing required", "invalid argument",
                        "enoent", "module not found", "package not found", "syntax error",
                        "connection refused", "timeout", "access denied"
                    ]

                    has_clear_error = any(indicator in output_lower for indicator in error_indicators)

                    if has_clear_error or process.returncode > 1:
                        # 真正的启动失败：有明确错误或异常退出码
                        error_msg = output_text.strip() if output_text.strip() else f"进程异常退出，退出码: {process.returncode}"
                        server_status.error_message = error_msg
                        logger.error(f"MCP服务器 {server_name} 启动失败: {error_msg}")
                        logger.debug(f"MCP服务器 {server_name} 完整输出: stdout='{stdout_text}', stderr='{stderr_text}'")
                        return False
                    else:
                        # 非零退出码但无明确错误，可能是正常的MCP服务器行为
                        logger.info(f"MCP服务器 {server_name} 退出码 {process.returncode}，但无明确错误，认为启动成功")
                        server_status.running = True
                        server_status.consecutive_failures = 0
                        server_status.last_restart_time = datetime.now()
                        server_status.restart_count += 1
                        server_status.error_message = None
                        server_status.process_info = {
                            "pid": None,
                            "cmd": f"{cmd} {' '.join(args)}",
                            "exit_mode": "normal",
                            "exit_code": process.returncode,
                            "startup_output": output_text[:500] if output_text.strip() else "无输出"
                        }
                        return True

        except Exception as e:
            server_status.error_message = str(e)
            logger.error(f"启动MCP服务器 {server_name} 时发生异常: {e}")
            return False

    async def check_server_health(self, server_name: str) -> bool:
        """检查服务器健康状态（增强版）"""
        try:
            server_status = self.servers[server_name]

            if not server_status.process_info:
                return False

            # 检查是否是stdio模式的服务器
            exit_mode = server_status.process_info.get("exit_mode")
            if exit_mode == "stdio":
                # stdio模式的服务器被认为是健康的（它们正常退出等待stdio输入）
                return True

            pid = server_status.process_info.get("pid")
            if not pid:
                return False

            # 使用增强的进程健康检查
            return await self._verify_process_health(server_name, pid)

        except Exception as e:
            logger.error(f"检查服务器 {server_name} 健康状态时发生异常: {e}")
            return False

    async def _verify_process_health(self, server_name: str, pid: int) -> bool:
        """验证进程健康状态（任务6：增强进程健康检查）"""
        try:
            # 1. 基础进程存在检查
            if not self._check_process_exists(pid):
                logger.warning(f"进程 {pid} (服务器: {server_name}) 不存在")
                return False

            # 2. 僵尸进程检测
            if self._is_zombie_process(pid):
                logger.warning(f"检测到僵尸进程 {pid} (服务器: {server_name})")
                await self._cleanup_zombie_process(server_name, pid)
                return False

            # 3. 进程资源使用监控
            resource_healthy = await self._check_process_resources(server_name, pid)
            if not resource_healthy:
                logger.warning(f"进程 {pid} (服务器: {server_name}) 资源使用异常")
                return False

            # 4. 进程响应性检查（ping机制）
            responsive = await self._ping_process(server_name, pid)
            if not responsive:
                logger.warning(f"进程 {pid} (服务器: {server_name}) 无响应")
                return False

            return True

        except Exception as e:
            logger.error(f"验证进程健康状态时出错 {server_name} (PID: {pid}): {e}")
            return False

    def _check_process_exists(self, pid: int) -> bool:
        """检查进程是否存在"""
        try:
            os.kill(pid, 0)  # 发送信号0检查进程是否存在
            return True
        except OSError:
            return False

    def _is_zombie_process(self, pid: int) -> bool:
        """检测僵尸进程"""
        try:
            process = psutil.Process(pid)
            return process.status() == psutil.STATUS_ZOMBIE
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False

    async def _cleanup_zombie_process(self, server_name: str, pid: int):
        """清理僵尸进程"""
        try:
            logger.info(f"清理僵尸进程 {pid} (服务器: {server_name})")

            # 尝试获取父进程并发送SIGCHLD信号
            try:
                process = psutil.Process(pid)
                parent = process.parent()
                if parent:
                    parent.send_signal(signal.SIGCHLD)
                    logger.debug(f"向父进程 {parent.pid} 发送SIGCHLD信号")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

            # 更新服务器状态
            server_status = self.servers[server_name]
            server_status.running = False
            server_status.process_info = None
            server_status.error_message = f"检测到僵尸进程 {pid}，已清理"

            # 同步清理MCP客户端包装器的状态
            await self._sync_client_wrapper_state(server_name, pid)

        except Exception as e:
            logger.error(f"清理僵尸进程时出错 {server_name} (PID: {pid}): {e}")

    async def _sync_client_wrapper_state(self, server_name: str, pid: int):
        """
        同步MCP客户端包装器的状态

        当MCP管理器清理进程状态时，同步清理客户端包装器中的缓存状态，
        防止状态不一致导致的连接复用问题

        Args:
            server_name: 服务器名称
            pid: 进程ID
        """
        try:
            # 导入MCP客户端包装器
            from app.utils.mcp_client import mcp_client

            # 清理客户端包装器中的进程记录
            if hasattr(mcp_client, '_managed_processes') and server_name in mcp_client._managed_processes:
                cached_pid = mcp_client._managed_processes[server_name].get('pid')
                if cached_pid == pid:
                    del mcp_client._managed_processes[server_name]
                    logger.info(f"已同步清理客户端包装器中的进程记录: {server_name} (PID: {pid})")

            # 清理客户端包装器中的连接池
            if hasattr(mcp_client, '_connection_pool') and server_name in mcp_client._connection_pool:
                await mcp_client._cleanup_connection(server_name)
                logger.info(f"已同步清理客户端包装器中的连接: {server_name}")

        except Exception as e:
            logger.warning(f"同步客户端包装器状态时出错 {server_name} (PID: {pid}): {e}")

    async def _check_process_resources(self, server_name: str, pid: int) -> bool:
        """检查进程资源使用情况"""
        try:
            process = psutil.Process(pid)

            # 获取进程资源使用情况
            cpu_percent = process.cpu_percent(interval=0.1)
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()

            # 资源使用阈值（可配置）
            max_cpu_percent = 90.0  # CPU使用率超过90%认为异常
            max_memory_mb = 1024    # 内存使用超过1GB认为异常
            max_memory_percent = 80.0  # 内存使用率超过80%认为异常

            # 检查CPU使用率
            if cpu_percent > max_cpu_percent:
                logger.warning(f"进程 {pid} (服务器: {server_name}) CPU使用率过高: {cpu_percent:.1f}%")
                return False

            # 检查内存使用
            memory_mb = memory_info.rss / 1024 / 1024
            if memory_mb > max_memory_mb or memory_percent > max_memory_percent:
                logger.warning(f"进程 {pid} (服务器: {server_name}) 内存使用过高: {memory_mb:.1f}MB ({memory_percent:.1f}%)")
                return False

            # 记录正常的资源使用情况（调试级别）
            logger.debug(f"进程 {pid} (服务器: {server_name}) 资源使用正常: CPU {cpu_percent:.1f}%, 内存 {memory_mb:.1f}MB ({memory_percent:.1f}%)")

            return True

        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            logger.warning(f"无法获取进程 {pid} (服务器: {server_name}) 资源信息: {e}")
            return False
        except Exception as e:
            logger.error(f"检查进程资源时出错 {server_name} (PID: {pid}): {e}")
            return False

    async def _ping_process(self, server_name: str, pid: int) -> bool:
        """ping进程检查响应性"""
        try:
            # 对于MCP服务器，我们通过检查进程状态和文件描述符来判断响应性
            process = psutil.Process(pid)

            # 检查进程状态
            status = process.status()
            if status in [psutil.STATUS_STOPPED, psutil.STATUS_TRACING_STOP]:
                logger.warning(f"进程 {pid} (服务器: {server_name}) 处于停止状态: {status}")
                return False

            # 检查进程是否有活跃的文件描述符（表明正在处理I/O）
            try:
                connections = process.connections()
                open_files = process.open_files()

                # 对于MCP服务器，通常会有stdio连接或文件操作
                if len(connections) == 0 and len(open_files) <= 3:  # 只有stdin, stdout, stderr
                    # 这可能表明进程没有活跃的I/O，但对于stdio模式的MCP服务器这是正常的
                    logger.debug(f"进程 {pid} (服务器: {server_name}) 文件描述符较少，可能为stdio模式")

            except (psutil.AccessDenied, psutil.NoSuchProcess):
                # 无法访问文件描述符信息，但进程存在，认为是响应的
                pass

            # 检查进程创建时间，如果刚创建不久，给予更多时间
            create_time = process.create_time()
            current_time = time.time()
            if current_time - create_time < 30:  # 30秒内的新进程
                logger.debug(f"进程 {pid} (服务器: {server_name}) 是新创建的进程，跳过响应性检查")
                return True

            return True

        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            logger.warning(f"无法ping进程 {pid} (服务器: {server_name}): {e}")
            return False
        except Exception as e:
            logger.error(f"ping进程时出错 {server_name} (PID: {pid}): {e}")
            return False

    async def _collect_detailed_process_info(self, pid: int, cmd: str, args: list, startup_output: str) -> dict:
        """
        收集详细的进程信息，用于增强进程跟踪

        Args:
            pid: 进程ID
            cmd: 启动命令
            args: 命令参数
            startup_output: 启动输出

        Returns:
            dict: 详细的进程信息
        """
        process_info = {
            "pid": pid,
            "cmd": f"{cmd} {' '.join(args)}",
            "startup_output": startup_output[:500] if startup_output else "",
            "start_time": datetime.now().isoformat(),
            "parent_pid": None,
            "children_pids": [],
            "cpu_percent": 0.0,
            "memory_mb": 0.0,
            "memory_percent": 0.0,
            "open_files": 0,
            "connections": 0,
            "status": "unknown",
            "cwd": None,
            "environ": {},
            "cmdline": [],
            "create_time": None,
            "num_threads": 0
        }

        try:
            # 使用 psutil 收集详细进程信息
            process = psutil.Process(pid)

            # 基本信息
            process_info.update({
                "parent_pid": process.ppid(),
                "status": process.status(),
                "cwd": process.cwd(),
                "cmdline": process.cmdline(),
                "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
                "num_threads": process.num_threads()
            })

            # 资源使用情况
            try:
                cpu_percent = process.cpu_percent(interval=0.1)
                memory_info = process.memory_info()
                memory_percent = process.memory_percent()

                process_info.update({
                    "cpu_percent": cpu_percent,
                    "memory_mb": memory_info.rss / 1024 / 1024,  # 转换为MB
                    "memory_percent": memory_percent
                })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                logger.debug(f"无法获取进程 {pid} 的资源使用信息")

            # 文件和连接信息
            try:
                open_files = len(process.open_files())
                connections = len(process.connections())

                process_info.update({
                    "open_files": open_files,
                    "connections": connections
                })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                logger.debug(f"无法获取进程 {pid} 的文件和连接信息")

            # 环境变量（仅收集关键的MCP相关变量）
            try:
                environ = process.environ()
                mcp_env = {}
                for key, value in environ.items():
                    if any(keyword in key.upper() for keyword in ['MCP', 'PATH', 'PYTHON', 'NODE']):
                        mcp_env[key] = value[:100]  # 限制长度
                process_info["environ"] = mcp_env
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                logger.debug(f"无法获取进程 {pid} 的环境变量")

            # 子进程信息
            try:
                children = process.children(recursive=False)
                process_info["children_pids"] = [child.pid for child in children]
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                logger.debug(f"无法获取进程 {pid} 的子进程信息")

        except psutil.NoSuchProcess:
            logger.warning(f"进程 {pid} 不存在，无法收集详细信息")
            process_info["status"] = "not_found"
        except psutil.AccessDenied:
            logger.warning(f"无权限访问进程 {pid}，使用基本信息")
            process_info["status"] = "access_denied"
        except Exception as e:
            logger.error(f"收集进程 {pid} 详细信息时发生异常: {e}")
            process_info["status"] = "error"
            process_info["error"] = str(e)

        return process_info

    async def update_process_tracking_info(self, server_name: str) -> bool:
        """
        更新指定服务器的进程跟踪信息

        Args:
            server_name: 服务器名称

        Returns:
            bool: 更新是否成功
        """
        try:
            server_status = self.servers.get(server_name)
            if not server_status or not server_status.process_info:
                return False

            pid = server_status.process_info.get("pid")
            if not pid:
                return False

            # 更新进程信息
            try:
                process = psutil.Process(pid)

                # 更新资源使用情况
                cpu_percent = process.cpu_percent(interval=0.1)
                memory_info = process.memory_info()
                memory_percent = process.memory_percent()

                server_status.process_info.update({
                    "cpu_percent": cpu_percent,
                    "memory_mb": memory_info.rss / 1024 / 1024,
                    "memory_percent": memory_percent,
                    "status": process.status(),
                    "num_threads": process.num_threads(),
                    "last_updated": datetime.now().isoformat()
                })

                # 更新子进程信息
                try:
                    children = process.children(recursive=False)
                    server_status.process_info["children_pids"] = [child.pid for child in children]
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass

                return True

            except psutil.NoSuchProcess:
                logger.warning(f"进程 {pid} (服务器: {server_name}) 不存在，标记为已停止")
                server_status.process_info["status"] = "not_found"
                server_status.running = False
                return False
            except Exception as e:
                logger.error(f"更新进程 {pid} (服务器: {server_name}) 跟踪信息时出错: {e}")
                return False

        except Exception as e:
            logger.error(f"更新服务器 {server_name} 进程跟踪信息时出错: {e}")
            return False

    def get_process_tree_info(self, server_name: str) -> dict:
        """
        获取指定服务器的完整进程树信息

        Args:
            server_name: 服务器名称

        Returns:
            dict: 进程树信息
        """
        tree_info = {
            "server_name": server_name,
            "root_process": None,
            "process_tree": [],
            "total_processes": 0,
            "total_memory_mb": 0.0,
            "total_cpu_percent": 0.0
        }

        try:
            server_status = self.servers.get(server_name)
            if not server_status or not server_status.process_info:
                return tree_info

            root_pid = server_status.process_info.get("pid")
            if not root_pid:
                return tree_info

            tree_info["root_process"] = server_status.process_info.copy()

            # 递归收集进程树
            def collect_process_tree(pid, level=0):
                try:
                    process = psutil.Process(pid)

                    process_data = {
                        "pid": pid,
                        "level": level,
                        "name": process.name(),
                        "cmdline": process.cmdline(),
                        "status": process.status(),
                        "cpu_percent": process.cpu_percent(interval=0.1),
                        "memory_mb": process.memory_info().rss / 1024 / 1024,
                        "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
                        "children": []
                    }

                    tree_info["process_tree"].append(process_data)
                    tree_info["total_processes"] += 1
                    tree_info["total_memory_mb"] += process_data["memory_mb"]
                    tree_info["total_cpu_percent"] += process_data["cpu_percent"]

                    # 递归处理子进程
                    children = process.children(recursive=False)
                    for child in children:
                        child_data = collect_process_tree(child.pid, level + 1)
                        if child_data:
                            process_data["children"].append(child_data["pid"])

                    return process_data

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return None

            collect_process_tree(root_pid)

        except Exception as e:
            logger.error(f"获取服务器 {server_name} 进程树信息时出错: {e}")

        return tree_info

    async def handle_server_failure(self, server_name: str):
        """处理服务器失败

        当检测到服务器失败时，立即清理相关的孤儿进程，
        然后尝试重启服务器
        """
        server_status = self.servers[server_name]
        server_status.running = False
        server_status.consecutive_failures += 1

        logger.warning(f"检测到服务器 {server_name} 失败 (连续失败次数: {server_status.consecutive_failures})")

        # 立即清理相关的孤儿进程，防止进程泄漏
        logger.info(f"服务器 {server_name} 失败，立即清理相关孤儿进程")
        try:
            await self.cleanup_orphaned_mcp_processes()
        except Exception as e:
            logger.error(f"清理孤儿进程时出错: {e}")

        # 检查是否达到最大连续失败次数
        if server_status.consecutive_failures >= self.max_consecutive_failures:
            server_status.marked_failed = True
            logger.error(f"服务器 {server_name} 连续失败 {self.max_consecutive_failures} 次，已标记为失败，不再尝试重启")
            return

        # 尝试重启（使用强制重启确保清理干净）
        logger.info(f"尝试重启服务器 {server_name} (第 {server_status.consecutive_failures} 次失败)")
        success = await self.start_server(server_name, force_restart=True)

        if not success:
            logger.error(f"重启服务器 {server_name} 失败")
        else:
            logger.info(f"服务器 {server_name} 重启成功")

    async def start_all_servers(self):
        """启动所有启用的MCP服务器（带全局锁防止重复启动）"""
        # 使用全局锁防止多个实例同时启动所有服务器
        async with self._global_startup_lock:
            logger.info("开始启动所有MCP服务器...")

            # 首先清理可能存在的孤儿进程
            try:
                await self.cleanup_orphaned_mcp_processes()
                logger.info("清理孤儿进程完成")
            except Exception as e:
                logger.warning(f"清理孤儿进程时出错: {e}")

            tasks = []
            for server_name, server_status in self.servers.items():
                if server_status.enabled and not server_status.marked_failed:
                    task = asyncio.create_task(self.start_server(server_name))
                    tasks.append((server_name, task))

            # 等待所有启动任务完成
            for server_name, task in tasks:
                try:
                    success = await task
                    if success:
                        logger.info(f"✅ 服务器 {server_name} 启动成功")

                        # 启动成功后，记录日志
                        logger.info(f"服务器 {server_name} 启动完成，进程管理就绪")
                    else:
                        logger.error(f"❌ 服务器 {server_name} 启动失败")
                except Exception as e:
                    logger.error(f"❌ 服务器 {server_name} 启动异常: {e}")

            logger.info("所有MCP服务器启动完成")

    async def monitor_servers(self):
        """监控所有服务器状态"""
        logger.info(f"开始监控MCP服务器，检查间隔: {self.check_interval}秒")

        # 历史遗留进程清理计数器（每6个监控周期执行一次清理，约每2分钟）
        cleanup_counter = 0
        cleanup_interval = 6

        while True:
            try:
                for server_name, server_status in self.servers.items():
                    if not server_status.enabled or server_status.marked_failed:
                        continue

                    server_status.last_check = datetime.now()

                    if server_status.running:
                        # 检查健康状态
                        is_healthy = await self.check_server_health(server_name)
                        if not is_healthy:
                            await self.handle_server_failure(server_name)
                    else:
                        # 服务器未运行，尝试启动
                        if not server_status.marked_failed:
                            await self.start_server(server_name)

                # 定期清理历史遗留进程和僵尸进程
                cleanup_counter += 1
                if cleanup_counter >= cleanup_interval:
                    cleanup_counter = 0
                    logger.debug("执行定期进程清理")

                    # 清理僵尸进程
                await self._cleanup_zombie_processes()

                # 清理历史遗留的MCP进程
                await self.cleanup_orphaned_mcp_processes()

                # 进程泄漏监控和自动处理（每5个周期执行一次）
                if cleanup_counter % 5 == 0:
                    try:
                        monitor_result = await self.monitor_process_leaks()
                        if monitor_result.get('alerts'):
                            logger.info(f"检测到进程泄漏问题，开始自动处理")
                            await self.auto_handle_process_leaks(monitor_result)
                    except Exception as e:
                        logger.error(f"进程泄漏监控和处理时出错: {e}")

                # 更新进程跟踪信息（每3个周期执行一次）
                if cleanup_counter % 3 == 0:
                    try:
                        for server_name, server_status in self.servers.items():
                            if server_status.running and server_status.process_info:
                                await self.update_process_tracking_info(server_name)
                    except Exception as e:
                        logger.error(f"更新进程跟踪信息时出错: {e}")

                await asyncio.sleep(self.check_interval)

            except Exception as e:
                logger.error(f"监控服务器时发生异常: {e}")
                await asyncio.sleep(self.check_interval)

    async def start_monitoring(self):
        """开始监控"""
        if self.monitoring_task and not self.monitoring_task.done():
            logger.warning("监控任务已在运行")
            return

        self.monitoring_task = asyncio.create_task(self.monitor_servers())
        logger.info("MCP服务器监控已启动")

    async def stop_monitoring(self):
        """停止监控"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
            logger.info("MCP服务器监控已停止")

    def get_server_status(self, server_name: str = None) -> Union[Dict[str, Dict[str, Any]], MCPServerStatus]:
        """获取服务器状态

        Args:
            server_name: 服务器名称，如果为None则返回所有服务器状态

        Returns:
            如果指定server_name，返回MCPServerStatus对象
            如果server_name为None，返回所有服务器状态的字典
        """
        if server_name is not None:
            if server_name not in self.servers:
                raise ValueError(f"服务器 '{server_name}' 不存在")
            return self.servers[server_name]

        # 返回所有服务器状态
        status = {}
        for name, server_status in self.servers.items():
            status[name] = {
                "enabled": server_status.enabled,
                "running": server_status.running,
                "restart_count": server_status.restart_count,
                "consecutive_failures": server_status.consecutive_failures,
                "marked_failed": server_status.marked_failed,
                "last_check": server_status.last_check.isoformat() if server_status.last_check else None,
                "last_restart_time": server_status.last_restart_time.isoformat() if server_status.last_restart_time else None,
                "error_message": server_status.error_message,
                "process_info": server_status.process_info
            }
        return status

    def reset_server_failures(self, server_name: str) -> bool:
        """重置服务器失败状态（手动干预）"""
        if server_name not in self.servers:
            return False

        server_status = self.servers[server_name]
        server_status.consecutive_failures = 0
        server_status.marked_failed = False
        server_status.error_message = None

        logger.info(f"已重置服务器 {server_name} 的失败状态")
        return True

    async def ensure_server_running(self, server_name: str, connect_only: bool = False) -> Dict[str, Any]:
        """
        确保指定的MCP服务器正在运行（客户端协调接口）

        这是第二阶段新增的协调接口，用于MCPClientWrapper请求启动服务

        Args:
            server_name: 服务器名称
            connect_only: 如果为True，仅尝试连接现有服务器，不启动新服务器（绕过冷却期限制）

        Returns:
            Dict[str, Any]: 包含启动结果和服务器信息的字典
                - success: bool, 是否成功
                - running: bool, 服务器是否正在运行
                - pid: Optional[int], 进程ID
                - message: str, 状态消息
                - error: Optional[str], 错误信息
        """
        try:
            if server_name not in self.server_configs:
                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器配置不存在: {server_name}",
                    "error": "CONFIG_NOT_FOUND"
                }

            server_status = self.servers[server_name]

            # 检查服务器是否被标记为失败（仅连接模式时忽略失败标记）
            if server_status.marked_failed and not connect_only:
                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器已被标记为失败: {server_name}",
                    "error": "SERVER_MARKED_FAILED"
                }

            # 检查进程是否已经在运行
            config = self.server_configs[server_name]
            existing_pid = await self._check_process_uniqueness(server_name, config)

            if existing_pid:
                # 状态同步检查点：确保状态与实际进程一致
                server_status.running = True
                server_status.consecutive_failures = 0
                server_status.error_message = None
                server_status.last_check = datetime.now()
                server_status.process_info = {
                    "pid": existing_pid,
                    "cmd": f"{config['command']} {' '.join(config.get('args', []))}",
                    "startup_output": "发现现有进程，状态已同步"
                }

                logger.debug(f"状态同步: 服务器 {server_name} 进程存在 (PID: {existing_pid})，状态已更新")

                return {
                    "success": True,
                    "running": True,
                    "pid": existing_pid,
                    "message": f"服务器已在运行: {server_name}",
                    "error": None
                }

            # 如果是仅连接模式且没有现有进程，直接返回
            if connect_only:
                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器未运行且仅连接模式: {server_name}",
                    "error": "SERVER_NOT_RUNNING"
                }

            # 尝试启动服务器
            logger.info(f"客户端请求启动MCP服务器: {server_name}")

            # 检查是否在冷却期，如果是客户端请求，可以尝试强制启动
            if self._is_server_in_cooldown(server_name):
                cooldown_info = self._get_server_cooldown_info(server_name)
                logger.info(f"服务器 {server_name} 在冷却期内（剩余 {cooldown_info.get('remaining', 0):.1f} 秒），"
                           f"但这是客户端请求，尝试强制启动")
                start_success = await self.start_server(server_name, force_restart=True)
            else:
                start_success = await self.start_server(server_name)

            if start_success:
                # 先更新状态，确保状态一致
                server_status.running = True
                server_status.last_check = datetime.now()
                server_status.consecutive_failures = 0
                server_status.error_message = None

                # 状态同步验证：确保启动后状态一致
                new_pid = await self._check_process_uniqueness(server_name, config)

                # 验证状态同步
                if new_pid:
                    logger.debug(f"状态同步验证通过: 服务器 {server_name} 启动成功且状态一致 (PID: {new_pid})")
                    return {
                        "success": True,
                        "running": True,
                        "pid": new_pid,
                        "message": f"服务器启动成功: {server_name}",
                        "error": None
                    }
                else:
                    # stdio模式服务器：状态为运行但无PID
                    logger.debug(f"状态同步: 服务器 {server_name} 为stdio模式，状态正常")
                    return {
                        "success": True,
                        "running": True,
                        "pid": None,
                        "message": f"服务器启动成功 (stdio模式): {server_name}",
                        "error": None
                    }
            else:
                # 启动失败，确保状态一致
                server_status.running = False
                server_status.consecutive_failures += 1
                server_status.last_check = datetime.now()
                logger.debug(f"状态同步: 服务器 {server_name} 启动失败，状态已更新")

                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器启动失败: {server_name}",
                    "error": "START_FAILED"
                }

        except Exception as e:
            logger.error(f"确保服务器运行时出错 {server_name}: {e}")
            return {
                "success": False,
                "running": False,
                "pid": None,
                "message": f"启动服务器时发生异常: {str(e)}",
                "error": "EXCEPTION"
            }

    async def _cleanup_zombie_processes(self):
        """清理所有僵尸进程（任务8：进程生命周期管理）"""
        try:
            logger.info("开始清理僵尸进程")
            cleaned_count = 0

            for server_name, server_status in self.servers.items():
                if not server_status.process_info:
                    continue

                pid = server_status.process_info.get("pid")
                if not pid:
                    continue

                if self._is_zombie_process(pid):
                    await self._cleanup_zombie_process(server_name, pid)
                    cleaned_count += 1

            # 额外清理系统中的MCP相关僵尸进程
            system_zombie_count = await self._cleanup_system_zombie_processes()
            cleaned_count += system_zombie_count

            if cleaned_count > 0:
                logger.info(f"清理了 {cleaned_count} 个僵尸进程")
            else:
                logger.debug("未发现僵尸进程")

        except Exception as e:
            logger.error(f"清理僵尸进程时出错: {e}")

    async def _cleanup_system_zombie_processes(self) -> int:
        """清理系统中的MCP相关僵尸进程

        专门用于清理系统中所有MCP相关的僵尸进程，
        不仅限于当前管理器跟踪的进程

        Returns:
            int: 清理的僵尸进程数量
        """
        try:
            zombie_count = 0

            for proc in psutil.process_iter(['pid', 'cmdline', 'status']):
                try:
                    # 检查是否为僵尸进程且与MCP相关
                    if (proc.info['status'] in [psutil.STATUS_ZOMBIE, psutil.STATUS_DEAD] and
                        proc.info['cmdline'] and
                        self._is_mcp_related_process(proc.info['cmdline'])):

                        pid = proc.info['pid']
                        logger.debug(f"发现MCP僵尸进程: {pid}")

                        try:
                            # 尝试等待僵尸进程
                            os.waitpid(pid, os.WNOHANG)
                            zombie_count += 1
                            logger.debug(f"清理僵尸进程 {pid} 成功")
                        except (OSError, ChildProcessError):
                            # 进程可能已被其他方式清理或不是子进程
                            pass

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            if zombie_count > 0:
                logger.info(f"清理了 {zombie_count} 个系统MCP僵尸进程")
            else:
                logger.debug("未发现需要清理的系统MCP僵尸进程")

            return zombie_count

        except Exception as e:
            logger.error(f"清理系统僵尸进程时出错: {e}")
            return 0

    async def cleanup_orphaned_mcp_processes(self):
        """清理历史遗留的MCP进程（增强进程监控机制）

        检测并清理不在当前管理器跟踪范围内的MCP相关进程，
        这些进程可能是之前启动但未正确关闭的历史遗留进程。
        """
        try:
            logger.info("开始扫描历史遗留的MCP进程")
            orphaned_processes = []
            managed_pids = set()

            # 收集当前管理的所有PID
            for server_status in self.servers.values():
                if server_status.process_info and server_status.process_info.get("pid"):
                    managed_pids.add(server_status.process_info["pid"])

            # 扫描所有进程，查找MCP相关进程
            for proc in psutil.process_iter(['pid', 'cmdline', 'create_time']):
                try:
                    pid = proc.info['pid']
                    cmdline = proc.info['cmdline']

                    # 跳过已管理的进程
                    if pid in managed_pids:
                        continue

                    # 检查是否为MCP相关进程
                    if self._is_mcp_related_process(cmdline):
                        create_time = datetime.fromtimestamp(proc.info['create_time'])
                        orphaned_processes.append({
                            'pid': pid,
                            'cmdline': cmdline,
                            'create_time': create_time,
                            'age_hours': (datetime.now() - create_time).total_seconds() / 3600
                        })

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            if not orphaned_processes:
                logger.debug("未发现历史遗留的MCP进程")
                return

            logger.info(f"发现 {len(orphaned_processes)} 个历史遗留的MCP进程")

            # 智能分级清理策略
            cleaned_count = 0

            # 按年龄分组进行清理
            very_old_processes = [p for p in orphaned_processes if p['age_hours'] > 6.0]  # 超过6小时
            old_processes = [p for p in orphaned_processes if 2.0 < p['age_hours'] <= 6.0]  # 2-6小时
            recent_processes = [p for p in orphaned_processes if 0.5 < p['age_hours'] <= 2.0]  # 30分钟-2小时

            # 第一优先级：清理超过6小时的进程（无条件清理）
            for proc_info in very_old_processes:
                try:
                    logger.warning(f"清理超时MCP进程 PID:{proc_info['pid']}, "
                                 f"运行时间:{proc_info['age_hours']:.1f}小时, "
                                 f"命令:{' '.join(proc_info['cmdline'][:3])}...")

                    # 直接使用进程树清理，确保彻底清理
                    cleanup_success = await self._cleanup_process_tree(proc_info['pid'], f"orphaned-{proc_info['pid']}")
                    if cleanup_success:
                        cleaned_count += 1
                        logger.info(f"成功清理超时进程 {proc_info['pid']}")

                except Exception as e:
                    logger.error(f"清理超时进程 {proc_info['pid']} 时出错: {e}")

            # 第二优先级：清理2-6小时的进程（检查资源使用）
            for proc_info in old_processes:
                try:
                    process = psutil.Process(proc_info['pid'])

                    # 检查进程资源使用情况
                    cpu_percent = process.cpu_percent(interval=1)
                    memory_info = process.memory_info()
                    memory_mb = memory_info.rss / 1024 / 1024

                    # 如果进程占用资源过高或长时间无活动，则清理
                    should_cleanup = (
                        cpu_percent > 50.0 or  # CPU使用率超过50%
                        memory_mb > 500 or     # 内存使用超过500MB
                        proc_info['age_hours'] > 4.0  # 运行超过4小时
                    )

                    if should_cleanup:
                        logger.info(f"清理高资源占用MCP进程 PID:{proc_info['pid']}, "
                                  f"CPU:{cpu_percent:.1f}%, 内存:{memory_mb:.1f}MB, "
                                  f"运行时间:{proc_info['age_hours']:.1f}小时")

                        cleanup_success = await self._cleanup_process_tree(proc_info['pid'], f"high-resource-{proc_info['pid']}")
                        if cleanup_success:
                            cleaned_count += 1
                    else:
                        logger.debug(f"保留正常运行的MCP进程 PID:{proc_info['pid']}, "
                                   f"CPU:{cpu_percent:.1f}%, 内存:{memory_mb:.1f}MB")

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    logger.error(f"检查进程 {proc_info['pid']} 资源使用时出错: {e}")

            # 第三优先级：谨慎处理较新的进程（仅在异常情况下清理）
            for proc_info in recent_processes:
                try:
                    process = psutil.Process(proc_info['pid'])

                    # 检查是否为僵尸进程或异常状态
                    if process.status() in [psutil.STATUS_ZOMBIE, psutil.STATUS_DEAD]:
                        logger.info(f"清理僵尸MCP进程 PID:{proc_info['pid']}, "
                                  f"状态:{process.status()}, 运行时间:{proc_info['age_hours']:.1f}小时")

                        cleanup_success = await self._cleanup_process_tree(proc_info['pid'], f"zombie-{proc_info['pid']}")
                        if cleanup_success:
                            cleaned_count += 1
                    else:
                        logger.debug(f"保留较新的MCP进程 PID:{proc_info['pid']}, "
                                   f"运行时间:{proc_info['age_hours']:.1f}小时")

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    logger.error(f"检查较新进程 {proc_info['pid']} 时出错: {e}")

            if cleaned_count > 0:
                logger.info(f"成功清理了 {cleaned_count} 个历史遗留的MCP进程")

                # 同步清理MCP客户端包装器的状态
                try:
                    from app.utils.mcp_client import mcp_client_wrapper
                    await mcp_client_wrapper.cleanup_dead_processes()
                    logger.debug("已同步清理MCP客户端包装器的状态")
                except Exception as sync_error:
                    logger.warning(f"同步清理客户端包装器状态时出错: {sync_error}")

        except Exception as e:
            logger.error(f"清理历史遗留MCP进程时出错: {e}")

    def _is_mcp_related_process(self, cmdline: list) -> bool:
        """判断进程是否为MCP相关进程

        使用精确的进程识别逻辑，避免误识别无关进程

        Args:
            cmdline: 进程命令行参数列表

        Returns:
            bool: 如果是MCP相关进程返回True
        """
        if not cmdline:
            return False

        cmdline_str = ' '.join(cmdline).lower()

        # 从配置文件动态生成MCP服务器识别模式
        mcp_patterns = self._generate_mcp_patterns()

        # 检查是否匹配任何已知的MCP模式
        for pattern in mcp_patterns:
            if pattern in cmdline_str:
                return True

        # 额外检查：npm exec 启动的MCP相关进程
        if 'npm exec' in cmdline_str and any(mcp_term in cmdline_str for mcp_term in ['mcp', 'playwright', 'amap', 'minimax', 'web3']):
            return True

        return False

    async def _cleanup_process_tree(self, root_pid: int, server_name: str) -> bool:
        """清理整个进程树

        递归清理指定进程及其所有子进程，确保没有遗留进程

        Args:
            root_pid: 根进程PID
            server_name: 服务器名称（用于日志）

        Returns:
            bool: 清理是否成功
        """
        try:
            # 获取进程树中的所有进程
            processes_to_kill = []

            def collect_process_tree(pid):
                """递归收集进程树中的所有进程"""
                try:
                    parent = psutil.Process(pid)
                    processes_to_kill.append(parent)

                    # 递归收集子进程
                    for child in parent.children(recursive=True):
                        processes_to_kill.append(child)

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # 收集所有需要清理的进程
            collect_process_tree(root_pid)

            if not processes_to_kill:
                logger.info(f"服务器 {server_name} 的进程 {root_pid} 已不存在")
                return True

            logger.info(f"服务器 {server_name} 需要清理 {len(processes_to_kill)} 个进程")

            # 第一阶段：优雅终止所有进程
            for process in processes_to_kill:
                try:
                    if process.is_running():
                        process.terminate()
                        logger.debug(f"向进程 {process.pid} 发送SIGTERM信号")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            # 等待进程优雅退出
            await asyncio.sleep(3)

            # 第二阶段：强制杀死仍在运行的进程
            remaining_processes = []
            for process in processes_to_kill:
                try:
                    if process.is_running():
                        remaining_processes.append(process)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            if remaining_processes:
                logger.warning(f"服务器 {server_name} 有 {len(remaining_processes)} 个进程未优雅退出，强制终止")
                for process in remaining_processes:
                    try:
                        if process.is_running():
                            process.kill()
                            logger.debug(f"强制终止进程 {process.pid}")
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue

                # 等待强制终止完成
                await asyncio.sleep(2)

            # 验证清理结果
            still_running = []
            for process in processes_to_kill:
                try:
                    if process.is_running():
                        still_running.append(process.pid)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            if still_running:
                logger.error(f"服务器 {server_name} 仍有进程未能清理: {still_running}")
                return False

            logger.info(f"服务器 {server_name} 进程树清理完成")

            # 同步清理MCP客户端包装器的状态
            await self._sync_client_wrapper_state(server_name, root_pid)

            return True

        except Exception as e:
            logger.error(f"清理服务器 {server_name} 进程树时出错: {e}")
            return False

    async def _graceful_shutdown(self, server_name: str = None, timeout: int = 30) -> bool:
        """优雅关闭MCP服务器（任务8：进程生命周期管理）"""
        try:
            if server_name:
                # 关闭指定服务器
                return await self._shutdown_single_server(server_name, timeout)
            else:
                # 关闭所有服务器
                return await self._shutdown_all_servers(timeout)

        except Exception as e:
            logger.error(f"优雅关闭时出错: {e}")
            return False

    async def _shutdown_single_server(self, server_name: str, timeout: int) -> bool:
        """优雅关闭单个服务器

        使用进程树清理机制，确保彻底清理所有相关进程，
        包括主进程和所有子进程
        """
        try:
            if server_name not in self.servers:
                logger.warning(f"服务器 {server_name} 不存在")
                return False

            server_status = self.servers[server_name]
            if not server_status.running or not server_status.process_info:
                logger.info(f"服务器 {server_name} 未运行，无需关闭")
                return True

            pid = server_status.process_info.get("pid")
            if not pid:
                logger.info(f"服务器 {server_name} 无PID信息，可能为stdio模式")
                server_status.running = False
                return True

            logger.info(f"开始优雅关闭服务器 {server_name} (PID: {pid})")

            # 使用进程树清理机制，确保彻底清理所有相关进程
            try:
                cleanup_success = await self._cleanup_process_tree(pid, server_name)
                if cleanup_success:
                    logger.info(f"服务器 {server_name} 进程树清理成功")
                    server_status.running = False
                    server_status.process_info = None
                    return True
                else:
                    logger.error(f"服务器 {server_name} 进程树清理失败")
                    return False

            except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                logger.warning(f"关闭服务器 {server_name} 时进程访问异常: {e}")
                server_status.running = False
                server_status.process_info = None
                return True

        except Exception as e:
            logger.error(f"关闭服务器 {server_name} 时出错: {e}")
            return False

    async def _shutdown_all_servers(self, timeout: int) -> bool:
        """优雅关闭所有服务器"""
        try:
            logger.info("开始优雅关闭所有MCP服务器")

            # 停止监控任务
            await self.stop_monitoring()

            # 并发关闭所有服务器
            shutdown_tasks = []
            for server_name in self.servers.keys():
                task = asyncio.create_task(self._shutdown_single_server(server_name, timeout))
                shutdown_tasks.append((server_name, task))

            # 等待所有关闭任务完成
            all_success = True
            for server_name, task in shutdown_tasks:
                try:
                    success = await task
                    if success:
                        logger.info(f"✅ 服务器 {server_name} 关闭成功")
                    else:
                        logger.error(f"❌ 服务器 {server_name} 关闭失败")
                        all_success = False
                except Exception as e:
                    logger.error(f"❌ 服务器 {server_name} 关闭异常: {e}")
                    all_success = False

            # 最后清理僵尸进程
            await self._cleanup_zombie_processes()

            if all_success:
                logger.info("所有MCP服务器优雅关闭完成")
            else:
                logger.warning("部分MCP服务器关闭失败")

            return all_success

        except Exception as e:
            logger.error(f"关闭所有服务器时出错: {e}")
            return False

    async def stop_server(self, server_name: str, graceful: bool = True, timeout: int = 30) -> bool:
        """
        停止指定的MCP服务器

        Args:
            server_name: 服务器名称
            graceful: 是否优雅关闭（默认True）
            timeout: 关闭超时时间（秒，默认30）

        Returns:
            bool: 停止操作是否成功
        """
        try:
            logger.info(f"停止服务器 {server_name} (优雅模式: {graceful}, 超时: {timeout}秒)")

            # 检查服务器是否存在
            if server_name not in self.servers:
                logger.warning(f"服务器 {server_name} 不存在")
                return False

            # 执行停止操作
            if graceful:
                # 优雅关闭
                success = await self._graceful_shutdown(server_name, timeout)
            else:
                # 强制停止
                success = await self._shutdown_single_server(server_name, timeout)

            if success:
                logger.info(f"服务器 {server_name} 停止成功")
            else:
                logger.error(f"服务器 {server_name} 停止失败")

            return success

        except Exception as e:
            logger.error(f"停止服务器 {server_name} 时出错: {e}")
            return False

    async def restart_server(self, server_name: str, graceful: bool = True) -> bool:
        """重启服务器（支持优雅重启）"""
        try:
            logger.info(f"重启服务器 {server_name} (优雅模式: {graceful})")

            # 优雅关闭
            if graceful:
                shutdown_success = await self._graceful_shutdown(server_name)
                if not shutdown_success:
                    logger.warning(f"服务器 {server_name} 优雅关闭失败，继续尝试启动")
            else:
                # 强制停止
                server_status = self.servers.get(server_name)
                if server_status:
                    server_status.running = False
                    server_status.process_info = None

            # 等待一小段时间确保进程完全退出
            await asyncio.sleep(2)

            # 启动服务器
            return await self.start_server(server_name, force_restart=True)

        except Exception as e:
            logger.error(f"重启服务器 {server_name} 时出错: {e}")
            return False

    def is_server_healthy(self, server_name: str) -> bool:
        """
        检查服务器是否健康（快速状态检查接口）

        Args:
            server_name: 服务器名称

        Returns:
            bool: 服务器是否健康运行
        """
        if server_name not in self.servers:
            return False

        server_status = self.servers[server_name]
        return (server_status.running and
                not server_status.marked_failed and
                server_status.consecutive_failures < 3)

    # ==================== 性能监控和告警相关方法 ====================

    def _initialize_default_alert_rules(self):
        """初始化默认告警规则"""
        default_rules = [
            AlertRule(
                name="high_cpu_usage",
                metric="cpu_percent",
                threshold=80.0,
                operator=">",
                duration_seconds=300  # 5分钟
            ),
            AlertRule(
                name="high_memory_usage",
                metric="memory_percent",
                threshold=85.0,
                operator=">",
                duration_seconds=300
            ),
            AlertRule(
                name="slow_response_time",
                metric="response_time_ms",
                threshold=5000.0,  # 5秒
                operator=">",
                duration_seconds=180  # 3分钟
            ),
            AlertRule(
                name="high_error_rate",
                metric="error_count",
                threshold=10.0,
                operator=">",
                duration_seconds=120  # 2分钟
            )
        ]

        for rule in default_rules:
            self.alert_rules[rule.name] = rule

    async def start_metrics_collection(self):
        """启动性能指标收集"""
        if self.metrics_collection_active:
            logger.warning("性能指标收集已在运行中")
            return

        self.metrics_collection_active = True
        self.metrics_collection_task = asyncio.create_task(self._metrics_collection_loop())
        logger.info(f"性能指标收集已启动，收集间隔: {self.metrics_collection_interval}秒")

    async def stop_metrics_collection(self):
        """停止性能指标收集"""
        if not self.metrics_collection_active:
            return

        self.metrics_collection_active = False
        if self.metrics_collection_task:
            self.metrics_collection_task.cancel()
            try:
                await self.metrics_collection_task
            except asyncio.CancelledError:
                pass
            self.metrics_collection_task = None

        logger.info("性能指标收集已停止")

    async def _metrics_collection_loop(self):
        """性能指标收集循环"""
        try:
            while self.metrics_collection_active:
                await self._collect_performance_metrics()
                await self._check_alert_rules()
                await asyncio.sleep(self.metrics_collection_interval)
        except asyncio.CancelledError:
            logger.info("性能指标收集循环被取消")
        except Exception as e:
            logger.error(f"性能指标收集循环异常: {e}")

    async def _collect_performance_metrics(self):
        """收集所有服务器的性能指标"""
        current_time = datetime.now()

        for server_name, server_status in self.servers.items():
            if not server_status.running or not server_status.process_info:
                continue

            try:
                pid = server_status.process_info.get('pid')
                if not pid:
                    continue

                # 获取进程对象
                try:
                    process = psutil.Process(pid)
                except psutil.NoSuchProcess:
                    continue

                # 收集性能指标
                metrics = PerformanceMetrics(
                    server_name=server_name,
                    timestamp=current_time,
                    cpu_percent=process.cpu_percent(),
                    memory_mb=process.memory_info().rss / 1024 / 1024,
                    memory_percent=process.memory_percent(),
                    open_files=len(process.open_files()),
                    connections=len(process.connections()),
                    restart_count=server_status.restart_count
                )

                # 测量响应时间
                start_time = time.time()
                try:
                    # 简单的ping测试
                    if await self._ping_process(server_name, pid):
                        metrics.response_time_ms = (time.time() - start_time) * 1000
                    else:
                        metrics.response_time_ms = -1  # 表示无响应
                        metrics.error_count += 1
                except Exception:
                    metrics.response_time_ms = -1
                    metrics.error_count += 1

                # 存储指标（保留最近1000条记录）
                with self._metrics_lock:
                    if server_name not in self.performance_metrics:
                        self.performance_metrics[server_name] = deque(maxlen=1000)
                    self.performance_metrics[server_name].append(metrics)

            except Exception as e:
                logger.error(f"收集服务器 {server_name} 性能指标时出错: {e}")

    async def _check_alert_rules(self):
        """检查所有告警规则"""
        current_time = datetime.now()

        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue

            try:
                await self._evaluate_alert_rule(rule, current_time)
            except Exception as e:
                logger.error(f"评估告警规则 {rule_name} 时出错: {e}")

    async def _evaluate_alert_rule(self, rule: AlertRule, current_time: datetime):
        """评估单个告警规则"""
        for server_name in self.servers.keys():
            if server_name not in self.performance_metrics:
                continue

            # 获取指定时间范围内的指标
            time_threshold = current_time - timedelta(seconds=rule.duration_seconds)
            recent_metrics = []

            with self._metrics_lock:
                metrics_deque = self.performance_metrics[server_name]
                for metric in reversed(metrics_deque):
                    if metric.timestamp >= time_threshold:
                        recent_metrics.append(metric)
                    else:
                        break

            if not recent_metrics:
                continue

            # 检查是否满足告警条件
            violation_count = 0
            for metric in recent_metrics:
                value = getattr(metric, rule.metric, None)
                if value is None:
                    continue

                if self._check_threshold(value, rule.threshold, rule.operator):
                    violation_count += 1

            # 如果违规比例超过50%，触发告警
            violation_ratio = violation_count / len(recent_metrics)
            if violation_ratio > 0.5:
                await self._trigger_alert(rule, server_name, recent_metrics[-1], current_time)

    def _check_threshold(self, value: float, threshold: float, operator: str) -> bool:
        """检查值是否超过阈值"""
        if operator == ">":
            return value > threshold
        elif operator == "<":
            return value < threshold
        elif operator == ">=":
            return value >= threshold
        elif operator == "<=":
            return value <= threshold
        elif operator == "==":
            return value == threshold
        else:
            return False

    async def _trigger_alert(self, rule: AlertRule, server_name: str, metric: PerformanceMetrics, current_time: datetime):
        """触发告警"""
        # 检查是否已有相同的活跃告警
        alert_key = f"{rule.name}_{server_name}"
        if alert_key in self.active_alerts and not self.active_alerts[alert_key].resolved:
            return  # 避免重复告警

        # 确定告警严重程度
        severity = self._determine_alert_severity(rule, metric)

        # 创建告警
        alert = Alert(
            rule_name=rule.name,
            server_name=server_name,
            message=f"服务器 {server_name} 的 {rule.metric} 超过阈值 {rule.threshold} (当前值: {getattr(metric, rule.metric)})",
            severity=severity,
            timestamp=current_time
        )

        # 存储告警
        self.active_alerts[alert_key] = alert

        # 更新规则的最后触发时间
        rule.last_triggered = current_time

        # 执行告警动作
        await self._execute_alert_actions(alert)

        logger.warning(f"🚨 告警触发: {alert.message} (严重程度: {severity})")

    def _determine_alert_severity(self, rule: AlertRule, metric: PerformanceMetrics) -> str:
        """确定告警严重程度"""
        value = getattr(metric, rule.metric)
        threshold = rule.threshold

        if rule.metric in ["cpu_percent", "memory_percent"]:
            if value > threshold * 1.5:  # 超过阈值50%
                return "critical"
            elif value > threshold * 1.2:  # 超过阈值20%
                return "error"
            else:
                return "warning"
        elif rule.metric == "response_time_ms":
            if value > threshold * 2:  # 响应时间超过阈值2倍
                return "critical"
            elif value > threshold * 1.5:
                return "error"
            else:
                return "warning"
        elif rule.metric == "error_count":
            if value > threshold * 2:
                return "critical"
            elif value > threshold * 1.5:
                return "error"
            else:
                return "warning"
        else:
            return "warning"

    async def _execute_alert_actions(self, alert: Alert):
        """执行告警动作"""
        try:
            # 根据严重程度执行不同的动作
            if alert.severity == "critical":
                # 严重告警：尝试重启服务器
                logger.critical(f"严重告警，尝试重启服务器 {alert.server_name}")
                await self.restart_server(alert.server_name, graceful=True)
            elif alert.severity == "error":
                # 错误告警：记录详细日志
                logger.error(f"错误告警: {alert.message}")
            else:
                # 警告告警：记录警告日志
                logger.warning(f"警告告警: {alert.message}")

            # 这里可以添加更多告警动作，如发送邮件、Webhook等

        except Exception as e:
            logger.error(f"执行告警动作时出错: {e}")

    def get_performance_metrics(self, server_name: str = None, limit: int = 100) -> Dict[str, List[Dict]]:
        """获取性能指标"""
        result = {}

        with self._metrics_lock:
            if server_name:
                if server_name in self.performance_metrics:
                    metrics_list = list(self.performance_metrics[server_name])[-limit:]
                    result[server_name] = [{
                        'timestamp': m.timestamp.isoformat(),
                        'cpu_percent': m.cpu_percent,
                        'memory_mb': m.memory_mb,
                        'memory_percent': m.memory_percent,
                        'open_files': m.open_files,
                        'connections': m.connections,
                        'response_time_ms': m.response_time_ms,
                        'error_count': m.error_count,
                        'restart_count': m.restart_count
                    } for m in metrics_list]
            else:
                for name, metrics_deque in self.performance_metrics.items():
                    metrics_list = list(metrics_deque)[-limit:]
                    result[name] = [{
                        'timestamp': m.timestamp.isoformat(),
                        'cpu_percent': m.cpu_percent,
                        'memory_mb': m.memory_mb,
                        'memory_percent': m.memory_percent,
                        'open_files': m.open_files,
                        'connections': m.connections,
                        'response_time_ms': m.response_time_ms,
                        'error_count': m.error_count,
                        'restart_count': m.restart_count
                    } for m in metrics_list]

        return result

    def get_active_alerts(self, server_name: str = None) -> List[Dict]:
        """获取活跃告警"""
        alerts = []

        for alert_key, alert in self.active_alerts.items():
            if server_name and alert.server_name != server_name:
                continue

            if not alert.resolved:
                alerts.append({
                    'rule_name': alert.rule_name,
                    'server_name': alert.server_name,
                    'message': alert.message,
                    'severity': alert.severity,
                    'timestamp': alert.timestamp.isoformat()
                })

        return alerts

    def resolve_alert(self, rule_name: str, server_name: str) -> bool:
        """解决告警"""
        alert_key = f"{rule_name}_{server_name}"

        if alert_key in self.active_alerts:
            alert = self.active_alerts[alert_key]
            alert.resolved = True
            alert.resolved_at = datetime.now()
            logger.info(f"告警已解决: {alert.message}")
            return True

        return False

    def add_alert_rule(self, rule: AlertRule) -> bool:
        """添加告警规则"""
        try:
            self.alert_rules[rule.name] = rule
            logger.info(f"告警规则已添加: {rule.name}")
            return True
        except Exception as e:
            logger.error(f"添加告警规则失败: {e}")
            return False

    def remove_alert_rule(self, rule_name: str) -> bool:
        """移除告警规则"""
        if rule_name in self.alert_rules:
            del self.alert_rules[rule_name]
            logger.info(f"告警规则已移除: {rule_name}")
            return True

        return False

    def get_alert_rules(self) -> List[Dict]:
        """获取所有告警规则"""
        return [{
            'name': rule.name,
            'metric': rule.metric,
            'threshold': rule.threshold,
            'operator': rule.operator,
            'duration_seconds': rule.duration_seconds,
            'enabled': rule.enabled,
            'last_triggered': rule.last_triggered.isoformat() if rule.last_triggered else None
        } for rule in self.alert_rules.values()]

    # ==================== 配置管理增强相关方法 ====================

    def reload_configuration(self, config_path: str = None) -> bool:
        """动态重载配置"""
        try:
            logger.info("开始重载MCP服务器配置")

            # 备份当前配置
            old_configs = self.server_configs.copy()
            old_version = getattr(self, 'config_version', 1)

            # 重新加载配置
            if config_path:
                # 从指定路径加载
                if os.path.exists(config_path):
                    with open(config_path, 'r', encoding='utf-8') as f:
                        new_configs = json.load(f)
                else:
                    logger.error(f"配置文件不存在: {config_path}")
                    return False
            else:
                # 重新加载默认配置
                self._load_server_configs()
                new_configs = self.server_configs

            # 验证新配置
            if not self._validate_configuration(new_configs):
                logger.error("新配置验证失败，回滚到原配置")
                self.server_configs = old_configs
                return False

            # 应用新配置
            self.server_configs = new_configs
            self.config_version = old_version + 1

            # 记录配置变更历史
            self._record_config_change(old_configs, new_configs)

            # 重启受影响的服务器
            affected_servers = self._get_affected_servers(old_configs, new_configs)
            for server_name in affected_servers:
                logger.info(f"配置变更，重启服务器: {server_name}")
                asyncio.create_task(self.restart_server(server_name, graceful=True))

            logger.info(f"配置重载成功，版本: {self.config_version}")
            return True

        except Exception as e:
            logger.error(f"配置重载失败: {e}")
            return False

    def _validate_configuration(self, config: dict) -> bool:
        """验证配置的有效性"""
        try:
            required_fields = ['command', 'args']
            optional_fields = ['env', 'cwd', 'enabled', 'timeout', 'max_retries']

            for server_name, server_config in config.items():
                if not isinstance(server_config, dict):
                    logger.error(f"服务器 {server_name} 配置必须是字典类型")
                    return False

                # 检查必需字段
                for field in required_fields:
                    if field not in server_config:
                        logger.error(f"服务器 {server_name} 缺少必需字段: {field}")
                        return False

                # 验证命令格式
                command = server_config.get('command')
                if not isinstance(command, str) or not command.strip():
                    logger.error(f"服务器 {server_name} 的命令格式无效")
                    return False

                # 验证参数格式
                args = server_config.get('args')
                if not isinstance(args, list):
                    logger.error(f"服务器 {server_name} 的参数必须是列表类型")
                    return False

                # 验证环境变量格式
                env = server_config.get('env', {})
                if not isinstance(env, dict):
                    logger.error(f"服务器 {server_name} 的环境变量必须是字典类型")
                    return False

                # 验证工作目录
                cwd = server_config.get('cwd')
                if cwd and not os.path.exists(cwd):
                    logger.warning(f"服务器 {server_name} 的工作目录不存在: {cwd}")

                # 验证数值字段
                for field in ['timeout', 'max_retries']:
                    value = server_config.get(field)
                    if value is not None and (not isinstance(value, (int, float)) or value < 0):
                        logger.error(f"服务器 {server_name} 的 {field} 必须是非负数")
                        return False

                # 验证布尔字段
                enabled = server_config.get('enabled', True)
                if not isinstance(enabled, bool):
                    logger.error(f"服务器 {server_name} 的 enabled 必须是布尔值")
                    return False

            logger.info("配置验证通过")
            return True

        except Exception as e:
            logger.error(f"配置验证异常: {e}")
            return False

    def _record_config_change(self, old_config: dict, new_config: dict):
        """记录配置变更历史"""
        try:
            if not hasattr(self, 'config_history'):
                self.config_history = deque(maxlen=50)  # 保留最近50次变更

            change_record = {
                'timestamp': datetime.now().isoformat(),
                'version': getattr(self, 'config_version', 1),
                'changes': self._calculate_config_diff(old_config, new_config)
            }

            self.config_history.append(change_record)
            logger.info(f"配置变更记录已保存，变更数量: {len(change_record['changes'])}")

        except Exception as e:
            logger.error(f"记录配置变更失败: {e}")

    def _calculate_config_diff(self, old_config: dict, new_config: dict) -> List[Dict]:
        """计算配置差异"""
        changes = []

        # 检查新增的服务器
        for server_name in new_config:
            if server_name not in old_config:
                changes.append({
                    'type': 'added',
                    'server': server_name,
                    'config': new_config[server_name]
                })

        # 检查删除的服务器
        for server_name in old_config:
            if server_name not in new_config:
                changes.append({
                    'type': 'removed',
                    'server': server_name,
                    'config': old_config[server_name]
                })

        # 检查修改的服务器
        for server_name in old_config:
            if server_name in new_config:
                old_server_config = old_config[server_name]
                new_server_config = new_config[server_name]

                if old_server_config != new_server_config:
                    field_changes = []
                    for field in set(list(old_server_config.keys()) + list(new_server_config.keys())):
                        old_value = old_server_config.get(field)
                        new_value = new_server_config.get(field)

                        if old_value != new_value:
                            field_changes.append({
                                'field': field,
                                'old_value': old_value,
                                'new_value': new_value
                            })

                    if field_changes:
                        changes.append({
                            'type': 'modified',
                            'server': server_name,
                            'field_changes': field_changes
                        })

        return changes

    def _get_affected_servers(self, old_config: dict, new_config: dict) -> List[str]:
        """获取受配置变更影响的服务器列表"""
        affected_servers = []

        # 检查修改和新增的服务器
        for server_name in new_config:
            if server_name not in old_config:
                # 新增的服务器
                affected_servers.append(server_name)
            elif old_config[server_name] != new_config[server_name]:
                # 修改的服务器
                affected_servers.append(server_name)

        # 检查删除的服务器（需要停止）
        for server_name in old_config:
            if server_name not in new_config and server_name in self.servers:
                # 删除的服务器，需要停止
                asyncio.create_task(self._shutdown_single_server(server_name))

        return affected_servers

    def get_config_version(self) -> int:
        """获取当前配置版本"""
        return getattr(self, 'config_version', 1)

    def get_config_history(self, limit: int = 10) -> List[Dict]:
        """获取配置变更历史"""
        if not hasattr(self, 'config_history'):
            return []

        history_list = list(self.config_history)
        return history_list[-limit:] if limit > 0 else history_list

    def export_configuration(self, file_path: str = None) -> Union[str, bool]:
        """导出当前配置"""
        try:
            config_data = {
                'version': self.get_config_version(),
                'timestamp': datetime.now().isoformat(),
                'servers': self.server_configs
            }

            if file_path:
                # 导出到文件
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(config_data, f, indent=2, ensure_ascii=False)
                logger.info(f"配置已导出到: {file_path}")
                return True
            else:
                # 返回JSON字符串
                return json.dumps(config_data, indent=2, ensure_ascii=False)

        except Exception as e:
            logger.error(f"导出配置失败: {e}")
            return False

    def import_configuration(self, file_path: str, apply_immediately: bool = False) -> bool:
        """导入配置"""
        try:
            if not os.path.exists(file_path):
                logger.error(f"配置文件不存在: {file_path}")
                return False

            with open(file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)

            # 验证导入的配置格式
            if 'servers' not in config_data:
                logger.error("导入的配置格式无效：缺少servers字段")
                return False

            if apply_immediately:
                # 立即应用配置
                old_configs = self.server_configs.copy()
                self.server_configs = config_data['servers']

                # 记录配置变更
                self._record_config_change("import_configuration", {
                    'imported_from': file_path,
                    'servers_count': len(config_data['servers'])
                })

                logger.info(f"配置已从 {file_path} 导入并应用")
            else:
                logger.info(f"配置已从 {file_path} 导入但未应用")

            return True

        except Exception as e:
            logger.error(f"导入配置失败: {e}")
            return False

    # ==================== 进程泄漏监控告警系统 ====================

    async def monitor_process_leaks(self) -> Dict[str, Any]:
        """监控进程泄漏情况并生成告警

        检测系统中的MCP进程数量，当发现异常时生成告警

        Returns:
            Dict[str, Any]: 监控结果，包含进程统计和告警信息
        """
        try:
            # 统计当前MCP相关进程
            all_mcp_processes = []
            managed_pids = set()

            # 收集当前管理的进程PID
            for server_name, server_status in self.servers.items():
                if server_status.running and server_status.process_info:
                    pid = server_status.process_info.get('pid')
                    if pid:
                        managed_pids.add(pid)

            # 扫描所有MCP相关进程
            for proc in psutil.process_iter(['pid', 'cmdline', 'create_time', 'status']):
                try:
                    cmdline = proc.info['cmdline']
                    if cmdline and self._is_mcp_related_process(cmdline):
                        create_time = datetime.fromtimestamp(proc.info['create_time'])
                        age_hours = (datetime.now() - create_time).total_seconds() / 3600

                        process_info = {
                            'pid': proc.info['pid'],
                            'cmdline': cmdline,
                            'create_time': create_time,
                            'age_hours': age_hours,
                            'status': proc.info['status'],
                            'is_managed': proc.info['pid'] in managed_pids
                        }
                        all_mcp_processes.append(process_info)

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            # 分类统计
            managed_count = len([p for p in all_mcp_processes if p['is_managed']])
            orphaned_count = len([p for p in all_mcp_processes if not p['is_managed']])
            zombie_count = len([p for p in all_mcp_processes if p['status'] in [psutil.STATUS_ZOMBIE, psutil.STATUS_DEAD]])
            old_processes = len([p for p in all_mcp_processes if p['age_hours'] > 2.0])
            very_old_processes = len([p for p in all_mcp_processes if p['age_hours'] > 6.0])

            # 生成监控结果
            monitor_result = {
                'timestamp': datetime.now(),
                'total_mcp_processes': len(all_mcp_processes),
                'managed_processes': managed_count,
                'orphaned_processes': orphaned_count,
                'zombie_processes': zombie_count,
                'old_processes': old_processes,
                'very_old_processes': very_old_processes,
                'alerts': [],
                'recommendations': []
            }

            # 生成告警
            alerts = []

            # 告警1：孤儿进程过多
            if orphaned_count > 5:
                alerts.append({
                    'type': 'orphaned_processes_high',
                    'severity': 'warning' if orphaned_count <= 10 else 'critical',
                    'message': f'检测到 {orphaned_count} 个孤儿MCP进程，可能存在进程泄漏',
                    'count': orphaned_count,
                    'threshold': 5
                })

            # 告警2：僵尸进程
            if zombie_count > 0:
                alerts.append({
                    'type': 'zombie_processes',
                    'severity': 'warning',
                    'message': f'检测到 {zombie_count} 个僵尸MCP进程，需要清理',
                    'count': zombie_count
                })

            # 告警3：长时间运行的进程过多
            if very_old_processes > 3:
                alerts.append({
                    'type': 'very_old_processes',
                    'severity': 'warning',
                    'message': f'检测到 {very_old_processes} 个运行超过6小时的MCP进程',
                    'count': very_old_processes,
                    'threshold': 3
                })

            # 告警4：总进程数异常
            expected_process_count = len([s for s in self.servers.values() if s.enabled])
            if len(all_mcp_processes) > expected_process_count * 3:
                alerts.append({
                    'type': 'total_processes_high',
                    'severity': 'critical',
                    'message': f'MCP进程总数 ({len(all_mcp_processes)}) 远超预期 ({expected_process_count})，可能存在严重泄漏',
                    'actual_count': len(all_mcp_processes),
                    'expected_count': expected_process_count
                })

            monitor_result['alerts'] = alerts

            # 生成建议
            recommendations = []
            if orphaned_count > 0:
                recommendations.append(f'建议立即清理 {orphaned_count} 个孤儿进程')
            if zombie_count > 0:
                recommendations.append(f'建议清理 {zombie_count} 个僵尸进程')
            if very_old_processes > 0:
                recommendations.append(f'建议检查 {very_old_processes} 个长时间运行的进程')

            monitor_result['recommendations'] = recommendations

            # 记录监控结果
            if alerts:
                logger.warning(f"进程泄漏监控告警: 发现 {len(alerts)} 个问题")
                for alert in alerts:
                    logger.warning(f"  - {alert['severity'].upper()}: {alert['message']}")
            else:
                logger.debug(f"进程泄漏监控正常: 总进程数 {len(all_mcp_processes)}, 孤儿进程 {orphaned_count}")

            return monitor_result

        except Exception as e:
            logger.error(f"进程泄漏监控时出错: {e}")
            return {
                'timestamp': datetime.now(),
                'error': str(e),
                'alerts': [{
                    'type': 'monitoring_error',
                    'severity': 'error',
                    'message': f'进程泄漏监控失败: {e}'
                }]
            }

    async def auto_handle_process_leaks(self, monitor_result: Dict[str, Any]) -> bool:
        """自动处理检测到的进程泄漏问题

        根据监控结果自动执行清理操作

        Args:
            monitor_result: monitor_process_leaks的返回结果

        Returns:
            bool: 处理是否成功
        """
        try:
            alerts = monitor_result.get('alerts', [])
            if not alerts:
                return True

            handled_count = 0

            for alert in alerts:
                alert_type = alert['type']

                if alert_type == 'orphaned_processes_high':
                    # 自动清理孤儿进程
                    logger.info(f"自动处理孤儿进程告警: {alert['message']}")
                    try:
                        await self.cleanup_orphaned_mcp_processes()
                        handled_count += 1
                        logger.info("孤儿进程清理完成")
                    except Exception as e:
                        logger.error(f"自动清理孤儿进程失败: {e}")

                elif alert_type == 'zombie_processes':
                    # 自动清理僵尸进程
                    logger.info(f"自动处理僵尸进程告警: {alert['message']}")
                    try:
                        await self._cleanup_zombie_processes()
                        handled_count += 1
                        logger.info("僵尸进程清理完成")
                    except Exception as e:
                        logger.error(f"自动清理僵尸进程失败: {e}")

                elif alert_type == 'total_processes_high':
                    # 严重泄漏情况：强制清理所有孤儿进程
                    logger.warning(f"检测到严重进程泄漏，执行强制清理: {alert['message']}")
                    try:
                        await self.cleanup_orphaned_mcp_processes()
                        # 等待一段时间后重新检查
                        await asyncio.sleep(5)

                        # 如果问题仍然存在，记录严重告警
                        recheck_result = await self.monitor_process_leaks()
                        if recheck_result.get('total_mcp_processes', 0) > alert['expected_count'] * 2:
                            logger.critical("强制清理后进程泄漏问题仍然存在，可能需要人工干预")
                        else:
                            handled_count += 1
                            logger.info("严重进程泄漏问题已解决")

                    except Exception as e:
                        logger.error(f"处理严重进程泄漏失败: {e}")

            logger.info(f"自动处理进程泄漏完成: 处理了 {handled_count}/{len(alerts)} 个问题")
            return handled_count > 0

        except Exception as e:
            logger.error(f"自动处理进程泄漏时出错: {e}")
            return False

    def get_process_leak_summary(self) -> Dict[str, Any]:
        """获取进程泄漏监控摘要

        Returns:
            Dict[str, Any]: 包含历史统计和当前状态的摘要
        """
        try:
            # 这里可以扩展为保存历史监控数据
            # 目前返回基本的状态信息

            managed_count = len([s for s in self.servers.values() if s.running])
            enabled_count = len([s for s in self.servers.values() if s.enabled])
            failed_count = len([s for s in self.servers.values() if s.marked_failed])

            return {
                'timestamp': datetime.now(),
                'managed_servers': {
                    'total_enabled': enabled_count,
                    'currently_running': managed_count,
                    'marked_failed': failed_count
                },
                'monitoring_status': {
                    'leak_detection_enabled': True,
                    'auto_cleanup_enabled': True,
                    'cleanup_interval_minutes': 2
                },
                'last_cleanup': getattr(self, '_last_cleanup_time', None)
            }

        except Exception as e:
            logger.error(f"获取进程泄漏摘要时出错: {e}")
            return {
                'timestamp': datetime.now(),
                'error': str(e)
            }
            if 'servers' not in config_data:
                logger.error("导入的配置文件格式无效，缺少 servers 字段")
                return False

            servers_config = config_data['servers']

            # 验证配置
            if not self._validate_configuration(servers_config):
                logger.error("导入的配置验证失败")
                return False

            if apply_immediately:
                # 立即应用配置
                return self.reload_configuration(file_path)
            else:
                # 仅验证，不应用
                logger.info(f"配置文件验证通过: {file_path}")
                return True

        except Exception as e:
            logger.error(f"导入配置失败: {e}")
            return False

    def backup_configuration(self, backup_dir: str = None) -> str:
        """备份当前配置"""
        try:
            if not backup_dir:
                backup_dir = os.path.join(os.getcwd(), 'config_backups')

            os.makedirs(backup_dir, exist_ok=True)

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"mcp_config_backup_{timestamp}_v{self.get_config_version()}.json"
            backup_path = os.path.join(backup_dir, backup_filename)

            if self.export_configuration(backup_path):
                logger.info(f"配置备份成功: {backup_path}")
                return backup_path
            else:
                logger.error("配置备份失败")
                return ""

        except Exception as e:
            logger.error(f"配置备份异常: {e}")
            return ""

        # ==================== 进程管理方法 ====================

    async def ensure_server_running_for_client(self, server_name: str) -> Dict[str, Any]:
        """
        为客户端确保指定的MCP服务器正在运行

        Args:
            server_name: 服务器名称

        Returns:
            Dict[str, Any]: 包含启动结果和服务器信息的字典
                - success: bool, 是否成功
                - running: bool, 服务器是否正在运行
                - pid: Optional[int], 进程ID
                - message: str, 状态消息
                - error: Optional[str], 错误信息
        """
        try:
            if server_name not in self.server_configs:
                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器配置不存在: {server_name}",
                    "error": "CONFIG_NOT_FOUND"
                }

            # 检查服务器是否被标记为失败
            server_status = self.servers[server_name]
            if server_status.marked_failed:
                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器已被标记为失败: {server_name}",
                    "error": "SERVER_MARKED_FAILED"
                }

            # 检查进程是否已经在运行
            config = self.server_configs[server_name]
            existing_pid = await self._check_process_uniqueness(server_name, config)

            if existing_pid:
                # 状态同步检查点：确保状态与实际进程一致
                server_status.running = True
                server_status.consecutive_failures = 0
                server_status.error_message = None
                server_status.last_check = datetime.now()
                server_status.process_info = {
                    "pid": existing_pid,
                    "startup_output": "发现现有进程，状态已同步"
                }

                logger.debug(f"状态同步: 服务器 {server_name} 进程存在 (PID: {existing_pid})，状态已更新")

                return {
                    "success": True,
                    "running": True,
                    "pid": existing_pid,
                    "message": f"服务器 {server_name} 正在运行 (PID: {existing_pid})",
                    "error": None
                }

            # 尝试启动服务器
            logger.info(f"客户端请求启动MCP服务器: {server_name}")

            # 检查是否在冷却期，如果是客户端请求，可以尝试强制启动
            if self._is_server_in_cooldown(server_name):
                cooldown_info = self._get_server_cooldown_info(server_name)
                logger.info(f"服务器 {server_name} 在冷却期内（剩余 {cooldown_info.get('remaining', 0):.1f} 秒），"
                           f"但这是客户端请求，尝试强制启动")
                start_success = await self.start_server(server_name, force_restart=True)
            else:
                start_success = await self.start_server(server_name)

            if start_success:
                # 先更新状态，确保状态一致
                server_status.running = True
                server_status.last_check = datetime.now()
                server_status.consecutive_failures = 0
                server_status.error_message = None

                # 状态同步验证：确保启动后状态一致
                new_pid = await self._check_process_uniqueness(server_name, config)

                # 验证状态同步
                if new_pid:
                    logger.debug(f"状态同步: 服务器 {server_name} 启动成功，状态已更新")
                    return {
                        "success": True,
                        "running": True,
                        "pid": new_pid,
                        "message": f"服务器 {server_name} 启动成功 (PID: {new_pid})",
                        "error": None
                    }
                else:
                    # stdio模式服务器：状态为运行但无PID
                    logger.debug(f"状态同步: 服务器 {server_name} 为stdio模式，状态正常")
                    return {
                        "success": True,
                        "running": True,
                        "pid": None,
                        "message": f"服务器启动成功 (stdio模式): {server_name}",
                        "error": None
                    }
            else:
                # 启动失败，更新状态
                server_status.running = False
                server_status.last_check = datetime.now()
                logger.debug(f"状态同步: 服务器 {server_name} 启动失败，状态已更新")

                return {
                    "success": False,
                    "running": False,
                    "pid": None,
                    "message": f"服务器启动失败: {server_name}",
                    "error": "START_FAILED"
                }

        except Exception as e:
            logger.error(f"确保服务器运行时出错 {server_name}: {e}")
            return {
                "success": False,
                "running": False,
                "pid": None,
                "message": f"操作异常: {e}",
                "error": "EXCEPTION"
            }

    async def check_server_health(self, server_name: str) -> Dict[str, Any]:
        """
        检查指定MCP服务器的健康状态

        Args:
            server_name: 服务器名称

        Returns:
            Dict[str, Any]: 健康状态信息
        """
        try:
            if server_name not in self.server_configs:
                return {
                    "healthy": False,
                    "message": f"服务器配置不存在: {server_name}",
                    "error": "CONFIG_NOT_FOUND"
                }

            config = self.server_configs[server_name]
            server_status = self.servers[server_name]

            # 检查进程状态
            if config.get('type') == 'local':
                # 本地进程检查
                pid = await self._check_process_uniqueness(server_name, config)
                if pid:
                    # 检查进程是否响应
                    try:
                        # 这里可以添加更详细的进程健康检查
                        # 比如检查CPU使用率、内存占用等
                        return {
                            "healthy": True,
                            "message": f"本地进程运行正常 (PID: {pid})",
                            "pid": pid,
                            "type": "local"
                        }
                    except Exception as e:
                        return {
                            "healthy": False,
                            "message": f"本地进程检查失败: {e}",
                            "error": "PROCESS_CHECK_FAILED"
                        }
                else:
                    return {
                        "healthy": False,
                        "message": f"本地进程未运行: {server_name}",
                        "error": "PROCESS_NOT_RUNNING"
                    }
            else:
                # 远程服务器检查
                try:
                    host = config.get('host', 'localhost')
                    port = config.get('port', 8080)

                    # 尝试建立TCP连接检查可达性
                    reader, writer = await asyncio.wait_for(
                        asyncio.open_connection(host, port),
                        timeout=5.0
                    )
                    writer.close()
                    await writer.wait_closed()

                    return {
                        "healthy": True,
                        "message": f"远程服务器可达 ({host}:{port})",
                        "host": host,
                        "port": port,
                        "type": "remote"
                    }
                except Exception as e:
                    return {
                        "healthy": False,
                        "message": f"远程服务器不可达 ({host}:{port}): {e}",
                        "error": "NETWORK_UNREACHABLE"
                    }

        except Exception as e:
            logger.error(f"检查服务器健康状态时出错: {server_name}, 错误: {e}")
            return {
                "healthy": False,
                "message": f"健康检查异常: {e}",
                "error": "HEALTH_CHECK_EXCEPTION"
            }

    def _is_server_in_cooldown(self, server_name: str) -> bool:
        """
        检查服务器是否在冷却期内

        Args:
            server_name: 服务器名称

        Returns:
            bool: 是否在冷却期内
        """
        try:
            if server_name not in self.servers:
                return False

            server_status = self.servers[server_name]
            if not server_status.last_restart_time:
                return False

            time_since_restart = datetime.now() - server_status.last_restart_time
            cooldown_period = timedelta(seconds=self.restart_cooldown)

            # 如果连续失败次数较多，缩短冷却期以便快速恢复
            if server_status.consecutive_failures >= 2:
                cooldown_period = timedelta(seconds=self.restart_cooldown // 2)

            return time_since_restart < cooldown_period

        except Exception as e:
            logger.error(f"检查冷却期状态时出错: {server_name}, 错误: {e}")
            return False

    def get_cooldown_status(self, server_name: str = None) -> Dict[str, Any]:
        """
        获取冷却期状态信息

        Args:
            server_name: 服务器名称，如果为None则返回所有服务器的状态

        Returns:
            Dict[str, Any]: 冷却期状态信息
        """
        try:
            if server_name:
                return self._get_server_cooldown_info(server_name)
            else:
                return {name: self._get_server_cooldown_info(name)
                        for name in self.servers.keys()}

        except Exception as e:
            logger.error(f"获取冷却期状态时出错: {e}")
            return {"error": str(e)}

    def _get_server_cooldown_info(self, server_name: str) -> Dict[str, Any]:
        """
        获取单个服务器的冷却期信息

        Args:
            server_name: 服务器名称

        Returns:
            Dict[str, Any]: 冷却期详细信息
        """
        try:
            if server_name not in self.servers:
                return {"error": "服务器不存在"}

            server_status = self.servers[server_name]
            if not server_status.last_restart_time:
                return {
                    "cooldown": False,
                    "remaining": 0,
                    "consecutive_failures": server_status.consecutive_failures,
                    "last_restart": None
                }

            cooldown_period = timedelta(seconds=self.restart_cooldown)
            if server_status.consecutive_failures >= 2:
                cooldown_period = timedelta(seconds=self.restart_cooldown // 2)

            time_since_restart = datetime.now() - server_status.last_restart_time
            remaining = max(0, cooldown_period.total_seconds() - time_since_restart.total_seconds())

            return {
                "cooldown": remaining > 0,
                "remaining": remaining,
                "consecutive_failures": server_status.consecutive_failures,
                "last_restart": server_status.last_restart_time.isoformat(),
                "cooldown_period": cooldown_period.total_seconds()
            }

        except Exception as e:
            logger.error(f"获取服务器冷却期信息时出错: {server_name}, 错误: {e}")
            return {"error": str(e)}

# 全局MCP服务器管理器实例
mcp_manager = MCPServerManager()
