#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP服务器状态管理API
提供MCP服务器状态查询、重启等管理功能
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from loguru import logger
from app.services.mcp_manager import mcp_manager
from app.utils.security import get_current_user, get_admin_user

router = APIRouter()

@router.get("/mcp/status", 
           summary="获取所有MCP服务器状态",
           description="获取系统中所有MCP服务器的运行状态信息，包括运行状态、重启次数等。")
async def get_mcp_servers_status(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取所有MCP服务器状态
    
    Returns:
        Dict[str, Any]: 包含所有MCP服务器状态信息的字典
    """
    try:
        # 获取所有服务器状态
        servers_status = {}
        for server_name in mcp_manager.servers.keys():
            status = mcp_manager.get_server_status(server_name)
            servers_status[server_name] = {
                "status": "running" if status.running else "stopped",
                "is_blacklisted": status.marked_failed,
                "restart_count": status.restart_count,
                "consecutive_failures": status.consecutive_failures,
                "last_restart_time": status.last_restart_time.isoformat() if status.last_restart_time else None
            }
        
        # 统计信息
        total_servers = len(servers_status)
        running_servers = sum(1 for s in servers_status.values() if s['status'] == 'running')
        failed_servers = sum(1 for s in servers_status.values() if s['status'] != 'running')
        blacklisted_servers = sum(1 for s in servers_status.values() if s['is_blacklisted'])
        
        return {
            "success": True,
            "data": {
                "servers": servers_status,
                "summary": {
                    "total": total_servers,
                    "running": running_servers,
                    "failed": failed_servers,
                    "blacklisted": blacklisted_servers
                }
            }
        }
    except Exception as e:
        logger.error(f"获取MCP服务器状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取MCP服务器状态失败: {str(e)}")

@router.get("/mcp/status/{server_name}",
           summary="获取指定MCP服务器状态",
           description="获取指定名称的MCP服务器的详细状态信息。")
async def get_mcp_server_status(
    server_name: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取指定MCP服务器状态
    
    Args:
        server_name: MCP服务器名称
        
    Returns:
        Dict[str, Any]: 指定MCP服务器的状态信息
    """
    try:
        if server_name not in mcp_manager.servers:
            raise HTTPException(status_code=404, detail=f"MCP服务器 '{server_name}' 不存在")
        
        status = mcp_manager.get_server_status(server_name)
        server_data = {
            "status": "running" if status.running else "stopped",
            "is_blacklisted": status.marked_failed,
            "restart_count": status.restart_count,
            "consecutive_failures": status.consecutive_failures,
            "last_restart_time": status.last_restart_time.isoformat() if status.last_restart_time else None
        }
        
        return {
            "success": True,
            "data": server_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取MCP服务器 '{server_name}' 状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取MCP服务器状态失败: {str(e)}")

@router.post("/mcp/restart/{server_name}",
            summary="重启MCP服务器",
            description="重启指定的MCP服务器。需要管理员权限。")
async def restart_mcp_server(
    server_name: str,
    current_user: dict = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    重启指定的MCP服务器
    
    Args:
        server_name: MCP服务器名称
        
    Returns:
        Dict[str, Any]: 重启操作结果
    """
    try:
        logger.info(f"用户 {current_user.username} 请求重启MCP服务器: {server_name}")
        
        # 检查服务器是否存在
        if server_name not in mcp_manager.servers:
            raise HTTPException(status_code=404, detail=f"MCP服务器 '{server_name}' 不存在")
        
        # 检查是否在黑名单中
        status = mcp_manager.get_server_status(server_name)
        if status.marked_failed:
            raise HTTPException(
                status_code=400, 
                detail=f"MCP服务器 '{server_name}' 已被标记为失败，无法重启"
            )
        
        # 执行重启
        success = await mcp_manager.restart_server(server_name)
        
        if success:
            logger.info(f"MCP服务器 '{server_name}' 重启成功")
            return {
                "success": True,
                "message": f"MCP服务器 '{server_name}' 重启成功"
            }
        else:
            logger.error(f"MCP服务器 '{server_name}' 重启失败")
            return {
                "success": False,
                "message": f"MCP服务器 '{server_name}' 重启失败"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重启MCP服务器 '{server_name}' 时发生异常: {e}")
        raise HTTPException(status_code=500, detail=f"重启MCP服务器失败: {str(e)}")

@router.post("/mcp/start/{server_name}",
            summary="启动MCP服务器",
            description="启动指定的MCP服务器。需要管理员权限。")
async def start_mcp_server(
    server_name: str,
    current_user: dict = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    启动指定的MCP服务器
    
    Args:
        server_name: MCP服务器名称
        
    Returns:
        Dict[str, Any]: 启动操作结果
    """
    try:
        logger.info(f"用户 {current_user.username} 请求启动MCP服务器: {server_name}")
        
        # 检查服务器是否存在
        if server_name not in mcp_manager.servers:
            raise HTTPException(status_code=404, detail=f"MCP服务器 '{server_name}' 不存在")
        
        # 检查是否在黑名单中
        status = mcp_manager.get_server_status(server_name)
        if status.marked_failed:
            raise HTTPException(
                status_code=400, 
                detail=f"MCP服务器 '{server_name}' 已被标记为失败，无法启动"
            )
        
        # 执行启动
        success = await mcp_manager.start_server(server_name)
        
        if success:
            logger.info(f"MCP服务器 '{server_name}' 启动成功")
            return {
                "success": True,
                "message": f"MCP服务器 '{server_name}' 启动成功"
            }
        else:
            logger.error(f"MCP服务器 '{server_name}' 启动失败")
            return {
                "success": False,
                "message": f"MCP服务器 '{server_name}' 启动失败"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动MCP服务器 '{server_name}' 时发生异常: {e}")
        raise HTTPException(status_code=500, detail=f"启动MCP服务器失败: {str(e)}")

@router.post("/mcp/stop/{server_name}",
            summary="停止MCP服务器",
            description="停止指定的MCP服务器。需要管理员权限。")
async def stop_mcp_server(
    server_name: str,
    current_user: dict = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    停止指定的MCP服务器
    
    Args:
        server_name: MCP服务器名称
        
    Returns:
        Dict[str, Any]: 停止操作结果
    """
    try:
        logger.info(f"用户 {current_user.username} 请求停止MCP服务器: {server_name}")
        
        # 检查服务器是否存在
        if server_name not in mcp_manager.servers:
            raise HTTPException(status_code=404, detail=f"MCP服务器 '{server_name}' 不存在")
        
        # 执行停止
        success = await mcp_manager.stop_server(server_name)
        
        if success:
            logger.info(f"MCP服务器 '{server_name}' 停止成功")
            return {
                "success": True,
                "message": f"MCP服务器 '{server_name}' 停止成功"
            }
        else:
            logger.error(f"MCP服务器 '{server_name}' 停止失败")
            return {
                "success": False,
                "message": f"MCP服务器 '{server_name}' 停止失败"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停止MCP服务器 '{server_name}' 时发生异常: {e}")
        raise HTTPException(status_code=500, detail=f"停止MCP服务器失败: {str(e)}")