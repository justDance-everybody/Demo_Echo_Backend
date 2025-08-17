"""
测试用例 10: 异常情况处理

测试目标: 验证系统错误处理机制的有效性
"""

import pytest
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestAuthenticationErrors:
    """测试用例10.1: 认证错误处理"""
    
    def test_10_1_invalid_token(self, test_client):
        """10.1 测试无效token"""
        headers = {"Authorization": "Bearer invalid_token_123"}
        
        response = test_client.get("/api/v1/tools", headers=headers)
        
        # 应该返回状态码 401
        assert response.status_code == 401
        
        # 错误信息应该清晰明确
        if response.status_code == 401:
            data = response.json()
            error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
            assert len(error_message) > 0, "错误信息应该包含内容"
    
    def test_10_2_missing_token(self, test_client):
        """10.2 测试缺少token"""
        response = test_client.get("/api/v1/tools")
        
        # 应该返回状态码 401
        assert response.status_code == 401
        
        # 错误信息应该清晰明确
        if response.status_code == 401:
            data = response.json()
            error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
            assert len(error_message) > 0, "错误信息应该包含内容"
    
    def test_10_3_malformed_token(self, test_client):
        """10.3 测试格式错误的token"""
        # 测试各种格式错误的token
        malformed_tokens = [
            "Bearer",  # 只有Bearer前缀
            "Bearer ",  # Bearer后只有空格
            "Bearer invalid",  # 无效的token格式
            "InvalidPrefix token123",  # 错误的前缀
            "Bearer123",  # 没有空格分隔
        ]
        
        for token in malformed_tokens:
            headers = {"Authorization": token}
            response = test_client.get("/api/v1/tools", headers=headers)
            
            # 应该返回401或422
            assert response.status_code in [401, 422], f"格式错误的token '{token}' 应该返回401或422，实际返回{response.status_code}"
    
    def test_10_4_expired_token(self, test_client, test_users):
        """10.4 测试过期token"""
        from jose import jwt
        from datetime import datetime, timedelta
        from app.config import settings
        
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
        
        # 应该返回状态码 401
        assert response.status_code == 401


class TestParameterValidationErrors:
    """测试用例10.2: 参数验证错误处理"""
    
    def test_10_5_missing_required_parameters(self, test_client, auth_tokens):
        """10.5 测试缺少必要参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试意图解析缺少必要参数
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "session_id": "error-test-001"
                # 缺少query和user_id
            }
        )
        
        # 应该返回状态码 422 (Validation Error)
        assert response.status_code == 422
        
        # 错误信息应该指出缺失的字段
        if response.status_code == 422:
            data = response.json()
            detail = data.get("detail", [])
            if isinstance(detail, list):
                # 检查是否包含字段缺失的错误
                field_errors = [err for err in detail if "field" in err or "loc" in err]
                assert len(field_errors) > 0, "应该指出缺失的字段"
    
    def test_10_6_invalid_data_types(self, test_client, auth_tokens):
        """10.6 测试无效数据类型"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试无效的user_id类型
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": "error-test-002",
                "user_id": "invalid_user_id"  # 应该是数字
            }
        )
        
        # 应该返回验证错误
        assert response.status_code == 422
        
        # 测试无效的session_id类型
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": 123,  # 应该是字符串
                "user_id": 13
            }
        )
        
        # 应该返回验证错误
        assert response.status_code == 422
    
    def test_10_7_invalid_parameter_values(self, test_client, auth_tokens):
        """10.7 测试无效参数值"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试空字符串参数
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "",  # 空查询
                "session_id": "error-test-003",
                "user_id": 13
            }
        )
        
        # 应该返回验证错误
        assert response.status_code == 422
        
        # 测试负数user_id
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": "error-test-004",
                "user_id": -1  # 负数用户ID
            }
        )
        
        # 应该返回验证错误
        assert response.status_code == 422


class TestBusinessLogicErrors:
    """测试用例10.3: 业务逻辑错误处理"""
    
    def test_10_8_nonexistent_tool(self, test_client, auth_tokens):
        """10.8 测试不存在的工具"""
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
        
        # 错误信息应该说明工具不存在
        if response.status_code != 500:
            data = response.json()
            error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
            assert len(error_message) > 0, "错误信息应该包含内容"
    
    def test_10_9_invalid_session_id(self, test_client, auth_tokens):
        """10.9 测试无效session_id"""
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
    
    def test_10_10_invalid_tool_parameters(self, test_client, auth_tokens):
        """10.10 测试无效工具参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        session_id = generate_session_id()
        
        # 测试翻译工具无效参数
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


class TestBoundaryConditions:
    """测试用例10.4: 边界条件测试"""
    
    def test_10_11_empty_parameters(self, test_client, auth_tokens):
        """10.11 测试空参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试空查询
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "",
                "session_id": "error-test-011",
                "user_id": 13
            }
        )
        
        assert response.status_code == 422
        
        # 测试空session_id
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": "",
                "user_id": 13
            }
        )
        
        assert response.status_code == 422
    
    def test_10_12_very_long_parameters(self, test_client, auth_tokens):
        """10.12 测试超长参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 创建超长查询
        long_query = "测试查询" * 1000  # 约10KB的查询
        
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": long_query,
                "session_id": "error-test-012",
                "user_id": 13
            }
        )
        
        # 应该能处理或返回验证错误
        assert response.status_code in [200, 400, 422, 413]
    
    def test_10_13_special_characters_parameters(self, test_client, auth_tokens):
        """10.13 测试特殊字符参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        special_query = "测试查询!@#$%^&*()_+-=[]{}|;':\",./<>?"
        
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": special_query,
                "session_id": "error-test-013",
                "user_id": 13
            }
        )
        
        # 应该能正常处理或返回验证错误
        assert response.status_code in [200, 400, 422]
    
    def test_10_14_unicode_parameters(self, test_client, auth_tokens):
        """10.14 测试Unicode字符参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        unicode_query = "测试查询🚀🌟🎉中文English混合"
        
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": unicode_query,
                "session_id": "error-test-014",
                "user_id": 13
            }
        )
        
        assert response.status_code in [200, 400, 422]
    
    def test_10_15_extreme_numeric_values(self, test_client, auth_tokens):
        """10.15 测试极端数值"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试极大的user_id
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                "query": "测试查询",
                "session_id": "error-test-015",
                "user_id": 999999999999999999  # 极大的用户ID
            }
        )
        
        # 应该能处理或返回验证错误
        assert response.status_code in [200, 400, 422]


class TestErrorResponseConsistency:
    """测试用例10.5: 错误响应一致性"""
    
    def test_10_16_general_error_format(self, test_client):
        """10.16 测试通用错误响应格式"""
        # 测试未认证访问
        response = test_client.get("/api/v1/tools")
        
        if response.status_code == 401:
            data = response.json()
            # 验证错误响应结构
            assert "detail" in data or "error" in data or "message" in data
    
    def test_10_17_validation_error_format(self, test_client, auth_tokens):
        """10.17 测试验证错误响应格式"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            json={
                # 缺少必要参数
            }
        )
        
        if response.status_code == 422:
            data = response.json()
            # 验证错误响应结构
            assert "detail" in data
            detail = data["detail"]
            assert isinstance(detail, list)
    
    def test_10_18_not_found_error_format(self, test_client, auth_tokens):
        """10.18 测试404错误响应格式"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 访问不存在的端点
        response = test_client.get("/api/v1/nonexistent_endpoint", headers=headers)
        
        if response.status_code == 404:
            data = response.json()
            # 验证错误响应结构
            assert "detail" in data or "error" in data or "message" in data
    
    def test_10_19_internal_server_error_format(self, test_client, auth_tokens):
        """10.19 测试500错误响应格式"""
        # 这个测试可能需要触发实际的服务器错误
        # 我们主要验证错误响应的基本结构
        
        # 测试无效的JSON格式
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 发送无效的JSON
        response = test_client.post(
            "/api/v1/intent/interpret",
            headers=headers,
            data="invalid json data",  # 无效的JSON
            content_type="application/json"
        )
        
        # 应该返回400或422
        assert response.status_code in [400, 422, 500]
        
        if response.status_code in [400, 422, 500]:
            try:
                data = response.json()
                # 验证错误响应结构
                assert "detail" in data or "error" in data or "message" in data
            except ValueError:
                # 如果无法解析JSON，至少验证状态码
                pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
