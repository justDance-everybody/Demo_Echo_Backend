"""
测试用例 6: 开发者工具管理

测试目标: 验证开发者工具管理功能
"""

import pytest


class TestDeveloperToolManagement:
    """测试用例6: 开发者工具管理测试"""

    def test_6_2_get_developer_tools_list(self, test_client, auth_tokens):
        """6.2 获取开发者工具列表"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.get("/dev/tools", headers=headers)

        # 验收标准: 返回状态码 200
        assert response.status_code == 200, f"获取开发者工具列表失败，状态码: {response.status_code}"

        data = response.json()

        # 验证响应结构
        assert isinstance(data, (list, dict)), "响应应为列表或字典类型"

    def test_6_3_create_new_tool(self, test_client, auth_tokens):
        """6.3 创建新工具"""
        import uuid
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 使用UUID确保工具ID唯一
        unique_id = str(uuid.uuid4())[:8]
        tool_data = {
            "tool_id": f"test_tool_{unique_id}",
            "name": "测试工具",
            "description": "用于集成测试的工具",
            "type": "http",
            "endpoint": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            },
            "request_schema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                }
            },
            "response_schema": {
                "type": "object"
            }
        }

        response = test_client.post(
            "/dev/tools",
            headers=headers,
            json=tool_data
        )

        # 验收标准: 创建成功返回 201
        assert response.status_code == 201, f"创建工具失败，状态码: {response.status_code}"

        data = response.json()

        # 验收标准: 响应包含创建的工具信息
        assert "tool_id" in data, "响应中缺少tool_id字段"
        assert data["tool_id"] == tool_data["tool_id"], f"tool_id不匹配，期望: {tool_data['tool_id']}, 实际: {data.get('tool_id')}"
        assert "name" in data, "响应中缺少name字段"
        assert "description" in data, "响应中缺少description字段"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
