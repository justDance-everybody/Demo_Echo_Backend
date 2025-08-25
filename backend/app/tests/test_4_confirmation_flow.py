"""
测试用例 4: 确认执行流程

测试目标: 验证用户确认机制
"""

import pytest
from .conftest import generate_session_id


class TestConfirmationFlow:
    """测试用例4: 确认执行流程测试"""

    def test_4_1_and_4_2_confirmation_flow_complete(self, test_client, auth_tokens):
        """4.1-4.2 测试完整的确认执行流程"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = "test-session-004"

        # 4.1 先进行意图解析获取session_id
        intent_response = test_client.post(
            "/intent/interpret",
            headers=headers,
            json={
                "query": "帮我查询当前北京的天气情况",
                "session_id": session_id,
                "user_id": 13
            }
        )

        # 如果意图解析失败，打印错误信息用于调试
        if intent_response.status_code != 200:
            print(f"⚠️  意图解析失败，状态码: {intent_response.status_code}")
            try:
                error_data = intent_response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   响应内容: {intent_response.text}")

        assert intent_response.status_code == 200, f"意图解析失败，状态码: {intent_response.status_code}"

        intent_data = intent_response.json()
        returned_session_id = intent_data["session_id"]

        # 打印意图解析的响应内容用于调试
        print(f"📋 意图解析响应内容: {intent_data}")
        print(f"📋 会话ID: {returned_session_id}")
        if 'type' in intent_data:
            print(f"📋 响应类型: {intent_data['type']}")
        if 'tool_calls' in intent_data:
            print(f"📋 工具调用: {intent_data['tool_calls']}")

        # 4.2 确认执行
        confirm_response = test_client.post(
            "/intent/confirm",
            headers=headers,
            json={
                "session_id": returned_session_id,
                "user_input": "是的，确认执行"
            }
        )

        # 如果确认执行失败，打印错误信息用于调试
        if confirm_response.status_code != 200:
            print(f"⚠️  确认执行失败，状态码: {confirm_response.status_code}")
            try:
                error_data = confirm_response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   响应内容: {confirm_response.text}")

                # 验收标准: 返回状态码 200
        assert confirm_response.status_code == 200, f"确认执行失败，状态码: {confirm_response.status_code}"

        confirm_data = confirm_response.json()

        # 打印完整的确认响应用于调试
        print(f"📋 确认执行响应内容: {confirm_data}")

        # 验收标准: success 字段为 true
        assert "success" in confirm_data, "响应中缺少success字段"

        # 如果success为False，打印错误信息
        if not confirm_data.get("success"):
            print(f"⚠️  确认执行失败，success为False")
            if "error" in confirm_data and confirm_data["error"]:
                print(f"   错误信息: {confirm_data['error']}")
            if "content" in confirm_data:
                print(f"   响应内容: {confirm_data['content']}")

        assert confirm_data["success"] is True, f"success字段应为true，实际为: {confirm_data.get('success')}"

        # 验收标准: content 字段包含执行结果
        assert "content" in confirm_data, "响应中缺少content字段"
        assert confirm_data["content"] is not None, "content字段不应为null"

        # 验收标准: error 字段为 null（成功时）
        assert "error" in confirm_data, "响应中缺少error字段"
        assert confirm_data["error"] is None, f"error字段应为null，实际为: {confirm_data.get('error')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
