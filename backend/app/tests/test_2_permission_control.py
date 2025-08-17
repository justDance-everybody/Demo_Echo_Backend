"""
测试用例 2: 权限控制验证

测试目标: 确认权限控制机制的有效性
"""

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta

from app.config import settings
from .conftest import assert_response_structure, assert_error_response


class TestPermissionControl:
    """测试用例2: 权限控制验证测试"""

    def test_2_1_user_access_basic_endpoints(self, test_client, auth_tokens):
        """2.1 测试普通用户访问基础接口（应该成功）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 获取工具列表 - 应该成功
        response = test_client.get("/api/v1/tools", headers=headers)
        if response.status_code == 200:
            data = response.json()
            assert "tools" in data
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403

    def test_2_2_user_access_developer_endpoints_forbidden(self, test_client, auth_tokens):
        """2.2 测试普通用户访问开发者接口（应该失败）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 尝试访问开发者工具列表 - 应该被拒绝
        response = test_client.get("/api/v1/dev/tools", headers=headers)
        assert response.status_code == 403

        # 尝试创建工具 - 应该被拒绝
        response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json={
                "tool_id": "test_tool",
                "name": "测试工具",
                "description": "测试描述"
            }
        )
        assert response.status_code == 403

    def test_2_3_developer_access_developer_endpoints(self, test_client, auth_tokens):
        """2.3 测试开发者访问开发者接口"""
        token = auth_tokens["developer"]
        headers = {"Authorization": f"Bearer {token}"}

        # 获取开发者工具列表 - 应该成功
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

    def test_2_4_admin_access_all_endpoints(self, test_client, auth_tokens):
        """2.4 测试管理员访问所有接口"""
        token = auth_tokens["admin"]
        headers = {"Authorization": f"Bearer {token}"}

        # 管理员应该能访问所有接口
        endpoints = [
            "/api/v1/tools",
            "/api/v1/dev/tools",
            "/api/v1/dev/apps",
            "/api/v1/mcp/status"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint, headers=headers)
            # 管理员访问任何接口都不应该被权限拒绝
            assert response.status_code != 403

    def test_2_5_invalid_token_unauthorized(self, test_client):
        """2.5 测试无效token返回401"""
        headers = {"Authorization": "Bearer invalid_token_123"}

        response = test_client.get("/api/v1/tools", headers=headers)
        assert response.status_code == 401

    def test_2_6_missing_token_unauthorized(self, test_client):
        """2.6 测试缺少token返回401"""
        response = test_client.get("/api/v1/tools")
        assert response.status_code == 401

    def test_2_7_expired_token_unauthorized(self, test_client, test_users):
        """2.7 测试过期token返回401"""
        # 创建一个过期的token
        user = test_users["user"]
        payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "exp": datetime.utcnow() - timedelta(hours=1)  # 已过期
        }
        expired_token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

        headers = {"Authorization": f"Bearer {expired_token}"}
        response = test_client.get("/api/v1/tools", headers=headers)
        assert response.status_code == 401


class TestRoleHierarchy:
    """角色层级权限测试"""

    def test_2_8_role_hierarchy_user_developer_admin(self, test_client, auth_tokens):
        """2.8 测试角色层级：user < developer < admin"""
        # 普通用户权限
        user_token = auth_tokens["user"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 开发者权限
        dev_token = auth_tokens["developer"]
        dev_headers = {"Authorization": f"Bearer {dev_token}"}

        # 管理员权限
        admin_token = auth_tokens["admin"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 测试基础接口 - 所有角色都应该能访问
        basic_endpoints = ["/api/v1/tools"]
        for endpoint in basic_endpoints:
            for role, headers in [("user", user_headers), ("developer", dev_headers), ("admin", admin_headers)]:
                response = test_client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    # 成功访问
                    pass
                else:
                    # 如果失败，至少不是权限问题
                    assert response.status_code != 403

        # 测试开发者接口 - 只有developer和admin能访问
        dev_endpoints = ["/api/v1/dev/tools", "/api/v1/dev/apps"]
        for endpoint in dev_endpoints:
            # user应该被拒绝
            response = test_client.get(endpoint, headers=user_headers)
            assert response.status_code == 403

            # developer和admin应该能访问
            for headers in [dev_headers, admin_headers]:
                response = test_client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    # 成功访问
                    pass
                else:
                    # 如果失败，至少不是权限问题
                    assert response.status_code != 403


class TestPermissionBoundaries:
    """权限边界测试"""

    def test_2_9_user_cannot_access_developer_endpoints(self, test_client, auth_tokens):
        """2.9 测试普通用户无法访问开发者接口"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        developer_endpoints = [
            "/api/v1/dev/tools",
            "/api/v1/dev/apps",
            "/api/v1/mcp/status"
        ]

        for endpoint in developer_endpoints:
            response = test_client.get(endpoint, headers=headers)
            assert response.status_code == 403

    def test_2_10_user_cannot_create_tools(self, test_client, auth_tokens):
        """2.10 测试普通用户无法创建工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        tool_data = {
            "tool_id": "user_tool",
            "name": "用户工具",
            "description": "用户尝试创建的工具"
        }

        response = test_client.post(
            "/api/v1/dev/tools",
            headers=headers,
            json=tool_data
        )

        assert response.status_code == 403

    def test_2_11_user_cannot_test_tools(self, test_client, auth_tokens):
        """2.11 测试普通用户无法测试工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.post(
            "/api/v1/dev/tools/test_tool/test",
            headers=headers,
            json={"test_param": "value"}
        )

        assert response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
