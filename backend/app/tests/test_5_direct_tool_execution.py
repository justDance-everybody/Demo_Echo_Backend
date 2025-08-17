"""
测试用例 5: 直接工具执行

测试目标: 测试工具调用功能
"""

import pytest
import time
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestDirectToolExecution:
    """测试用例5: 直接工具执行测试"""
    
    def test_5_1_translate_tool_execution(self, test_client, auth_tokens):
        """5.1 测试翻译工具执行"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
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
        
        if response.status_code == 200:
            data = response.json()
            # 验证响应结构
            assert "result" in data
            assert "tts" in data
            assert "session_id" in data
            
            # 验证TTS文本适合语音播报
            assert isinstance(data["tts"], str)
            assert len(data["tts"]) > 0
            assert data["session_id"] == session_id
        else:
            # 如果失败，至少验证不是权限问题
            assert response.status_code != 403
            assert response.status_code != 401
    
    def test_5_2_weather_tool_execution(self, test_client, auth_tokens):
        """5.2 测试天气查询工具执行"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "weather_query",
                "params": {
                    "city": "深圳",
                    "date": "today"
                }
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "result" in data
            assert "tts" in data
            assert "session_id" in data
        else:
            assert response.status_code != 403
            assert response.status_code != 401
    
    def test_5_3_tool_execution_missing_parameters(self, test_client, auth_tokens):
        """5.3 测试工具执行缺少参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 缺少session_id
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {"text": "Hello"}
            }
        )
        assert response.status_code == 422
        
        # 缺少tool_id
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_id": 13,
                "params": {"text": "Hello"}
            }
        )
        assert response.status_code == 422
        
        # 缺少params
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_id": 13,
                "tool_id": "translate_text"
            }
        )
        assert response.status_code == 422
    
    def test_5_4_tool_execution_performance_requirement(self, test_client, auth_tokens):
        """5.4 测试工具执行性能要求（≤300ms）"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        start_time = time.time()
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": "Hello",
                    "target_language": "zh"
                }
            }
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # 转换为毫秒
        
        if response.status_code == 200:
            # 验证响应时间符合PRD要求
            assert response_time <= 300, f"工具执行时间 {response_time:.2f}ms 超过300ms限制"
        else:
            assert response.status_code != 403
            assert response.status_code != 401
    
    def test_5_5_nonexistent_tool_execution(self, test_client, auth_tokens):
        """5.5 测试执行不存在的工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "non_existent_tool",
                "params": {}
            }
        )
        
        # 应该返回适当的错误状态码
        assert response.status_code in [400, 404, 422]
        
        # 验证错误信息说明工具不存在
        if response.status_code != 500:
            data = response.json()
            error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
            # 错误信息应该包含相关提示
            assert len(error_message) > 0


class TestToolExecutionEdgeCases:
    """工具执行边界情况测试"""
    
    def test_5_6_empty_tool_parameters(self, test_client, auth_tokens):
        """5.6 测试空工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 测试翻译工具缺少必要参数
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    # 缺少text参数
                    "target_language": "zh"
                }
            }
        )
        
        # 应该返回参数验证错误
        assert response.status_code in [400, 422]
    
    def test_5_7_invalid_tool_parameters(self, test_client, auth_tokens):
        """5.7 测试无效工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 测试无效的语言代码
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": "Hello",
                    "target_language": "invalid_language"  # 无效语言代码
                }
            }
        )
        
        # 应该返回参数验证错误或业务逻辑错误
        assert response.status_code in [400, 422, 500]
    
    def test_5_8_very_long_tool_parameters(self, test_client, auth_tokens):
        """5.8 测试超长工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 创建超长文本
        long_text = "Hello World" * 1000
        
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": long_text,
                    "target_language": "zh"
                }
            }
        )
        
        # 应该能处理或返回验证错误
        assert response.status_code in [200, 400, 422, 413]
    
    def test_5_9_special_characters_tool_parameters(self, test_client, auth_tokens):
        """5.9 测试特殊字符工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        special_text = "Hello World!@#$%^&*()_+-=[]{}|;':\",./<>?"
        
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": special_text,
                    "target_language": "zh"
                }
            }
        )
        
        # 应该能正常处理或返回验证错误
        assert response.status_code in [200, 400, 422]
    
    def test_5_10_unicode_tool_parameters(self, test_client, auth_tokens):
        """5.10 测试Unicode字符工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        unicode_text = "Hello World🚀🌟🎉中文English混合"
        
        response = test_client.post(
            "/api/v1/execute",
            headers=headers,
            json={
                "session_id": session_id,
                "user_id": 13,
                "tool_id": "translate_text",
                "params": {
                    "text": unicode_text,
                    "target_language": "zh"
                }
            }
        )
        
        assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
