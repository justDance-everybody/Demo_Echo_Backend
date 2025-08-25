#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCPServerManager pytest 测试文件
测试 backend/app/services/mcp_manager.py 中的 MCPServerManager 功能
"""

import pytest
import pytest_asyncio
import asyncio
import sys
import time
from pathlib import Path
from typing import Dict, Any

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 自动加载环境变量
try:
    from dotenv import load_dotenv

    # 加载 backend/.env 文件
    backend_env_path = project_root / "backend" / ".env"
    if backend_env_path.exists():
        print(f"🔧 自动加载环境变量文件: {backend_env_path}")
        load_dotenv(backend_env_path)
        print("✅ 环境变量加载成功")
    else:
        print(f"⚠️  环境变量文件不存在: {backend_env_path}")

except ImportError:
    print("⚠️  python-dotenv 未安装，无法自动加载环境变量")


@pytest_asyncio.fixture
async def mcp_manager():
    """创建 MCPServerManager 实例的 fixture"""
    from app.services.mcp_manager import MCPServerManager
    manager = MCPServerManager()
    yield manager
    # 清理资源
    if hasattr(manager, 'close_all_connections'):
        await manager.close_all_connections()


class TestMCPServerManager:
    """MCPServerManager 测试类"""

    @pytest.mark.asyncio
    async def test_config_loading(self, mcp_manager):
        """测试配置加载功能"""
        # 验证配置已加载
        assert mcp_manager.server_configs, "服务器配置应该被加载"

        # 验证配置数量
        config_count = len(mcp_manager.server_configs)
        assert config_count > 0, f"应该加载至少1个服务器配置，实际: {config_count}"

        # 验证配置内容
        for server_name, config in mcp_manager.server_configs.items():
            assert 'command' in config, f"服务器 {server_name} 缺少 command 字段"
            assert 'description' in config, f"服务器 {server_name} 缺少 description 字段"
            assert 'enabled' in config, f"服务器 {server_name} 缺少 enabled 字段"

        print(f"✅ 成功加载 {config_count} 个服务器配置")

        # 显示配置详情
        for server_name, config in mcp_manager.server_configs.items():
            enabled = config.get('enabled', True)
            status = "✅ 启用" if enabled else "❌ 禁用"
            print(f"  📋 {server_name}: {status}")
            print(f"     命令: {config.get('command', 'N/A')}")
            print(f"     描述: {config.get('description', 'N/A')}")

            # 显示环境变量
            env_vars = config.get('env', {})
            if env_vars:
                print(f"     环境变量: {list(env_vars.keys())}")
            print()

    @pytest.mark.asyncio
    async def test_environment_validation(self, mcp_manager):
        """测试环境变量验证功能"""
        # 验证环境变量验证规则存在
        assert hasattr(mcp_manager, '_env_validation_rules'), "环境变量验证规则应该存在"

        rules = mcp_manager._env_validation_rules
        assert len(rules) > 0, "应该生成至少1个服务器的环境变量验证规则"

        print(f"✅ 生成了 {len(rules)} 个服务器的环境变量验证规则")

        for server_name, rule in rules.items():
            required = rule.get('required', [])
            optional = rule.get('optional', [])
            print(f"  📋 {server_name}:")
            print(f"     必需变量: {required}")
            print(f"     可选变量: {optional}")

    @pytest.mark.asyncio
    async def test_server_status_management(self, mcp_manager):
        """测试服务器状态管理"""
        # 验证服务器状态管理存在
        assert hasattr(mcp_manager, 'servers'), "服务器状态管理应该存在"

        servers = mcp_manager.servers
        assert len(servers) > 0, "应该管理至少1个服务器状态"

        print(f"✅ 管理 {len(servers)} 个服务器状态")

        for server_name, status in servers.items():
            print(f"  📋 {server_name}:")
            print(f"     启用状态: {status.enabled}")
            print(f"     运行状态: {status.running}")
            print(f"     重启次数: {status.restart_count}")
            print(f"     连续失败: {status.consecutive_failures}")
            print(f"     标记失败: {status.marked_failed}")
            if status.error_message:
                print(f"     错误信息: {status.error_message}")
            print()

    @pytest.mark.asyncio
    async def test_startup_locks(self, mcp_manager):
        """测试启动锁机制"""
        # 验证启动锁机制存在
        assert hasattr(mcp_manager, '_startup_locks'), "启动锁机制应该存在"

        locks = mcp_manager._startup_locks
        print(f"✅ 启动锁机制正常，当前锁数量: {len(locks)}")

        # 测试创建新锁
        test_server = "test-server"
        if test_server not in locks:
            locks[test_server] = asyncio.Lock()
            print(f"✅ 成功创建测试服务器锁: {test_server}")

        # 验证锁可以正常工作
        async with locks[test_server]:
            print("✅ 锁机制工作正常")

    @pytest.mark.asyncio
    async def test_performance_metrics(self, mcp_manager):
        """测试性能指标系统"""
        # 验证性能指标系统存在
        assert hasattr(mcp_manager, 'performance_metrics'), "性能指标系统应该存在"

        metrics = mcp_manager.performance_metrics
        print(f"✅ 性能指标系统正常，监控服务器数: {len(metrics)}")

        # 测试告警规则
        if hasattr(mcp_manager, 'alert_rules'):
            alert_rules = mcp_manager.alert_rules
            print(f"📊 告警规则数量: {len(alert_rules)}")

            for rule_name, rule in alert_rules.items():
                print(f"  📋 {rule_name}:")
                print(f"     指标: {rule.metric}")
                print(f"     阈值: {rule.threshold}")
                print(f"     操作符: {rule.operator}")
                print(f"     持续时间: {rule.duration_seconds}秒")
                print(f"     启用状态: {rule.enabled}")
        else:
            print("⚠️  告警规则系统不存在")

    @pytest.mark.asyncio
    async def test_server_health_check(self, mcp_manager):
        """测试服务器健康检查"""
        # 验证健康检查方法存在
        assert hasattr(mcp_manager, 'check_server_health'), "check_server_health 方法应该存在"

        # 获取启用的服务器
        enabled_servers = [name for name, status in mcp_manager.servers.items()
                         if status.enabled]

        assert len(enabled_servers) > 0, "应该至少有一个启用的服务器"

        test_server = enabled_servers[0]
        print(f"🔍 测试服务器健康检查: {test_server}")

        # 执行健康检查
        health_result = await mcp_manager.check_server_health(test_server)
        print(f"✅ 健康检查完成: {health_result}")

        # 验证健康检查结果
        assert health_result is not None, "健康检查应该返回结果"

    @pytest.mark.asyncio
    async def test_server_start_stop_methods(self, mcp_manager):
        """测试服务器启动停止方法"""
        # 验证启动方法存在
        assert hasattr(mcp_manager, 'start_server'), "start_server 方法应该存在"

        # 验证停止方法存在
        assert hasattr(mcp_manager, 'stop_server'), "stop_server 方法应该存在"

        print("✅ 启动停止方法存在")

        # 注意：这里不实际启动服务器，只是测试方法可用性
        # 实际启动测试可能需要更复杂的环境设置

    @pytest.mark.asyncio
    async def test_weather_tool_execution(self, mcp_manager):
        """测试天气工具执行功能"""
        print("🌤️  测试 maps_weather 天气工具调用...")

        # 导入 MCPClientWrapper 直接使用
        from app.utils.mcp_client import MCPClientWrapper
        mcp_wrapper = MCPClientWrapper()

        # 尝试启动高德地图服务器（如果未运行）
        if hasattr(mcp_manager, 'ensure_server_running'):
            try:
                print("🔧 确保高德地图服务器运行...")
                await mcp_manager.ensure_server_running("amap-maps")
                print("✅ 高德地图服务器已启动")
            except Exception as e:
                print(f"⚠️  启动高德地图服务器失败: {e}")

        # 通过 MCPClientWrapper 调用天气工具
        # 获取高德地图客户端
        amap_client = await mcp_wrapper._get_or_create_client("amap-maps")
        assert amap_client is not None, "应该能够获取高德地图客户端"

        print("✅ 成功获取高德地图客户端")

        # 检查客户端是否有 session 属性
        assert hasattr(amap_client, 'session'), "客户端应该有 session 属性"

        print(f"🔍 客户端类型: {type(amap_client)}")
        print(f"🔍 Session 类型: {type(amap_client.session)}")

        # 检查 call_tool 方法的参数
        import inspect
        sig = inspect.signature(amap_client.session.call_tool)
        print(f"🔍 call_tool 方法签名: {sig}")

        # 调用 maps_weather 工具
        # 根据之前看到的工具定义，只需要 city 参数
        try:
            weather_result = await amap_client.session.call_tool(
                name="maps_weather",
                arguments={
                    "city": "北京"  # 测试用北京
                }
            )
            print(f"✅ maps_weather 工具调用成功: {weather_result}")

            # 显示结果详情
            if hasattr(weather_result, 'content'):
                print(f"📊 天气信息: {weather_result.content}")
            if hasattr(weather_result, 'error') and weather_result.error:
                print(f"⚠️  工具返回错误: {weather_result.error}")

            # 验证结果
            assert weather_result is not None, "工具调用应该返回结果"

        except Exception as call_error:
            print(f"❌ 工具调用异常: {call_error}")
            print(f"🔍 异常类型: {type(call_error)}")
            import traceback
            traceback.print_exc()

            # 尝试不同的参数格式
            print("🔄 尝试不同的参数格式...")
            try:
                # 尝试使用 params 参数名
                weather_result = await amap_client.session.call_tool(
                    name="maps_weather",
                    params={
                        "city": "北京"
                    }
                )
                print(f"✅ 使用 params 参数调用成功: {weather_result}")
                assert weather_result is not None, "工具调用应该返回结果"

            except Exception as params_error:
                print(f"❌ 使用 params 参数也失败: {params_error}")

                # 尝试直接传递参数
                try:
                    weather_result = await amap_client.session.call_tool(
                        "maps_weather",
                        {"city": "北京"}
                    )
                    print(f"✅ 直接传递参数调用成功: {weather_result}")
                    assert weather_result is not None, "工具调用应该返回结果"

                except Exception as direct_error:
                    print(f"❌ 直接传递参数也失败: {direct_error}")
                    # 如果所有方法都失败，则测试失败
                    pytest.fail(f"所有工具调用方法都失败: {direct_error}")

        # 清理连接
        await mcp_wrapper._cleanup_connection("amap-maps")
        print("✅ 连接清理完成")


# 注意：这个文件使用 pytest 框架，不需要手动运行测试
# 使用以下命令运行测试：
# cd backend/app/services
# python -m pytest test_mcp_manager_pytest.py -v

if __name__ == "__main__":
    print("🚀 这个文件使用 pytest 框架")
    print("请使用以下命令运行测试：")
    print("cd backend/app/services")
    print("python -m pytest test_mcp_manager_pytest.py -v")
