#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP工具同步脚本
将MCP服务器中的工具信息同步到数据库中
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.models.tool import Tool
from app.utils.db import get_async_db_session
from app.utils.mcp_client import MCPClientWrapper
from app.services.mcp_manager import mcp_manager

class MCPToolSynchronizer:
    """MCP工具同步器"""

    def __init__(self):
        self.mcp_client = MCPClientWrapper()
        self.synced_tools = 0
        self.updated_tools = 0
        self.failed_tools = 0

    async def sync_all_tools(self) -> Dict[str, Any]:
        """同步所有MCP服务器的工具"""
        logger.info("开始同步MCP工具到数据库...")

        results = {
            "success": True,
            "servers": {},
            "summary": {
                "total_synced": 0,
                "total_updated": 0,
                "total_failed": 0,
                "servers_processed": 0
            }
        }

        # 获取所有MCP服务器状态
        from app.services.mcp_manager import mcp_manager

        for server_name in mcp_manager.servers.keys():
            status = mcp_manager.get_server_status(server_name)
            if not status.running or status.marked_failed:
                status_desc = "已标记失败" if status.marked_failed else "未运行"
                logger.warning(f"跳过MCP服务器: {server_name} (状态: {status_desc})")
                results["servers"][server_name] = {
                    "success": False,
                    "error": f"服务器{status_desc}",
                    "tools_synced": 0
                }
                continue

            try:
                server_result = await self.sync_server_tools(server_name)
                results["servers"][server_name] = server_result
                results["summary"]["servers_processed"] += 1

                if server_result["success"]:
                    results["summary"]["total_synced"] += server_result["tools_synced"]
                    results["summary"]["total_updated"] += server_result["tools_updated"]
                else:
                    results["summary"]["total_failed"] += 1

            except Exception as e:
                logger.error(f"同步服务器 {server_name} 工具时发生异常: {e}")
                results["servers"][server_name] = {
                    "success": False,
                    "error": str(e),
                    "tools_synced": 0
                }
                results["summary"]["total_failed"] += 1

        logger.info(f"MCP工具同步完成: 处理了 {results['summary']['servers_processed']} 个服务器")
        logger.info(f"同步统计: 新增 {results['summary']['total_synced']} 个，更新 {results['summary']['total_updated']} 个，失败 {results['summary']['total_failed']} 个")

        return results

    async def sync_server_tools(self, server_name: str) -> Dict[str, Any]:
        """同步指定服务器的工具"""
        logger.info(f"开始同步服务器 {server_name} 的工具...")

        result = {
            "success": True,
            "tools_synced": 0,
            "tools_updated": 0,
            "tools_failed": 0,
            "error": None
        }

        try:
            # 获取服务器工具信息
            tools_info = await self.mcp_client.get_server_tools(server_name)

            if not tools_info.get("success"):
                error_msg = tools_info.get("error", "未知错误")
                logger.error(f"获取服务器 {server_name} 工具信息失败: {error_msg}")
                result["success"] = False
                result["error"] = error_msg
                return result

            tools = tools_info.get("tools", [])
            logger.info(f"服务器 {server_name} 共有 {len(tools)} 个工具")

            # 同步每个工具
            async for db in get_async_db_session():
                for tool_info in tools:
                    try:
                        sync_result = await self._sync_single_tool(db, server_name, tool_info)
                        if sync_result == "created":
                            result["tools_synced"] += 1
                        elif sync_result == "updated":
                            result["tools_updated"] += 1
                        else:
                            result["tools_failed"] += 1
                    except Exception as e:
                        logger.error(f"同步工具 {tool_info.get('name', 'unknown')} 失败: {e}")
                        logger.error(f"工具信息: {tool_info}")
                        import traceback
                        logger.error(f"详细错误信息: {traceback.format_exc()}")
                        result["tools_failed"] += 1

                # 提交事务
                await db.commit()
                logger.info(f"服务器 {server_name} 工具同步完成: 新增 {result['tools_synced']} 个，更新 {result['tools_updated']} 个")
                break

        except Exception as e:
            logger.error(f"同步服务器 {server_name} 工具时发生异常: {e}")
            result["success"] = False
            result["error"] = str(e)

        return result

    async def _sync_single_tool(self, db: AsyncSession, server_name: str, tool_info: Dict[str, Any]) -> str:
        """同步单个工具到数据库"""
        tool_name = tool_info.get("name")
        if not tool_name:
            logger.warning(f"工具信息缺少名称: {tool_info}")
            return "failed"

        logger.debug(f"开始同步工具: {tool_name} (服务器: {server_name})")

        try:
            # 查询是否已存在
            logger.debug(f"查询现有工具: {tool_name}")
            result = await db.execute(
                select(Tool).where(
                    Tool.tool_id == tool_name,
                    Tool.server_name == server_name
                )
            )
            existing_tool = result.scalars().first()
            logger.debug(f"查询结果: {'找到现有工具' if existing_tool else '未找到现有工具'}")

            # 准备工具数据
            tool_data = {
                "tool_id": tool_name,
                "name": tool_info.get("name", tool_name),
                "description": tool_info.get("description", ""),
                "type": "mcp",
                "server_name": server_name,
                "request_schema": tool_info.get("inputSchema", {}),
                "endpoint": {},  # MCP工具使用空字典而不是None
                "status": "active"  # 使用正确的枚举值
            }
            logger.debug(f"工具数据准备完成: {tool_data}")

            if existing_tool:
                # 更新现有工具
                logger.debug(f"更新现有工具: {tool_name}")
                for key, value in tool_data.items():
                    setattr(existing_tool, key, value)

                logger.info(f"✅ 更新工具: {tool_name} (服务器: {server_name})")
                return "updated"
            else:
                # 创建新工具
                logger.debug(f"创建新工具: {tool_name}")
                new_tool = Tool(**tool_data)
                db.add(new_tool)

                logger.info(f"✅ 创建工具: {tool_name} (服务器: {server_name})")
                return "created"

        except Exception as e:
            logger.error(f"❌ 同步工具 {tool_name} 失败: {e}")
            logger.error(f"工具信息: {tool_info}")
            import traceback
            logger.error(f"详细错误信息: {traceback.format_exc()}")
            raise e  # 重新抛出异常以便上层处理

    async def remove_orphaned_tools(self) -> Dict[str, Any]:
        """移除孤立的MCP工具（对应的服务器不存在或未运行）"""
        logger.info("开始清理孤立的MCP工具...")

        result = {
            "success": True,
            "removed_count": 0,
            "error": None
        }

        try:
            # 获取当前运行的MCP服务器
            from app.services.mcp_manager import mcp_manager
            running_servers = {
                name for name in mcp_manager.servers.keys()
                if mcp_manager.get_server_status(name).running and not mcp_manager.get_server_status(name).marked_failed
            }

            async for db in get_async_db_session():
                try:
                    # 查询所有MCP类型的工具
                    result_query = await db.execute(
                        select(Tool).where(Tool.type == "mcp")
                    )
                    mcp_tools = result_query.scalars().all()

                    # 找出孤立的工具
                    orphaned_tools = [
                        tool for tool in mcp_tools
                        if tool.server_name not in running_servers
                    ]

                    if orphaned_tools:
                        logger.info(f"发现 {len(orphaned_tools)} 个孤立的MCP工具")

                        for tool in orphaned_tools:
                            logger.debug(f"移除孤立工具: {tool.tool_id} (服务器: {tool.server_name})")
                            await db.delete(tool)
                            result["removed_count"] += 1

                        await db.commit()
                        logger.info(f"已移除 {result['removed_count']} 个孤立的MCP工具")
                    else:
                        logger.info("未发现孤立的MCP工具")

                    break

                except Exception as e:
                    await db.rollback()
                    logger.error(f"清理孤立工具时数据库操作失败: {e}")
                    result["success"] = False
                    result["error"] = str(e)
                    break

        except Exception as e:
            logger.error(f"清理孤立工具时发生异常: {e}")
            result["success"] = False
            result["error"] = str(e)

        return result

async def main():
    """主函数"""
    try:
        # 确保MCP服务器正在运行
        logger.info("检查MCP服务器状态...")
        from app.services.mcp_manager import mcp_manager

        # MCP管理器已在初始化时加载配置

        running_servers = [
            name for name in mcp_manager.servers.keys()
            if mcp_manager.get_server_status(name).running and not mcp_manager.get_server_status(name).marked_failed
        ]

        if not running_servers:
            logger.warning("没有运行中的MCP服务器，尝试启动...")
            await mcp_manager.start_all_servers()

            # 重新检查状态
            running_servers = [
                name for name in mcp_manager.servers.keys()
                if mcp_manager.get_server_status(name).running and not mcp_manager.get_server_status(name).marked_failed
            ]

        if not running_servers:
            logger.error("无法启动任何MCP服务器，同步终止")
            return

        logger.info(f"发现 {len(running_servers)} 个运行中的MCP服务器: {', '.join(running_servers)}")

        # 创建同步器并执行同步
        synchronizer = MCPToolSynchronizer()

        # 同步工具
        sync_result = await synchronizer.sync_all_tools()

        # 清理孤立工具
        cleanup_result = await synchronizer.remove_orphaned_tools()

        # 输出结果
        print("\n=== MCP工具同步结果 ===")
        print(f"处理服务器数: {sync_result['summary']['servers_processed']}")
        print(f"新增工具数: {sync_result['summary']['total_synced']}")
        print(f"更新工具数: {sync_result['summary']['total_updated']}")
        print(f"失败工具数: {sync_result['summary']['total_failed']}")
        print(f"清理孤立工具数: {cleanup_result['removed_count']}")

        if sync_result["success"] and cleanup_result["success"]:
            print("\n✅ 同步完成")
        else:
            print("\n❌ 同步过程中出现错误")
            if not sync_result["success"]:
                print(f"同步错误: {sync_result.get('error', '未知错误')}")
            if not cleanup_result["success"]:
                print(f"清理错误: {cleanup_result.get('error', '未知错误')}")

    except Exception as e:
        logger.error(f"同步脚本执行失败: {e}")
        print(f"\n❌ 同步失败: {e}")

if __name__ == "__main__":
    asyncio.run(main())
