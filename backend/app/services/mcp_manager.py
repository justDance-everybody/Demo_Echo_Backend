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
            
            if process.returncode is None:  # 进程仍在运行
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
                # 进程启动失败
                stdout, stderr = await process.communicate()
                error_msg = stderr.decode() if stderr else "未知错误"
                server_status.error_message = error_msg
                logger.error(f"MCP服务器 {server_name} 启动失败: {error_msg}")
                return False
                
        except Exception as e:
            server_status.error_message = str(e)
            logger.error(f"启动MCP服务器 {server_name} 时发生异常: {e}")
            return False
    
    async def check_server_health(self, server_name: str) -> bool:
        """检查服务器健康状态"""
        try:
            # 这里可以通过MCP客户端ping服务器或检查进程状态
            # 简化实现：检查进程是否还在运行
            server_status = self.servers[server_name]
            
            if not server_status.process_info:
                return False
                
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