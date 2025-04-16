import json
import os
import re
from typing import Dict, List, Any, Optional
from pathlib import Path

from src.utils.logger import get_logger, info, error, debug, warning

logger = get_logger()

class ServerConfigError(Exception):
    """服务器配置错误异常"""
    pass

class ServerConfig:
    """MCP服务器配置管理器"""
    
    def __init__(self, config_path: str = None):
        """初始化服务器配置管理器
        
        Args:
            config_path: 配置文件路径，如果为None则使用默认路径
        """
        if config_path is None:
            # 使用默认路径 - 从当前文件位置计算
            current_dir = os.path.dirname(os.path.abspath(__file__))
            base_dir = os.path.dirname(os.path.dirname(current_dir))
            config_path = os.path.join(base_dir, 'config', 'mcp_servers.json')
            
        debug(f"正在加载服务器配置: {config_path}")
        self.config_path = config_path
        self.config = self._load_config()
        
        # 验证配置
        self._validate_config()
        
        info(f"已加载MCP服务器配置，发现 {len(self.get_available_servers())} 个可用服务器")
    
    def _load_config(self) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            return config
        except FileNotFoundError:
            error(f"找不到配置文件: {self.config_path}")
            raise ServerConfigError(f"配置文件未找到: {self.config_path}")
        except json.JSONDecodeError as e:
            error(f"配置文件JSON格式错误: {e}")
            raise ServerConfigError(f"配置文件格式错误: {e}")
    
    def _validate_config(self):
        """验证配置文件的有效性"""
        if "mcpServers" not in self.config:
            raise ServerConfigError("配置文件缺少 'mcpServers' 字段")
        
        if not isinstance(self.config["mcpServers"], dict):
            raise ServerConfigError("'mcpServers' 字段必须是一个对象")
        
        # 验证每个服务器配置
        for server_id, server_config in self.config["mcpServers"].items():
            required_fields = ["command", "args"] if "url" not in server_config else ["url"]
            for field in required_fields:
                if field not in server_config:
                    raise ServerConfigError(f"服务器 '{server_id}' 缺少必需的字段 '{field}'")
    
    def get_available_servers(self) -> List[str]:
        """获取所有已启用的服务器ID列表"""
        available_servers = []
        for server_id, server_config in self.config["mcpServers"].items():
            if server_config.get("enabled", True):  # 默认启用
                available_servers.append(server_id)
        return available_servers
    
    def get_default_server(self) -> Optional[str]:
        """获取默认服务器ID"""
        default_server = self.config.get("defaultServer")
        if default_server and default_server in self.get_available_servers():
            return default_server
        
        # 如果未指定或默认服务器不可用，返回第一个可用的服务器
        available_servers = self.get_available_servers()
        return available_servers[0] if available_servers else None
    
    def get_server_config(self, server_id: str) -> Dict[str, Any]:
        """获取指定服务器的完整配置
        
        Args:
            server_id: 服务器ID
            
        Returns:
            服务器配置字典
        """
        if server_id not in self.config["mcpServers"]:
            raise ServerConfigError(f"未知的服务器ID: {server_id}")
        
        if server_id not in self.get_available_servers():
            raise ServerConfigError(f"服务器 '{server_id}' 已禁用")
        
        # 获取原始配置
        server_config = self.config["mcpServers"][server_id].copy()
        
        # 应用模板（如果指定了类型）
        if "type" in server_config and "templates" in self.config:
            server_type = server_config["type"]
            if server_type in self.config["templates"]:
                template = self.config["templates"][server_type]
                
                # 合并模板和服务器特定配置
                for key, value in template.items():
                    if key not in server_config:
                        server_config[key] = value
        
        return server_config
    
    def get_server_command(self, server_id: str) -> tuple:
        """获取用于启动服务器的命令和参数
        
        Args:
            server_id: 服务器ID
            
        Returns:
            (command, args, env) 元组，或者 (url,) 如果是URL类型服务器
        """
        server_config = self.get_server_config(server_id)
        
        # 处理URL类型的服务器
        if "url" in server_config:
            return (server_config["url"],)
        
        command = server_config["command"]
        args = self._process_args(server_config["args"], server_id)
        env = self._process_env(server_config.get("env", {}))
        
        # 合并全局环境变量
        if "environmentVariables" in self.config:
            global_env = self.config["environmentVariables"]
            if env is None:
                env = global_env
            else:
                env = {**global_env, **env}
        
        return command, args, env
    
    def _process_args(self, args: List[str], server_id: str) -> List[str]:
        """处理参数中的变量占位符
        
        Args:
            args: 原始参数列表
            server_id: 服务器ID
            
        Returns:
            处理后的参数列表
        """
        processed_args = []
        server_root = self.config.get("serverRoot", "")
        
        for arg in args:
            if isinstance(arg, str):
                # 处理服务器根目录变量
                arg = arg.replace("{SERVER_ROOT}", server_root)
                
                # 处理服务器名称变量
                arg = arg.replace("{name}", server_id)
                
                # 处理其他可能的变量
                arg = self._replace_env_vars(arg)
            
            processed_args.append(arg)
        
        return processed_args
    
    def _process_env(self, env_config: Dict[str, str]) -> Dict[str, str]:
        """处理环境变量配置
        
        Args:
            env_config: 环境变量配置
            
        Returns:
            处理后的环境变量字典
        """
        if not env_config:
            return None
            
        processed_env = {}
        
        for key, value in env_config.items():
            if isinstance(value, str):
                # 处理环境变量引用
                value = self._replace_env_vars(value)
            
            processed_env[key] = value
        
        return processed_env
    
    def _replace_env_vars(self, text: str) -> str:
        """替换字符串中的环境变量引用
        
        Args:
            text: 包含环境变量引用的字符串
            
        Returns:
            替换后的字符串
        """
        if not text or not isinstance(text, str):
            return text
            
        # 匹配 {ENV_VAR} 格式的环境变量引用
        pattern = r'\{([A-Za-z0-9_]+)\}'
        
        def replace_var(match):
            var_name = match.group(1)
            env_value = os.environ.get(var_name)
            
            if env_value is not None:
                return env_value
            else:
                # 如果环境变量不存在，保留原始占位符
                warning(f"环境变量 '{var_name}' 未定义")
                return match.group(0)
        
        return re.sub(pattern, replace_var, text)

# 提供一个全局实例以便轻松访问
_instance = None

def get_server_config(config_path: str = None) -> ServerConfig:
    """获取服务器配置实例
    
    Args:
        config_path: 配置文件路径，仅在首次调用时使用
        
    Returns:
        ServerConfig 实例
    """
    global _instance
    if _instance is None:
        _instance = ServerConfig(config_path)
    return _instance 