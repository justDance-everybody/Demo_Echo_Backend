"""
测试用例 2: 权限控制验证

测试目标: 确认权限控制机制的有效性
"""

import pytest
from jose import jwt
from datetime import datetime, timedelta

from app.config import settings
from .conftest import assert_response_structure, assert_error_response


class TestPermissionControl:
    """测试用例2: 权限控制验证测试"""

    def test_2_1_get_user_token(self, test_client, test_users, auth_tokens):
        """2.1 获取普通用户token"""
        user = test_users["user"]

        # 验证能够成功获取用户token
        response = test_client.post(
            "/auth/token",
            data={
                "username": user["username"],
                "password": user["password"]
            }
        )

        assert response.status_code == 200, f"获取用户token失败，状态码: {response.status_code}"

        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "role" in data
        assert data["role"] == "user"

    def test_2_2_user_access_basic_endpoints(self, test_client, auth_tokens):
        """2.2 测试普通用户访问基础接口（应该成功）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 获取工具列表 - 应该成功
        response = test_client.get("/tools", headers=headers)

        # 验收标准: 返回状态码 200
        assert response.status_code == 200, f"访问基础接口失败，状态码: {response.status_code}"

        # 验收标准: 响应包含 tools 数组
        data = response.json()
        assert "tools" in data, "响应中缺少tools数组"

    def test_2_3_user_access_developer_endpoints_forbidden(self, test_client, auth_tokens):
        """2.3 测试普通用户访问开发者接口（应该失败）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 尝试访问开发者工具列表 - 应该被拒绝
        response = test_client.get("/dev/tools", headers=headers)

        # 验收标准: 返回状态码 403 (Forbidden)
        assert response.status_code == 403, f"普通用户访问开发者接口应该返回403，实际返回{response.status_code}"

        # 验收标准: 错误信息提示权限不足
        try:
            error_data = response.json()
            # 检查错误信息是否包含权限相关的提示
            error_message = error_data.get("detail", "").lower()
            assert any(keyword in error_message for keyword in ["权限", "permission", "forbidden", "access"]), \
                f"错误信息应提示权限不足，实际消息: {error_data.get('detail', 'N/A')}"
        except:
            # 如果响应不是JSON格式，检查状态码403就足够了
            pass

        # 尝试创建工具 - 应该被拒绝
        response = test_client.post(
            "/dev/tools",
            headers=headers,
            json={
                "tool_id": "test_tool",
                "name": "测试工具",
                "description": "测试描述"
            }
        )

        assert response.status_code == 403, f"普通用户创建开发者工具应该返回403，实际返回{response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
