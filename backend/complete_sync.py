#!/usr/bin/env python3
"""
完整的MCP工具同步脚本
使用独立进程方式获取所有MCP服务器的工具信息并同步到数据库
"""

import sys
import os
import json
import subprocess
import asyncio
import shutil
from typing import Dict, List, Any
import pkg_resources
from packaging import version

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.tool import Tool
from app.config import settings

def get_python_executable() -> str:
    """
    获取Python可执行文件路径
    统一使用项目根目录的虚拟环境
    """
    # 获取项目根目录: /home/devbox/project
    # 当前文件: /home/devbox/project/Backend/backend/complete_sync.py
    current_dir = os.path.dirname(os.path.abspath(__file__))  # /home/devbox/project/Backend/backend
    backend_dir = os.path.dirname(current_dir)  # /home/devbox/project/Backend
    project_root = os.path.dirname(backend_dir)  # /home/devbox/project
    
    # 1. 优先使用Backend目录的虚拟环境（统一环境）
    backend_venv = os.path.join(backend_dir, '.venv', 'bin', 'python')
    if os.path.isfile(backend_venv):
        return backend_venv
    
    # 2. 备选：使用当前Python解释器
    if sys.executable and os.path.isfile(sys.executable):
        return sys.executable
    
    # 3. 最后备选：系统Python
    for python_name in ['python3', 'python']:
        python_path = shutil.which(python_name)
        if python_path and os.path.isfile(python_path):
            return python_path
    
    return 'python3'

class CompleteMCPSync:
    def __init__(self):
        # 数据库连接
        self.engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # MCP配置
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.project_root = os.path.dirname(self.backend_dir)
        self.mcp_client_dir = os.path.join(self.project_root, "MCP_Client")
        self.config_file = os.path.join(self.mcp_client_dir, "config", "mcp_servers.json")
        
        self.synced_count = 0
        self.updated_count = 0
        self.failed_count = 0
        
        # 版本要求配置
        self.version_requirements = {
            'mcp': '1.13.0',  # MCP客户端库最低版本
            'sqlalchemy': '1.4.0',  # SQLAlchemy最低版本
            'packaging': '20.0'  # packaging库最低版本
        }
    
    def check_dependencies_version(self) -> bool:
        """检查关键依赖的版本兼容性"""
        # 检查是否启用版本检查
        if not self._is_version_check_enabled():
            print("ℹ️ 版本检查已禁用，跳过依赖版本检查\n")
            return True
            
        print("🔍 检查依赖版本兼容性...")
        
        version_issues = []
        
        for package_name, min_version in self.version_requirements.items():
            try:
                installed_version = pkg_resources.get_distribution(package_name).version
                
                if version.parse(installed_version) < version.parse(min_version):
                    version_issues.append(
                        f"  ❌ {package_name}: 当前版本 {installed_version}, 需要 >= {min_version}"
                    )
                else:
                    print(f"  ✅ {package_name}: {installed_version} (>= {min_version})")
                    
            except pkg_resources.DistributionNotFound:
                version_issues.append(f"  ❌ {package_name}: 未安装")
            except Exception as e:
                version_issues.append(f"  ⚠️ {package_name}: 版本检查失败 - {e}")
        
        if version_issues:
            print("\n⚠️ 发现版本兼容性问题:")
            for issue in version_issues:
                print(issue)
            print("\n💡 建议执行以下命令升级依赖:")
            print("   pip install --upgrade mcp sqlalchemy packaging")
            
            # 检查是否严格模式
            if self._is_version_check_strict():
                print("\n❌ 严格模式已启用，程序将退出")
                return False
            else:
                print("\n⚠️ 继续运行可能会遇到兼容性问题...\n")
                return False
        
        print("✅ 所有依赖版本检查通过\n")
        return True
    
    def _is_version_check_enabled(self) -> bool:
        """检查是否启用版本检查"""
        return os.environ.get('VERSION_CHECK_ENABLED', 'true').lower() == 'true'
    
    def _is_version_check_strict(self) -> bool:
        """检查是否启用严格版本检查模式"""
        return os.environ.get('VERSION_CHECK_STRICT', 'false').lower() == 'true'
    
    def _is_version_suggest_enabled(self) -> bool:
        """检查是否在错误时显示版本建议"""
        return os.environ.get('VERSION_SUGGEST_ON_ERROR', 'true').lower() == 'true'
    
    def _suggest_version_check_on_error(self, server_name: str, error_msg: str):
        """在MCP连接错误时建议进行版本检查"""
        # 检查是否启用错误时版本建议
        if not self._is_version_suggest_enabled():
            return
            
        # 检查是否可能是版本兼容性问题
        version_related_keywords = [
            "timeout", "超时", "connection", "连接", "protocol", "协议",
            "incompatible", "不兼容", "version", "版本", "failed", "失败"
        ]
        
        error_lower = error_msg.lower()
        if any(keyword in error_lower for keyword in version_related_keywords):
            print(f"\n💡 {server_name} 连接问题可能与版本兼容性有关")
            print("   建议检查以下版本兼容性:")
            print("   1. 执行: pip install --upgrade mcp")
            print("   2. 检查MCP服务器版本是否与客户端兼容")
            print("   3. 重新启动MCP服务器进程")
            print("   4. 可在.env中设置VERSION_SUGGEST_ON_ERROR=false禁用此提示")
    
    def load_mcp_config(self) -> Dict[str, Any]:
        """加载MCP服务器配置"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('mcpServers', {})
        except Exception as e:
            print(f"❌ 加载MCP配置失败: {e}")
            return {}

    async def get_server_tools_via_subprocess(self, server_name: str) -> List[Dict[str, Any]]:
        """通过独立进程获取服务器工具信息"""
        print(f"🔍 获取服务器 {server_name} 的工具信息...")
        
        try:
            # 使用我们的独立脚本，但只获取工具列表，不执行具体工具
            script_path = os.path.join(self.mcp_client_dir, "get_tools.py")
            
            # 创建一个专门获取工具列表的脚本
            if not os.path.exists(script_path):
                await self.create_get_tools_script(script_path)
            
            # 执行独立进程获取工具
            # 使用通用的Python路径检测方法
            python_path = get_python_executable()
            print(f"🐍 使用Python解释器: {python_path}")
            cmd = [
                python_path,
                script_path,
                server_name
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.mcp_client_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=60.0
            )
            
            stdout_text = stdout.decode('utf-8', errors='replace')
            stderr_text = stderr.decode('utf-8', errors='replace')
            
            if stderr_text:
                print(f"⚠️ 服务器 {server_name} 获取工具时有警告: {stderr_text[:200]}")
            
            # 解析工具列表JSON
            result_start = "--- TOOLS_JSON_START ---"
            result_end = "--- TOOLS_JSON_END ---"
            
            if result_start in stdout_text and result_end in stdout_text:
                start_index = stdout_text.find(result_start) + len(result_start)
                end_index = stdout_text.find(result_end)
                tools_json = stdout_text[start_index:end_index].strip()
                
                try:
                    tools_data = json.loads(tools_json)
                    if tools_data.get("success"):
                        tools = tools_data.get("tools", [])
                        print(f"✅ 服务器 {server_name} 发现 {len(tools)} 个工具")
                        return tools
                    else:
                        print(f"❌ 服务器 {server_name} 获取工具失败: {tools_data.get('error', '未知错误')}")
                        return []
                except json.JSONDecodeError as e:
                    print(f"❌ 解析服务器 {server_name} 工具JSON失败: {e}")
                    return []
            else:
                print(f"❌ 服务器 {server_name} 输出格式异常")
                if process.returncode != 0:
                    print(f"进程退出码: {process.returncode}")
                    if stderr_text:
                        print(f"错误输出: {stderr_text}")
                return []
                
        except asyncio.TimeoutError:
            print(f"⏰ 服务器 {server_name} 获取工具超时")
            self._suggest_version_check_on_error(server_name, "连接超时")
            return []
        except Exception as e:
            print(f"❌ 获取服务器 {server_name} 工具时出错: {e}")
            self._suggest_version_check_on_error(server_name, str(e))
            return []

    async def create_get_tools_script(self, script_path: str):
        """创建获取工具列表的独立脚本"""
        script_content = '''#!/usr/bin/env python3
"""
获取MCP服务器工具列表的独立脚本
"""

import asyncio
import json
import sys
import os
import time

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_client import MCPClient

async def get_tools(server_name: str):
    """获取指定服务器的工具列表"""
    client = None
    try:
        print(f"🚀 连接MCP服务器: {server_name}")
        start_time = time.time()
        
        # 创建客户端并连接
        client = MCPClient()
        await client.connect(server_name)
        
        connect_time = time.time() - start_time
        print(f"✅ 连接成功，耗时: {connect_time:.2f}秒")
        
        # 获取工具列表
        if hasattr(client, 'tools') and client.tools:
            tools_list = []
            for tool in client.tools:
                tool_info = {
                    "name": tool.name,
                    "description": tool.description or "",
                    "inputSchema": tool.inputSchema or {}
                }
                tools_list.append(tool_info)
            
            result = {
                "success": True,
                "tools": tools_list,
                "server_name": server_name,
                "tool_count": len(tools_list)
            }
            print(f"📋 找到 {len(tools_list)} 个工具")
            
        else:
            result = {
                "success": False,
                "error": "未找到任何工具",
                "tools": [],
                "server_name": server_name
            }
            print("⚠️ 未找到任何工具")
        
        return result
        
    except Exception as e:
        print(f"❌ 获取工具失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "tools": [],
            "server_name": server_name
        }
        
    finally:
        if client:
            try:
                await client.close()
                print("✅ 连接已关闭")
            except Exception as e:
                print(f"⚠️ 关闭连接时出错: {e}")

async def main():
    """主入口函数"""
    if len(sys.argv) != 2:
        print("使用方法: python get_tools.py <server_name>")
        sys.exit(1)
    
    server_name = sys.argv[1]
    
    # 获取工具列表
    result = await get_tools(server_name)
    
    # 输出结果为JSON格式
    print("\\n--- TOOLS_JSON_START ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("--- TOOLS_JSON_END ---")
    
    # 根据结果设置退出码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    asyncio.run(main())
'''
        
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        # 设置执行权限
        os.chmod(script_path, 0o755)
        print(f"✅ 创建工具获取脚本: {script_path}")

    def sync_tools_to_database(self, server_name: str, tools: List[Dict[str, Any]]) -> Dict[str, int]:
        """将工具同步到数据库"""
        db = self.SessionLocal()
        
        try:
            synced = 0
            updated = 0
            failed = 0
            
            for tool_info in tools:
                try:
                    tool_name = tool_info.get("name")
                    if not tool_name:
                        print(f"⚠️ 跳过无名称工具: {tool_info}")
                        failed += 1
                        continue
                    
                    # 查询是否已存在
                    existing = db.query(Tool).filter(
                        Tool.tool_id == tool_name,
                        Tool.server_name == server_name
                    ).first()
                    
                    # 准备工具数据
                    tool_data = {
                        "name": tool_info.get("name", tool_name),
                        "description": tool_info.get("description", ""),
                        "type": "mcp",
                        "server_name": server_name,
                        "request_schema": tool_info.get("inputSchema", {}),
                        "response_schema": None,
                        "endpoint": {
                            "mcp_tool_name": tool_name
                        },
                        "is_public": True,
                        "status": "active",
                        "version": "1.0.0",
                        "tags": [server_name, "mcp"],
                        "download_count": 0
                    }
                    
                    if existing:
                        # 更新现有工具
                        for key, value in tool_data.items():
                            setattr(existing, key, value)
                        updated += 1
                        print(f"🔄 更新工具: {tool_name}")
                    else:
                        # 创建新工具
                        new_tool = Tool(
                            tool_id=tool_name,
                            **tool_data
                        )
                        db.add(new_tool)
                        synced += 1
                        print(f"➕ 添加工具: {tool_name}")
                
                except Exception as e:
                    print(f"❌ 同步工具 {tool_info.get('name', 'unknown')} 失败: {e}")
                    failed += 1
            
            # 提交更改
            db.commit()
            
            return {
                "synced": synced,
                "updated": updated,
                "failed": failed
            }
            
        except Exception as e:
            print(f"❌ 数据库操作失败: {e}")
            db.rollback()
            return {"synced": 0, "updated": 0, "failed": len(tools)}
        finally:
            db.close()

    async def sync_all_servers(self):
        """同步所有MCP服务器的工具"""
        print("🚀 开始完整MCP工具同步...")
        
        # 加载配置
        servers_config = self.load_mcp_config()
        if not servers_config:
            print("❌ 没有找到MCP服务器配置")
            return
        
        print(f"📋 发现 {len(servers_config)} 个MCP服务器:")
        for server_name, config in servers_config.items():
            enabled = config.get('enabled', False)
            print(f"  - {server_name}: {'启用' if enabled else '禁用'} ({config.get('name', 'N/A')})")
        
        # 同步每个启用的服务器
        for server_name, config in servers_config.items():
            if not config.get('enabled', False):
                print(f"⏭️ 跳过禁用的服务器: {server_name}")
                continue
            
            print(f"\n🔄 同步服务器: {server_name}")
            
            # 获取工具列表
            tools = await self.get_server_tools_via_subprocess(server_name)
            
            if not tools:
                print(f"⚠️ 服务器 {server_name} 没有可用工具")
                continue
            
            # 同步到数据库
            sync_result = self.sync_tools_to_database(server_name, tools)
            
            self.synced_count += sync_result["synced"]
            self.updated_count += sync_result["updated"]
            self.failed_count += sync_result["failed"]
            
            print(f"📊 服务器 {server_name} 同步完成: 新增 {sync_result['synced']} | 更新 {sync_result['updated']} | 失败 {sync_result['failed']}")

    def print_summary(self):
        """打印同步结果摘要"""
        print(f"\n{'='*50}")
        print("📊 本次同步结果摘要")
        print(f"{'='*50}")
        print(f"✅ 新增工具: {self.synced_count}")
        print(f"🔄 更新工具: {self.updated_count}")
        print(f"❌ 失败工具: {self.failed_count}")
        print(f"📈 本次处理: {self.synced_count + self.updated_count + self.failed_count}")
        
        # 只有在有成功同步的工具时才显示数据库状态
        if self.synced_count + self.updated_count > 0:
            db = self.SessionLocal()
            try:
                all_tools = db.query(Tool).all()
                print(f"\n📋 数据库中现有 {len(all_tools)} 个工具:")
                
                # 按服务器分组显示
                servers = {}
                for tool in all_tools:
                    server = tool.server_name or "未知服务器"
                    if server not in servers:
                        servers[server] = []
                    servers[server].append(tool)
                
                for server_name, tools in servers.items():
                    print(f"\n🔧 {server_name} ({len(tools)} 个工具):")
                    for tool in tools:
                        print(f"  - {tool.tool_id}: {tool.name}")
                        
            finally:
                db.close()
        else:
            print(f"\n⚠️ 本次同步没有成功处理任何工具，数据库状态未改变")

async def main():
    """主函数"""
    sync_manager = CompleteMCPSync()
    
    # 启动时版本检查
    if not sync_manager.check_dependencies_version():
        if sync_manager._is_version_check_strict():
            print("❌ 严格模式下检测到版本兼容性问题，程序退出")
            return
        else:
            print("⚠️ 检测到版本兼容性问题，建议先解决版本问题再继续")
            print("   可在.env中设置VERSION_CHECK_STRICT=true启用严格模式")
    
    try:
        await sync_manager.sync_all_servers()
        sync_manager.print_summary()
        
        if sync_manager.synced_count + sync_manager.updated_count > 0:
            print(f"\n🎉 同步成功完成!")
        else:
            print(f"\n⚠️ 没有成功同步任何工具")
            
    except Exception as e:
        print(f"\n❌ 同步过程中出现异常: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())