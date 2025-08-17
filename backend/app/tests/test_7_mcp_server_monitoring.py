"""
测试用例 7: MCP服务器状态监控

测试目标: 验证MCP服务器状态监控功能
"""

import pytest


class TestMCPServerMonitoring:
    """测试用例7: MCP服务器状态监控测试"""

    def test_7_1_check_mcp_server_status(self, test_client, auth_tokens):
        """7.1 检查MCP服务器状态"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.get("/mcp/status", headers=headers)

        # 调试输出
        print(f"📋 响应状态码: {response.status_code}")
        print(f"📋 响应内容: {response.text}")

        # 验收标准: 返回状态码 200
        assert response.status_code == 200, f"检查MCP服务器状态失败，状态码: {response.status_code}"

        data = response.json()
        print(f"📋 解析后的响应数据: {data}")
        print(f"📋 响应数据的键: {list(data.keys()) if isinstance(data, dict) else '不是字典类型'}")

                # 验收标准: 响应包含各MCP服务器的状态信息
        assert isinstance(data, dict), "响应应为字典类型"

        # 检查响应结构是否符合预期
        assert "success" in data, "响应应包含success字段"
        assert "data" in data, "响应应包含data字段"
        assert data["success"] is True, "success字段应为true"

        response_data = data["data"]
        assert isinstance(response_data, dict), "data字段应为字典类型"

        # 验收标准: 响应包含各MCP服务器的状态信息
        assert "servers" in response_data, "响应应该包含servers字段"
        assert "summary" in response_data, "响应应该包含summary字段"

        servers = response_data["servers"]
        assert isinstance(servers, dict), "servers字段应为字典类型"

        # 验收标准: 状态信息包括运行状态、进程ID等
        if servers:
            # 检查第一个服务器的信息结构
            server_name, server_info = next(iter(servers.items()))
            assert isinstance(server_info, dict), f"服务器 {server_name} 的信息应为字典类型"

            # 验证服务器信息包含基本字段
            expected_fields = ["status", "restart_count", "consecutive_failures", "is_blacklisted"]
            for field in expected_fields:
                assert field in server_info, f"服务器 {server_name} 的信息应该包含 {field} 字段"

            # 验证status字段的值
            assert server_info["status"] in ["running", "stopped"], f"服务器 {server_name} 的status应为'running'或'stopped'"

        # 验证summary信息
        summary = response_data["summary"]
        assert isinstance(summary, dict), "summary字段应为字典类型"

        expected_summary_fields = ["total", "running", "failed", "blacklisted"]
        for field in expected_summary_fields:
            assert field in summary, f"summary应该包含 {field} 字段"
            assert isinstance(summary[field], int), f"summary的 {field} 字段应为整数类型"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
