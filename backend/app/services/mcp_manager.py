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
    """MCP服务器管理器 - 负责启动、监控和重启MCP服务器"""
    
    def __init__(self):
        self.servers: Dict[str, MCPServerStatus] = {}
        self.server_configs: Dict[str, Dict] = {}
        self.mcp_client: Optional[MCPClientWrapper] = None
        self.monitoring_task: Optional[asyncio.Task] = None
        self.check_interval = 3600  # 健康检查间隔（秒）- 60分钟
        self.max_consecutive_failures = 3  # 最大连续失败次数
        self.restart_cooldown = 60  # 重启冷却时间（秒）
        
        # 加载MCP服务器配置
        self._load_server_configs()
        
        # 环境变量验证规则
        self._env_validation_rules = {
            "amap-maps": {"required": ["AMAP_MAPS_API_KEY"], "optional": []},
            "minimax-mcp-js": {"required": ["MINIMAX_API_KEY"], "optional": ["MINIMAX_API_HOST", "MINIMAX_MCP_BASE_PATH"]},
            "web3-rpc": {"required": [], "optional": ["WEB3_RPC_URL", "PRIVATE_KEY"]},
            "playwright": {"required": [], "optional": []}
        }
        
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
        检查进程唯一性，防止重复启动同一个MCP服务
        
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
            
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    proc_info = proc.info
                    if proc_info['cmdline']:
                        # 检查命令行是否匹配
                        proc_cmdline = proc_info['cmdline']
                        
                        # 对于不同类型的MCP服务器，使用不同的匹配策略
                        if self._is_matching_mcp_process(server_name, full_cmd, proc_cmdline):
                            logger.info(f"发现现有MCP进程 {server_name} (PID: {proc_info['pid']})")
                            return proc_info['pid']
                            
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                    
        except Exception as e:
            logger.warning(f"检查进程唯一性时出错: {e}")
            
        return None
    
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
            
            # 不同MCP服务器的特征匹配
            server_patterns = {
                'playwright': ['npx', 'playwright'],
                'minimax-mcp-js': ['npx', 'minimax-mcp-js'],
                'amap-maps': ['npx', '@amap/amap-maps-mcp-server'],
                'web3-rpc': ['node', 'build/index.js']
            }
            
            # 首先检查服务器特定模式
            if server_name in server_patterns:
                patterns = server_patterns[server_name]
                if all(pattern in actual_str for pattern in patterns):
                    return True
            
            # 通用匹配：检查关键命令组件
            if len(expected_cmd) >= 2:
                # 检查命令和主要参数是否匹配
                cmd_base = expected_cmd[0].lower()
                main_arg = expected_cmd[1].lower() if len(expected_cmd) > 1 else ''
                
                if cmd_base in actual_str and main_arg in actual_str:
                    return True
                    
        except Exception as e:
            logger.debug(f"进程匹配检查出错: {e}")
            
        return False
    
    async def start_server(self, server_name: str, force_restart: bool = False) -> bool:
        """
        启动指定的MCP服务器（增强版本，包含进程唯一性检查）
        
        Args:
            server_name: 服务器名称
            force_restart: 是否强制重启，忽略冷却期限制
            
        Returns:
            bool: 启动是否成功
        """
        if server_name not in self.server_configs:
            logger.error(f"未找到服务器配置: {server_name}")
            return False
            
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
                logger.info(f"服务器 {server_name} 在冷却期内（剩余 {(cooldown_period - time_since_restart).total_seconds():.1f} 秒），跳过重启")
                return False
            
        config = self.server_configs[server_name]
        
        # 进程唯一性检查：防止重复启动
        existing_pid = await self._check_process_uniqueness(server_name, config)
        if existing_pid:
            logger.info(f"MCP服务器 {server_name} 已在运行 (PID: {existing_pid})，跳过启动")
            # 更新服务器状态
            server_status.running = True
            server_status.consecutive_failures = 0
            server_status.error_message = None
            server_status.process_info = {
                "pid": existing_pid,
                "cmd": f"{config['command']} {' '.join(config.get('args', []))}",
                "startup_output": "发现现有进程，跳过启动"
            }
            return True
        
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
                    success_indicators = [
                        "running on stdio",
                        "mcp server running",
                        "server started",
                        "listening",
                        "registering general tools",  # web3-rpc的成功指示符
                        "registering solana tools",   # web3-rpc的成功指示符
                        "amap maps mcp server running on stdio",  # amap-maps的完整成功指示符
                        "maps mcp server running",     # amap-maps的备用指示符
                        "looking for .env file",       # web3-rpc的启动指示符
                        "registering",                 # 通用注册指示符
                        "initialized",                 # 初始化完成指示符
                        "ready",                       # 就绪指示符
                        "started",                     # 启动指示符
                        "loading",                     # 加载指示符
                        "connecting"                   # 连接指示符
                    ]
                    
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
                        server_status.process_info = {
                            "pid": process.pid,
                            "cmd": f"{cmd} {' '.join(args)}",
                            "startup_output": output_text[:500]  # 保存前500字符的启动输出
                        }
                        
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
                    server_status.process_info = {
                        "pid": process.pid,
                        "cmd": f"{cmd} {' '.join(args)}"
                    }
                    
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
            
        except Exception as e:
            logger.error(f"清理僵尸进程时出错 {server_name} (PID: {pid}): {e}")
    
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
    
    async def handle_server_failure(self, server_name: str):
        """处理服务器失败"""
        server_status = self.servers[server_name]
        server_status.running = False
        server_status.consecutive_failures += 1
        
        logger.warning(f"检测到服务器 {server_name} 失败 (连续失败次数: {server_status.consecutive_failures})")
        
        # 检查是否达到最大连续失败次数
        if server_status.consecutive_failures >= self.max_consecutive_failures:
            server_status.marked_failed = True
            logger.error(f"服务器 {server_name} 连续失败 {self.max_consecutive_failures} 次，已标记为失败，不再尝试重启")
            return
            
        # 尝试重启
        logger.info(f"尝试重启服务器 {server_name} (第 {server_status.consecutive_failures} 次失败)")
        success = await self.start_server(server_name)
        
        if not success:
            logger.error(f"重启服务器 {server_name} 失败")
    
    async def start_all_servers(self):
        """启动所有启用的MCP服务器"""
        logger.info("开始启动所有MCP服务器...")
        
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
                else:
                    logger.error(f"❌ 服务器 {server_name} 启动失败")
            except Exception as e:
                logger.error(f"❌ 服务器 {server_name} 启动异常: {e}")
    
    async def monitor_servers(self):
        """监控所有服务器状态"""
        logger.info(f"开始监控MCP服务器，检查间隔: {self.check_interval}秒")
        
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
            start_success = await self.start_server(server_name)
            
            if start_success:
                # 状态同步验证：确保启动后状态一致
                new_pid = await self._check_process_uniqueness(server_name, config)
                
                # 验证状态同步
                if new_pid and server_status.running:
                    logger.debug(f"状态同步验证通过: 服务器 {server_name} 启动成功且状态一致 (PID: {new_pid})")
                    return {
                        "success": True,
                        "running": True,
                        "pid": new_pid,
                        "message": f"服务器启动成功: {server_name}",
                        "error": None
                    }
                elif server_status.running and not new_pid:
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
                    # 状态不一致，需要修复
                    logger.warning(f"状态同步异常: 服务器 {server_name} 启动成功但状态不一致 (PID: {new_pid}, running: {server_status.running})")
                    return {
                        "success": False,
                        "running": False,
                        "pid": None,
                        "message": f"服务器启动后状态同步异常: {server_name}",
                        "error": "STATE_SYNC_ERROR"
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
            
            if cleaned_count > 0:
                logger.info(f"清理了 {cleaned_count} 个僵尸进程")
            else:
                logger.debug("未发现僵尸进程")
                
        except Exception as e:
            logger.error(f"清理僵尸进程时出错: {e}")
    
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
        """优雅关闭单个服务器"""
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
            
            # 1. 发送SIGTERM信号请求优雅关闭
            try:
                process = psutil.Process(pid)
                process.terminate()
                logger.debug(f"向进程 {pid} 发送SIGTERM信号")
                
                # 2. 等待进程自然退出
                try:
                    process.wait(timeout=timeout)
                    logger.info(f"服务器 {server_name} 优雅关闭成功")
                    server_status.running = False
                    server_status.process_info = None
                    return True
                except psutil.TimeoutExpired:
                    logger.warning(f"服务器 {server_name} 在 {timeout} 秒内未响应SIGTERM")
                    
                    # 3. 强制终止
                    logger.info(f"强制终止服务器 {server_name} (PID: {pid})")
                    process.kill()
                    try:
                        process.wait(timeout=5)
                        logger.info(f"服务器 {server_name} 强制终止成功")
                        server_status.running = False
                        server_status.process_info = None
                        return True
                    except psutil.TimeoutExpired:
                        logger.error(f"无法终止服务器 {server_name} (PID: {pid})")
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

# 全局MCP服务器管理器实例
mcp_manager = MCPServerManager()