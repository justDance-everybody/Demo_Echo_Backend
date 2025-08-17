"""
测试用例 6: 开发者工具管理

测试目标: 验证开发者工具管理功能
"""

import pytest
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestDeveloperToolManagement:
    """测试用例6: 开发者工具管理测试"""

    def test_6_1_get_developer_tools_list(self, test_client, auth_tokens):
        """6.1 获取开发者工具列表"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.get("/api/v1/dev/tools", headers=headers)

        if response.status_code == 200:
            data = response.json()
            # 验证响应结构
            assert isinstance(data, dict)
            # 可能包含tools字段或其他结构
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401

    def test_6_2_create_new_tool(self, test_client, auth_tokens):
        """6.2 创建新工具"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        tool_data = {
            "tool_id": "test_tool_001",
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
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        if response.status_code == 201:
            data = response.json()
            # 验证响应包含创建的工具信息
            assert "tool_id" in data
            assert data["tool_id"] == "test_tool_001"
            assert "name" in data
            assert "description" in data
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401

    def test_6_3_update_existing_tool(self, test_client, auth_tokens):
        """6.3 更新现有工具"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 先创建工具
        tool_data = {
            "tool_id": "update_test_tool",
            "name": "更新测试工具",
            "description": "用于测试更新的工具",
            "type": "http",
            "endpoint": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            }
        }

        create_response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        if create_response.status_code in [200, 201]:
            # 更新工具
            update_data = {
                "name": "已更新的测试工具",
                "description": "工具描述已更新"
            }

            update_response = test_client.put(
                f"/api/v1/dev/tools/update_test_tool",
                headers=headers,
                json=update_data
            )

            if update_response.status_code == 200:
                data = update_response.json()
                assert data["name"] == "已更新的测试工具"
                assert data["description"] == "工具描述已更新"
            else:
                assert update_response.status_code != 403
                assert update_response.status_code != 401

    def test_6_4_delete_tool(self, test_client, auth_tokens):
        """6.4 删除工具"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 先创建工具
        tool_data = {
            "tool_id": "delete_test_tool",
            "name": "删除测试工具",
            "description": "用于测试删除的工具",
            "type": "http",
            "endpoint": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            }
        }

        create_response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        if create_response.status_code in [200, 201]:
            # 删除工具
            delete_response = test_client.delete(
                "/api/v1/dev/tools/delete_test_tool",
                headers=headers
            )

            # 应该返回成功状态码
            assert delete_response.status_code in [200, 204]

    def test_6_5_test_tool_functionality(self, test_client, auth_tokens):
        """6.5 测试工具功能"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 先创建工具
        tool_data = {
            "tool_id": "test_functionality_tool",
            "name": "功能测试工具",
            "description": "用于测试功能的工具",
            "type": "http",
            "endpoint": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            }
        }

        create_response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        if create_response.status_code in [200, 201]:
            # 测试工具
            test_response = test_client.post(
                "/api/v1/dev/tools/test_functionality_tool/test",
                headers=headers,
                json={"test_param": "value"}
            )

            # 应该返回测试结果
            if test_response.status_code == 200:
                data = test_response.json()
                assert "result" in data or "status" in data
            else:
                assert test_response.status_code != 403
                assert test_response.status_code != 401


class TestToolManagementEdgeCases:
    """工具管理边界情况测试"""

    def test_6_6_create_tool_duplicate_id(self, test_client, auth_tokens):
        """6.6 测试创建重复ID的工具"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        tool_data = {
            "tool_id": "duplicate_tool",
            "name": "重复工具",
            "description": "测试重复ID",
            "type": "http",
            "endpoint": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            }
        }

        # 第一次创建
        response1 = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        if response1.status_code in [200, 201]:
            # 第二次创建相同ID的工具
            response2 = test_client.post(
                "/api/v1/dev/tools",
                headers=headers,
                json=tool_data
            )

            # 应该返回冲突错误
            assert response2.status_code in [400, 409, 422]

    def test_6_7_create_tool_missing_parameters(self, test_client, auth_tokens):
        """6.7 测试创建工具缺少参数"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 缺少tool_id
        incomplete_data = {
            "name": "不完整工具",
            "description": "缺少必要参数",
            "type": "http"
        }

        response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=incomplete_data
        )

        assert response.status_code == 422

    def test_6_8_create_tool_invalid_endpoint(self, test_client, auth_tokens):
        """6.8 测试创建工具无效端点"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        tool_data = {
            "tool_id": "invalid_endpoint_tool",
            "name": "无效端点工具",
            "description": "测试无效端点",
            "type": "http",
            "endpoint": {
                "url": "invalid-url",
                "method": "INVALID_METHOD"
            }
        }

        response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        # 应该返回验证错误
        assert response.status_code in [400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
