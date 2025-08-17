"""
测试用例 5: 直接工具执行

测试目标: 测试工具调用功能
"""

import pytest
from .conftest import (
    generate_session_id
)


class TestDirectToolExecution:
    """测试用例5: 直接工具执行测试"""

    def test_5_1_translate_tool_execution(self, test_client, auth_tokens):
        """5.1 测试翻译工具执行"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = "test-session-005"

        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": "Hello World",
                    "target_language": "zh"
                }
            }
        )

        # 验收标准: 返回状态码 200
        assert response.status_code == 200, f"翻译工具执行失败，状态码: {response.status_code}"

        data = response.json()

        # 验收标准: result 字段包含翻译结果
        assert "result" in data, "响应中缺少result字段"
        assert data["result"] is not None, "result字段为空"

        # 验收标准: tts 字段包含适合语音播报的文本
        assert "tts" in data, "响应中缺少tts字段"
        assert isinstance(data["tts"], str), "tts字段应为字符串类型"
        assert len(data["tts"]) > 0, "tts字段内容为空"

        # 验收标准: session_id 正确返回
        assert "session_id" in data, "响应中缺少session_id字段"
        assert data["session_id"] == session_id, f"session_id不匹配，期望: {session_id}, 实际: {data.get('session_id')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
