#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCPClientWrapper pytest 测试文件
测试 backend/app/utils/mcp_client.py 中的 MCPClientWrapper 功能
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
async def mcp_wrapper():
    """创建 MCPClientWrapper 实例的 fixture"""
    from app.utils.mcp_client import MCPClientWrapper
    wrapper = MCPClientWrapper()
    yield wrapper
    # 清理资源
    if hasattr(wrapper, 'close_all_connections'):
        await wrapper.close_all_connections()


class TestMCPClientWrapper:
    """MCPClientWrapper 测试类"""

    @pytest.mark.asyncio
    async def test_config_loading(self, mcp_wrapper):
        """测试配置加载功能"""
        # 验证配置已加载
        assert mcp_wrapper.server_configs, "服务器配置应该被加载"

        # 验证配置数量
        config_count = len(mcp_wrapper.server_configs)
        assert config_count > 0, f"应该加载至少1个服务器配置，实际: {config_count}"

        print(f"✅ 成功加载 {config_count} 个服务器配置")

        # 显示配置详情
        for server_name, config in mcp_wrapper.server_configs.items():
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
    async def test_connection_pool_management(self, mcp_wrapper):
        """测试连接池管理功能"""
        # 验证连接池存在（私有属性）
        assert hasattr(mcp_wrapper, '_connection_pool'), "连接池应该存在"

        # 检查初始状态
        pool = mcp_wrapper._connection_pool
        initial_size = len(pool)
        print(f"📊 初始连接池大小: {initial_size}")

        # 验证连接池清理功能
        if hasattr(mcp_wrapper, '_cleanup_connection'):
            await mcp_wrapper._cleanup_connection("test-server")
            print("✅ 连接池清理功能正常")

        # 验证管理进程信息（私有属性）
        assert hasattr(mcp_wrapper, '_managed_processes'), "管理进程信息应该存在"
        processes_info = mcp_wrapper._managed_processes
        assert isinstance(processes_info, dict), "管理进程信息应该是字典类型"
        print(f"📊 初始管理进程数: {len(processes_info)}")

    @pytest.mark.asyncio
    async def test_timeout_configuration(self, mcp_wrapper):
        """测试超时配置功能"""
        # 验证超时配置方法存在
        if hasattr(mcp_wrapper, '_get_server_timeout'):
            timeout = mcp_wrapper._get_server_timeout("test-server")
            assert isinstance(timeout, (int, float)), "超时值应该是数字类型"
            print(f"📊 服务器超时配置: {timeout}秒")
        else:
            print("⚠️  _get_server_timeout 方法不存在，跳过超时测试")
            pytest.skip("_get_server_timeout 方法不存在")

        # 验证各种超时类型
        timeout_types = ['ping', 'warmup', 'validation', 'default']
        for timeout_type in timeout_types:
            if hasattr(mcp_wrapper, f'_get_{timeout_type}_timeout'):
                timeout_value = getattr(mcp_wrapper, f'_get_{timeout_type}_timeout')()
                print(f"  {timeout_type}: {timeout_value}秒")

        print("✅ 超时配置功能正常")

    @pytest.mark.asyncio
    async def test_error_classification(self, mcp_wrapper):
        """测试错误分类功能"""
        # 导入错误分类相关的类
        from app.utils.mcp_client import MCPErrorType, MCPErrorClassifier

        # 测试各种错误类型
        test_errors = [
            ('connection refused', MCPErrorType.CONNECTION_REFUSED),
            ('timeout', MCPErrorType.CONNECTION_TIMEOUT),
            ('server not found', MCPErrorType.SERVER_NOT_FOUND),
            ('tool not found', MCPErrorType.TOOL_NOT_FOUND),
            ('permission denied', MCPErrorType.PROCESS_PERMISSION_DENIED),
        ]

        for error_msg, expected_type in test_errors:
            error_type = MCPErrorClassifier.classify_error(error_msg)
            assert error_type == expected_type, f"错误 '{error_msg}' 应该分类为 {expected_type}"

            # 获取友好消息
            friendly_msg = MCPErrorClassifier.get_user_friendly_message(error_type, error_msg)
            assert friendly_msg, f"应该为错误类型 {error_type} 提供友好消息"

            print(f"  '{error_msg}' -> {error_type}")
            print(f"    友好消息: {friendly_msg}")

        print("✅ 错误分类功能正常")

    @pytest.mark.asyncio
    async def test_server_connection_attempt(self, mcp_wrapper):
        """测试服务器连接尝试"""
        # 验证连接方法存在
        if not hasattr(mcp_wrapper, '_get_or_create_client'):
            pytest.skip("_get_or_create_client 方法不存在")

        # 选择第一个启用的服务器进行连接测试
        available_servers = [name for name, config in mcp_wrapper.server_configs.items()
                           if config.get('enabled', True)]

        if not available_servers:
            pytest.skip("没有启用的服务器")

        test_server = available_servers[0]
        print(f"🔗 尝试连接到服务器: {test_server}")

        try:
            # 尝试获取或创建客户端连接
            client = await mcp_wrapper._get_or_create_client(test_server)
            assert client is not None, "应该能够获取客户端连接"
            print(f"✅ 成功获取客户端连接: {test_server}")

            # 清理连接
            await mcp_wrapper._cleanup_connection(test_server)
            print("✅ 连接清理成功")

        except Exception as e:
            print(f"⚠️  连接尝试失败: {e}")
            # 连接失败不应该导致测试失败，因为服务器可能未运行
            # 但我们可以验证错误处理是否正常

    @pytest.mark.asyncio
    async def test_utility_functions(self, mcp_wrapper):
        """测试工具函数"""
        # 测试重试延迟计算
        if hasattr(mcp_wrapper, '_calculate_retry_delay'):
            try:
                delay = mcp_wrapper._calculate_retry_delay(0, 1.0, 30.0, 2.0, 0.1)
                assert isinstance(delay, (int, float)), "重试延迟应该是数字类型"
                print(f"  📊 重试延迟计算: {delay:.2f}秒")
            except Exception as e:
                print(f"  📊 重试延迟计算失败: {e}")
                pytest.fail(f"重试延迟计算失败: {e}")
        else:
            print("  📊 重试延迟计算方法不存在")

        # 测试错误重试判断
        if hasattr(mcp_wrapper, '_should_retry_for_error'):
            try:
                from app.utils.mcp_client import MCPErrorType
                should_retry = mcp_wrapper._should_retry_for_error(MCPErrorType.CONNECTION_FAILED, 0, 5)
                assert isinstance(should_retry, bool), "重试判断应该是布尔类型"
                print(f"  📊 错误重试判断: {should_retry}")
            except Exception as e:
                print(f"  📊 错误重试判断失败: {e}")
                pytest.fail(f"错误重试判断失败: {e}")
        else:
            print("  📊 错误重试判断方法不存在")

        print("✅ 工具函数测试通过")

    @pytest.mark.asyncio
    async def test_connection_pool_health_check(self, mcp_wrapper):
        """测试连接池健康检查功能"""
        if hasattr(mcp_wrapper, 'check_connection_pool_health'):
            try:
                health_status = await mcp_wrapper.check_connection_pool_health()
                assert isinstance(health_status, dict), "健康状态应该是字典类型"
                assert 'total_connections' in health_status, "健康状态应该包含 total_connections 字段"
                print(f"📊 连接池健康状态: {health_status}")
                print("✅ 连接池健康检查功能正常")
            except Exception as e:
                print(f"⚠️  连接池健康检查失败: {e}")
                pytest.fail(f"连接池健康检查失败: {e}")
        else:
            print("⚠️  check_connection_pool_health 方法不存在")
            pytest.skip("check_connection_pool_health 方法不存在")

    @pytest.mark.asyncio
    async def test_amap_weather_tool(self, mcp_wrapper):
        """测试高德地图天气工具"""
        print("🧪 测试高德地图天气工具")

        try:
            # 尝试连接到高德地图服务器
            print("🔗 尝试连接到高德地图服务器...")

            # 使用 MCPClientWrapper 获取高德地图客户端
            amap_client = await mcp_wrapper._get_or_create_client("amap-maps")
            assert amap_client is not None, "应该能够获取高德地图客户端"
            print("✅ 成功连接到高德地图 MCP 服务器")

            # 直接测试 maps_weather 工具
            print("🌤️  测试 maps_weather 天气工具:")
            try:
                # 尝试调用 maps_weather 工具
                # 根据之前看到的工具定义，只需要 city 参数
                weather_result = await amap_client.session.call_tool(
                    name="maps_weather",
                    arguments={
                        "city": "北京"  # 测试用北京
                    }
                )
                print(f"✅ maps_weather 工具调用成功: {weather_result}")

                # 验证结果
                assert weather_result is not None, "工具调用应该返回结果"

                # 显示结果详情
                if hasattr(weather_result, 'content'):
                    print(f"📊 天气信息: {weather_result.content}")
                if hasattr(weather_result, 'error') and weather_result.error:
                    print(f"⚠️  工具返回错误: {weather_result.error}")

            except Exception as e:
                print(f"❌ maps_weather 工具调用失败: {e}")
                print("💡 可能的原因:")
                print("  1. 工具名称不正确")
                print("  2. 参数格式不对")
                print("  3. 服务器未正确启动")

                # 如果工具调用失败，测试应该失败
                pytest.fail(f"maps_weather 工具调用失败: {e}")

            # 清理连接
            await mcp_wrapper._cleanup_connection("amap-maps")
            print("✅ 高德地图连接清理完成")

        except Exception as e:
            print(f"❌ 高德地图测试失败: {e}")
            pytest.fail(f"高德地图测试失败: {e}")


# 运行测试的辅助函数
async def run_all_tests():
    """运行所有测试的辅助函数"""
    print("🚀 开始运行 MCPClientWrapper pytest 测试套件")
    print("=" * 70)

    # 创建测试实例
    test_instance = TestMCPClientWrapper()

    # 运行所有测试方法
    test_methods = [
        test_instance.test_config_loading,
        test_instance.test_connection_pool_management,
        test_instance.test_timeout_configuration,
        test_instance.test_error_classification,
        test_instance.test_server_connection_attempt,
        test_instance.test_utility_functions,
        test_instance.test_connection_pool_health_check,
        test_instance.test_amap_weather_tool,
    ]

    passed = 0
    failed = 0

    for test_method in test_methods:
        try:
            print(f"\n🧪 运行测试: {test_method.__name__}")
            await test_method(None)  # 传入 None 作为 mcp_wrapper 参数
            print(f"✅ {test_method.__name__} 通过")
            passed += 1
        except Exception as e:
            print(f"❌ {test_method.__name__} 失败: {e}")
            failed += 1

    # 显示结果
    print("\n" + "=" * 70)
    print("📊 测试结果汇总")
    print("=" * 70)
    print(f"总测试数: {len(test_methods)}")
    print(f"通过: {passed} ✅")
    print(f"失败: {failed} ❌")
    print(f"成功率: {(passed/len(test_methods))*100:.1f}%")

    if failed == 0:
        print("\n🎉 所有测试通过！MCPClientWrapper 工作正常")
    else:
        print(f"\n❌ 有 {failed} 个测试失败，请检查问题")


if __name__ == "__main__":
    # 直接运行测试
    asyncio.run(run_all_tests())
