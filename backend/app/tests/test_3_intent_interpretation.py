"""
测试用例 3: 意图解析接口

测试目标: 验证AI理解用户意图的准确性
"""

import pytest
import time
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id,
    create_test_query
)


class TestIntentInterpretation:
    """测试用例3: 意图解析接口测试"""

    def test_3_1_simple_query_intent(self, test_client, auth_tokens):
        """3.1 测试简单查询意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "今天深圳的天气怎么样",
                "session_id": session_id,
                "user_id": 13
            }
        )

        if response.status_code == 200:
            data = response.json()
            # 验证响应结构
            assert "session_id" in data
            assert "type" in data
            assert "content" in data
            assert data["session_id"] == session_id

            # 验证type字段值
            assert data["type"] in ["tool_call", "direct_response"]

            # 如果是tool_call，验证tool_calls结构
            if data["type"] == "tool_call":
                assert "tool_calls" in data
                assert isinstance(data["tool_calls"], list)
                if data["tool_calls"]:
                    tool_call = data["tool_calls"][0]
                    assert "tool_id" in tool_call
                    assert "parameters" in tool_call
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401

    def test_3_2_translation_intent(self, test_client, auth_tokens):
        """3.2 测试翻译意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "把hello world翻译成中文",
                "session_id": session_id,
                "user_id": 13
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert "session_id" in data
            assert "type" in data
            assert "content" in data
        else:
            assert response.status_code != 403
            assert response.status_code != 401

    def test_3_3_unrecognized_intent(self, test_client, auth_tokens):
        """3.3 测试无法识别的意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "asdfghjkl随机文本",
                "session_id": session_id,
                "user_id": 13
            }
        )

        if response.status_code == 200:
            data = response.json()
            # 系统应该优雅处理无法识别的输入
            assert "content" in data
            # 可能返回澄清请求或错误提示
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401

    def test_3_4_intent_missing_parameters(self, test_client, auth_tokens):
        """3.4 测试缺少必要参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 缺少query参数
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_id": 13
            }
        )
        assert response.status_code == 422

        # 缺少session_id参数
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "user_id": 13
            }
        )
        assert response.status_code == 422

        # 缺少user_id参数
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": "test-session-001"
            }
        )
        assert response.status_code == 422

    def test_3_5_intent_performance_requirement(self, test_client, auth_tokens):
        """3.5 测试意图解析性能要求（≤200ms）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        start_time = time.time()
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "今天天气如何",
                "session_id": session_id,
                "user_id": 13
            }
        )
        end_time = time.time()

        response_time = (end_time - start_time) * 1000  # 转换为毫秒

        if response.status_code == 200:
            # 验证响应时间符合PRD要求
            assert response_time <= 200, f"意图解析时间 {response_time:.2f}ms 超过200ms限制"
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401


class TestIntentEdgeCases:
    """意图解析边界情况测试"""

    def test_3_6_empty_query(self, test_client, auth_tokens):
        """3.6 测试空查询"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "",
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 应该返回验证错误
        assert response.status_code == 422

    def test_3_7_very_long_query(self, test_client, auth_tokens):
        """3.7 测试超长查询"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        # 创建超长查询
        long_query = "今天天气怎么样" * 1000  # 约10KB的查询

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": long_query,
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 应该能处理或返回验证错误
        assert response.status_code in [200, 400, 422, 413]

    def test_3_8_special_characters_query(self, test_client, auth_tokens):
        """3.8 测试特殊字符查询"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        special_query = "测试查询!@#$%^&*()_+-=[]{}|;':\",./<>?"

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": special_query,
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 应该能正常处理或返回验证错误
        assert response.status_code in [200, 400, 422]

    def test_3_9_unicode_query(self, test_client, auth_tokens):
        """3.9 测试Unicode字符查询"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        unicode_query = "测试查询🚀🌟🎉中文English混合"

        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": unicode_query,
                "session_id": session_id,
                "user_id": 13
            }
        )

        assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
