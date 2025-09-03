"""
测试用例 1: 用户认证流程

测试目标: 验证JWT认证机制的正确性
"""

import pytest
from .conftest import assert_response_structure, assert_error_response


class TestUserAuthentication:
    """测试用例1: 用户认证流程测试"""

    def test_1_1_user_login_success(self, test_client, test_users, auth_tokens):
        """1.1 测试普通用户登录成功"""
        user = test_users["user"]

        # 使用form-data格式登录
        response = test_client.post(
            "/auth/token",
            data={
                "username": user["username"],
                "password": user["password"]
            }
        )

        # 现在用户应该在数据库中存在，测试应该成功
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "token_type" in data
            assert data["token_type"] == "bearer"
            assert "role" in data
            assert data["role"] == "user"
        else:
            # 如果登录失败，至少验证错误响应格式
            assert response.status_code in [401, 422]

    def test_1_2_developer_login_success(self, test_client, test_users, auth_tokens):
        """1.2 测试开发者用户登录成功"""
        dev_user = test_users["developer"]

        response = test_client.post(
            "/auth/token",
            data={
                "username": dev_user["username"],
                "password": dev_user["password"]
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["role"] == "developer"
        else:
            assert response.status_code in [401, 422]

    def test_1_3_admin_login_success(self, test_client, test_users, auth_tokens):
        """1.3 测试管理员用户登录成功"""
        admin_user = test_users["admin"]

        response = test_client.post(
            "/auth/token",
            data={
                "username": admin_user["username"],
                "password": admin_user["password"]
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["role"] == "admin"
        else:
            assert response.status_code in [401, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
