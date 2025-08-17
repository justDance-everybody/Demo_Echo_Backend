"""
测试用例 3: 意图解析接口

测试目标: 验证AI理解用户意图的准确性
"""

import pytest
from .conftest import generate_session_id


class TestIntentInterpretation:
    """测试用例3: 意图解析接口测试"""

    def test_3_1_simple_query_intent(self, test_client, auth_tokens):
        """3.1 测试简单查询意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/intent/interpret",
            headers=headers,
            json={
                "query": "今天深圳的天气怎么样",
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 验收标准: 返回状态码 200
        if response.status_code != 200:
            # 如果失败，打印详细错误信息用于调试
            print(f"⚠️  意图解析接口返回错误，状态码: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   响应内容: {response.text}")
        assert response.status_code == 200, f"意图解析失败，状态码: {response.status_code}"

        data = response.json()

        # 验收标准: 响应包含 type 字段 ("tool_call" 或 "direct_response")
        assert "type" in data, "响应中缺少type字段"
        assert data["type"] in ["tool_call", "direct_response"], f"type字段值无效: {data.get('type')}"

        # 验收标准: 包含 content 字段作为AI回复
        assert "content" in data, "响应中缺少content字段"

        # 验收标准: session_id 正确返回
        assert "session_id" in data, "响应中缺少session_id字段"
        assert data["session_id"] == session_id, f"session_id不匹配，期望: {session_id}，实际: {data.get('session_id')}"

        # 验收标准: 如果是 tool_call，包含 tool_calls 数组
        if data["type"] == "tool_call":
            assert "tool_calls" in data, "tool_call类型响应中缺少tool_calls字段"
            assert isinstance(data["tool_calls"], list), "tool_calls应该是数组"
            if data["tool_calls"]:
                tool_call = data["tool_calls"][0]
                assert "tool_id" in tool_call, "tool_call中缺少tool_id字段"
                assert "parameters" in tool_call, "tool_call中缺少parameters字段"

    def test_3_2_translation_intent(self, test_client, auth_tokens):
        """3.2 测试翻译意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/intent/interpret",
            headers=headers,
            json={
                "query": "把hello world翻译成中文",
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 验收标准: 返回状态码 200
        if response.status_code != 200:
            # 如果失败，打印详细错误信息用于调试
            print(f"⚠️  翻译意图解析接口返回错误，状态码: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   响应内容: {response.text}")
        assert response.status_code == 200, f"翻译意图解析失败，状态码: {response.status_code}"

        data = response.json()

        # 验收标准: 响应包含 type 字段 ("tool_call" 或 "direct_response")
        assert "type" in data, "响应中缺少type字段"
        assert data["type"] in ["tool_call", "direct_response"], f"type字段值无效: {data.get('type')}"

        # 验收标准: 包含 content 字段作为AI回复
        assert "content" in data, "响应中缺少content字段"

        # 验收标准: session_id 正确返回
        assert "session_id" in data, "响应中缺少session_id字段"
        assert data["session_id"] == session_id, f"session_id不匹配，期望: {session_id}，实际: {data.get('session_id')}"

        # 验收标准: 如果是 tool_call，包含 tool_calls 数组
        if data["type"] == "tool_call":
            assert "tool_calls" in data, "tool_call类型响应中缺少tool_calls字段"
            assert isinstance(data["tool_calls"], list), "tool_calls应该是数组"

    def test_3_3_unrecognized_intent(self, test_client, auth_tokens):
        """3.3 测试无法识别的意图"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()

        response = test_client.post(
            "/intent/interpret",
            headers=headers,
            json={
                "query": "asdfghjkl随机文本",
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 验收标准: 系统应该优雅处理无法识别的输入
        if response.status_code != 200:
            # 如果失败，打印详细错误信息用于调试
            print(f"⚠️  无法识别意图处理接口返回错误，状态码: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   响应内容: {response.text}")
        assert response.status_code == 200, f"系统处理无法识别输入失败，状态码: {response.status_code}"

        data = response.json()

        # 验收标准: 返回合理的错误提示或澄清请求
        assert "content" in data, "响应中缺少content字段"

        # 验证系统优雅处理：应该包含基本响应结构
        assert "type" in data, "响应中缺少type字段"
        assert "session_id" in data, "响应中缺少session_id字段"
        assert data["session_id"] == session_id, f"session_id不匹配，期望: {session_id}，实际: {data.get('session_id')}"

        # 验证content内容是合理的回复（不应该为空）
        content = data.get("content", "")
        assert len(content.strip()) > 0, "content字段不应为空，应包含合理的回复或澄清请求"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
