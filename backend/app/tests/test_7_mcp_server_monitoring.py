"""
测试用例 7: MCP服务器状态监控

测试目标: 验证MCP服务器状态监控功能
"""

import pytest
import time
from .conftest import (
    assert_response_structure,
    assert_error_response
)


class TestMCPServerMonitoring:
    """测试用例7: MCP服务器状态监控测试"""

    def test_7_1_check_mcp_server_status(self, test_client, auth_tokens):
        """7.1 检查MCP服务器状态"""
        # 开发者和管理员都应该能访问MCP状态
        for role in ["developer", "admin"]:
            token = auth_tokens[role]
            headers = {"Authorization": f"Bearer {token}"}

            response = test_client.get("/api/v1/mcp/status", headers=headers)

            if response.status_code == 200:
                data = response.json()
                # 验证响应包含各MCP服务器的状态信息
                assert isinstance(data, dict)

                # 检查是否包含状态信息字段
                status_fields = ["servers", "status", "processes", "connections"]
                has_status_info = any(field in data for field in status_fields)
                assert has_status_info, "响应应该包含状态信息"

                # 如果有servers字段，验证其结构
                if "servers" in data:
                    servers = data["servers"]
                    assert isinstance(servers, list)
                    if servers:
                        server = servers[0]
                        # 验证服务器信息结构
                        server_fields = ["name", "status", "pid", "uptime"]
                        has_server_info = any(field in server for field in server_fields)
                        assert has_server_info, "服务器信息应该包含基本字段"

                # 如果有processes字段，验证其结构
                if "processes" in data:
                    processes = data["processes"]
                    assert isinstance(processes, list)
                    if processes:
                        process = processes[0]
                        # 验证进程信息结构
                        process_fields = ["pid", "name", "status", "memory"]
                        has_process_info = any(field in process for field in process_fields)
                        assert has_process_info, "进程信息应该包含基本字段"

                # 如果有connections字段，验证其结构
                if "connections" in data:
                    connections = data["connections"]
                    assert isinstance(connections, list)
                    if connections:
                        connection = connections[0]
                        # 验证连接信息结构
                        connection_fields = ["id", "status", "client", "created_at"]
                        has_connection_info = any(field in connection for field in connection_fields)
                        assert has_connection_info, "连接信息应该包含基本字段"

                break  # 找到一个成功的就停止
            else:
                # 如果失败，至少验证不是权限问题
                assert response.status_code != 403
                assert response.status_code != 401

    def test_7_2_mcp_status_permission_control(self, test_client, auth_tokens):
        """7.2 测试MCP状态接口权限控制"""
        # 普通用户不应该能访问MCP状态
        user_token = auth_tokens["user"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        response = test_client.get("/api/v1/mcp/status", headers=user_headers)
        assert response.status_code == 403, "普通用户应该被拒绝访问MCP状态"

    def test_7_3_mcp_status_without_auth(self, test_client):
        """7.3 测试未认证访问MCP状态"""
        response = test_client.get("/api/v1/mcp/status")
        assert response.status_code == 401, "未认证访问应该返回401"

    def test_7_4_mcp_status_detailed_info(self, test_client, auth_tokens):
        """7.4 测试MCP状态详细信息"""
        # 使用管理员权限获取详细信息
        admin_token = auth_tokens["admin"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        response = test_client.get("/api/v1/mcp/status", headers=admin_headers)

        if response.status_code == 200:
            data = response.json()

            # 验证响应包含足够的状态信息
            assert isinstance(data, dict)

            # 检查是否有时间戳信息
            time_fields = ["timestamp", "last_updated", "checked_at"]
            has_time_info = any(field in data for field in time_fields)

            # 检查是否有系统资源信息
            resource_fields = ["cpu_usage", "memory_usage", "disk_usage"]
            has_resource_info = any(field in data for field in resource_fields)

            # 检查是否有网络信息
            network_fields = ["active_connections", "total_requests", "error_count"]
            has_network_info = any(field in data for field in network_fields)

            # 至少应该有一种类型的信息
            assert any([has_time_info, has_resource_info, has_network_info]), \
                "MCP状态应该包含时间、资源或网络信息中的至少一种"

    def test_7_5_mcp_status_response_format(self, test_client, auth_tokens):
        """7.5 测试MCP状态响应格式一致性"""
        # 多次请求应该返回一致的格式
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        responses = []
        for i in range(3):
            response = test_client.get("/api/v1/mcp/status", headers=headers)
            if response.status_code == 200:
                responses.append(response.json())

        if len(responses) >= 2:
            # 验证响应格式一致性
            first_response = responses[0]
            for response in responses[1:]:
                # 检查主要字段是否存在
                first_keys = set(first_response.keys())
                response_keys = set(response.keys())

                # 主要字段应该一致
                common_keys = first_keys.intersection(response_keys)
                assert len(common_keys) > 0, "响应应该包含一致的字段"

                # 检查字段类型一致性
                for key in common_keys:
                    if key in first_response and key in response:
                        first_type = type(first_response[key])
                        response_type = type(response[key])
                        assert first_type == response_type, f"字段 {key} 的类型应该一致"


class TestMCPServerEdgeCases:
    """MCP服务器边界情况测试"""

    def test_7_6_mcp_status_high_load(self, test_client, auth_tokens):
        """7.6 测试高负载下的MCP状态响应"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 连续多次请求，模拟高负载
        start_time = time.time()
        success_count = 0
        total_requests = 10

        for i in range(total_requests):
            response = test_client.get("/api/v1/mcp/status", headers=headers)
            if response.status_code == 200:
                success_count += 1

        end_time = time.time()
        total_time = end_time - start_time

        # 成功率应该很高
        success_rate = success_count / total_requests
        assert success_rate >= 0.8, f"高负载下成功率应该≥80%，实际为{success_rate:.2%}"

        # 平均响应时间应该在合理范围内
        avg_response_time = total_time / total_requests
        assert avg_response_time <= 2.0, f"平均响应时间应该≤2秒，实际为{avg_response_time:.2f}秒"

    def test_7_7_mcp_status_error_handling(self, test_client, auth_tokens):
        """7.7 测试MCP状态错误处理"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试无效的查询参数
        response = test_client.get("/api/v1/mcp/status?invalid_param=value", headers=headers)

        # 应该能处理无效参数或返回错误
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            # 即使有无效参数，响应结构也应该正常
            data = response.json()
            assert isinstance(data, dict)

    def test_7_8_mcp_status_content_type(self, test_client, auth_tokens):
        """7.8 测试MCP状态响应内容类型"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.get("/api/v1/mcp/status", headers=headers)

        if response.status_code == 200:
            # 验证Content-Type
            content_type = response.headers.get("content-type", "")
            assert "application/json" in content_type, "响应应该是JSON格式"

            # 验证响应是有效的JSON
            try:
                data = response.json()
                assert isinstance(data, dict)
            except ValueError:
                pytest.fail("响应应该是有效的JSON格式")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
