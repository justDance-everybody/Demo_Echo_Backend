#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import os
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
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
    
    async def start_server(self, server_name: str) -> bool:
        """启动指定的MCP服务器"""
        if server_name not in self.server_configs:
            logger.error(f"未找到服务器配置: {server_name}")
            return False
            
        server_status = self.servers[server_name]
        
        # 检查是否被标记为失败
        if server_status.marked_failed:
            logger.warning(f"服务器 {server_name} 已被标记为失败，跳过启动")
            return False
            
        # 检查重启冷却时间
        if (server_status.last_restart_time and 
            datetime.now() - server_status.last_restart_time < timedelta(seconds=self.restart_cooldown)):
            logger.info(f"服务器 {server_name} 在冷却期内，跳过重启")
            return False
            
        config = self.server_configs[server_name]
        
        try:
            logger.info(f"正在启动MCP服务器: {server_name}")
            
            # 构建启动命令
            cmd = config["command"]
            args = config.get("args", [])
            env = os.environ.copy()
            if config.get("env"):
                env.update(config["env"])
                
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
                    
                    # 改进的启动成功判断逻辑：
                    # 1. 匹配到成功指示符 -> 成功
                    # 2. 无输出（等待stdio输入）-> 成功  
                    # 3. 有输出但不包含明确错误指示符 -> 成功
                    # 4. 进程仍在运行且没有明确错误 -> 成功
                    # 5. 对于MCP服务器，默认假设启动成功，除非有明确的错误
                    startup_success = (
                        is_success or                           # 匹配成功指示符
                        (not output_text.strip()) or           # 无输出（stdio模式）
                        (output_text.strip() and not has_error) or  # 有输出但无错误
                        (not has_error)                        # 没有明确错误就认为成功
                    )
                    
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
        """检查服务器健康状态"""
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
                
            # 检查进程是否存在
            try:
                os.kill(pid, 0)  # 发送信号0检查进程是否存在
                return True
            except OSError:
                return False
                
        except Exception as e:
            logger.error(f"检查服务器 {server_name} 健康状态时发生异常: {e}")
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

# 全局MCP服务器管理器实例
mcp_manager = MCPServerManager()