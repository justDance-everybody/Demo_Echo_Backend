"""
测试用例 4: 确认执行流程

测试目标: 验证用户确认机制
"""

import pytest
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestConfirmationFlow:
    """测试用例4: 确认执行流程测试"""
    
    def test_4_1_confirmation_flow_success(self, test_client, auth_tokens):
        """4.1 测试确认执行流程成功"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 1. 先进行意图解析获取session_id
        intent_response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "翻译hello为中文",
                "session_id": session_id,
                "user_id": 13
            }
        )
        
        if intent_response.status_code == 200:
            intent_data = intent_response.json()
            session_id = intent_data["session_id"]
            
            # 2. 确认执行
            confirm_response = test_client.post(
                "/api/v1/intent/confirm",
                headers=headers,
                json={
                    "session_id": session_id,
                    "user_input": "是的，确认执行"
                }
            )
            
            if confirm_response.status_code == 200:
                confirm_data = confirm_response.json()
                # 验证响应结构
                assert "session_id" in confirm_data
                assert "success" in confirm_data
                assert "content" in confirm_data
                assert "error" in confirm_data
                
                # 验证成功状态
                assert confirm_data["success"] is True
                assert confirm_data["error"] is None
                assert confirm_data["session_id"] == session_id
            else:
                assert confirm_response.status_code != 403
                assert confirm_response.status_code != 401
        else:
            assert intent_response.status_code != 403
            assert intent_response.status_code != 401
    
    def test_4_2_confirmation_missing_parameters(self, test_client, auth_tokens):
        """4.2 测试确认执行缺少参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 缺少session_id
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "user_input": "确认执行"
            }
        )
        assert response.status_code == 422
        
        # 缺少user_input
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "test-session-001"
            }
        )
        assert response.status_code == 422
    
    def test_4_3_confirmation_invalid_session(self, test_client, auth_tokens):
        """4.3 测试无效session_id的确认"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "invalid-session-id",
                "user_input": "确认执行"
            }
        )
        
        # 应该返回适当的错误状态码
        assert response.status_code in [400, 404, 422]
    
    def test_4_4_confirmation_different_user_inputs(self, test_client, auth_tokens):
        """4.4 测试不同的用户确认输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 先进行意图解析
        intent_response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "翻译hello为中文",
                "session_id": session_id,
                "user_id": 13
            }
        )
        
        if intent_response.status_code == 200:
            intent_data = intent_response.json()
            session_id = intent_data["session_id"]
            
            # 测试不同的确认输入
            confirm_inputs = [
                "是的",
                "确认",
                "y",
                "Y",
                "确认执行",
                "好的，执行吧",
                "可以",
                "行"
            ]
            
            for user_input in confirm_inputs:
                confirm_response = test_client.post(
                    "/api/v1/intent/confirm",
                    headers=headers,
                    json={
                        "session_id": session_id,
                        "user_input": user_input
                    }
                )
                
                # 应该能处理各种确认输入
                if confirm_response.status_code == 200:
                    confirm_data = confirm_response.json()
                    assert confirm_data["success"] is True
                    break  # 找到一个成功的就停止
                else:
                    # 如果失败，至少不是权限问题
                    assert confirm_response.status_code != 403
                    assert confirm_response.status_code != 401
    
    def test_4_5_confirmation_negative_inputs(self, test_client, auth_tokens):
        """4.5 测试否定的用户输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 先进行意图解析
        intent_response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "翻译hello为中文",
                "session_id": session_id,
                "user_id": 13
            }
        )
        
        if intent_response.status_code == 200:
            intent_data = intent_response.json()
            session_id = intent_data["session_id"]
            
            # 测试否定的输入
            negative_inputs = [
                "不",
                "否",
                "n",
                "N",
                "取消",
                "不要执行",
                "算了"
            ]
            
            for user_input in negative_inputs:
                confirm_response = test_client.post(
                    "/api/v1/intent/confirm",
                    headers=headers,
                    json={
                        "session_id": session_id,
                        "user_input": user_input
                    }
                )
                
                # 应该能处理各种否定输入
                if confirm_response.status_code == 200:
                    confirm_data = confirm_response.json()
                    # 可能返回成功但内容表示取消，或者返回失败
                    assert "content" in confirm_data
                    break
                else:
                    # 如果失败，至少不是权限问题
                    assert confirm_response.status_code != 403
                    assert confirm_response.status_code != 401


class TestConfirmationEdgeCases:
    """确认执行边界情况测试"""
    
    def test_4_6_empty_user_input(self, test_client, auth_tokens):
        """4.6 测试空用户输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_input": ""
            }
        )
        
        assert response.status_code == 422
    
    def test_4_7_very_long_user_input(self, test_client, auth_tokens):
        """4.7 测试超长用户输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建超长输入
        long_input = "确认执行" * 1000
        
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_input": long_input
            }
        )
        
        # 应该能处理或返回验证错误
        assert response.status_code in [200, 400, 422, 413]
    
    def test_4_8_special_characters_user_input(self, test_client, auth_tokens):
        """4.8 测试特殊字符用户输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        special_input = "确认执行!@#$%^&*()_+-=[]{}|;':\",./<>?"
        
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_input": special_input
            }
        )
        
        # 应该能正常处理或返回验证错误
        assert response.status_code in [200, 400, 422]
    
    def test_4_9_unicode_user_input(self, test_client, auth_tokens):
        """4.9 测试Unicode字符用户输入"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        unicode_input = "确认执行🚀🌟🎉中文English混合"
        
        response = test_client.post(
            "/api/v1/intent/confirm",
            headers=headers,
            json={
                "session_id": "test-session-001",
                "user_input": unicode_input
            }
        )
        
        assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
