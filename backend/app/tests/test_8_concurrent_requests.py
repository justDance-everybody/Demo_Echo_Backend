"""
测试用例 8: 并发请求测试

测试目标: 验证系统在高并发情况下的稳定性
"""

import pytest
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestConcurrentRequests:
    """测试用例8: 并发请求测试"""
    
    def test_8_1_concurrent_intent_interpretation(self, test_client, auth_tokens):
        """8.1 并发意图解析测试"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        def make_intent_request(i):
            """发送单个意图解析请求"""
            session_id = f"concurrent-test-{i}"
            response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": f"测试并发请求 {i}",
                    "session_id": session_id,
                    "user_id": 13
                }
            )
            return i, response
        
        # 并发发送10个请求
        start_time = time.time()
        success_count = 0
        total_requests = 10
        responses = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            # 提交所有请求
            future_to_request = {
                executor.submit(make_intent_request, i): i 
                for i in range(total_requests)
            }
            
            # 收集结果
            for future in as_completed(future_to_request):
                request_id, response = future.result()
                responses.append((request_id, response))
                
                if response.status_code == 200:
                    success_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # 验收标准验证
        success_rate = success_count / total_requests
        assert success_rate >= 0.8, f"并发请求成功率应该≥80%，实际为{success_rate:.2%}"
        
        # 响应时间应该在合理范围内（<2秒）
        assert total_time <= 2.0, f"总响应时间应该≤2秒，实际为{total_time:.2f}秒"
        
        # 不应该出现500错误
        error_500_count = sum(1 for _, resp in responses if resp.status_code == 500)
        assert error_500_count == 0, f"不应该出现500错误，实际出现{error_500_count}个"
        
        # 验证成功响应的结构
        for request_id, response in responses:
            if response.status_code == 200:
                data = response.json()
                assert "session_id" in data
                assert "type" in data
                assert "content" in data
    
    def test_8_2_concurrent_tool_execution(self, test_client, auth_tokens):
        """8.2 并发工具执行测试"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        def make_tool_request(i):
            """发送单个工具执行请求"""
            session_id = f"concurrent-tool-{i}"
            response = test_client.post(
                "/api/v1/execute",
                headers=headers,
                json={
                    "session_id": session_id,
                    "user_id": 13,
                    "tool_id": "translate_text",
                    "params": {
                        "text": f"Hello World {i}",
                        "target_language": "zh"
                    }
                }
            )
            return i, response
        
        # 并发发送8个工具执行请求
        start_time = time.time()
        success_count = 0
        total_requests = 8
        responses = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_request = {
                executor.submit(make_tool_request, i): i 
                for i in range(total_requests)
            }
            
            for future in as_completed(future_to_request):
                request_id, response = future.result()
                responses.append((request_id, response))
                
                if response.status_code == 200:
                    success_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # 验证成功率
        success_rate = success_count / total_requests
        assert success_rate >= 0.7, f"并发工具执行成功率应该≥70%，实际为{success_rate:.2%}"
        
        # 验证响应时间
        assert total_time <= 3.0, f"总响应时间应该≤3秒，实际为{total_time:.2f}秒"
        
        # 验证成功响应的结构
        for request_id, response in responses:
            if response.status_code == 200:
                data = response.json()
                assert "result" in data
                assert "tts" in data
                assert "session_id" in data
    
    def test_8_3_concurrent_mixed_requests(self, test_client, auth_tokens):
        """8.3 并发混合请求测试"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        def make_mixed_request(i):
            """发送混合类型的请求"""
            request_type = i % 3  # 0: 意图解析, 1: 工具执行, 2: 基础接口
            
            if request_type == 0:
                # 意图解析请求
                session_id = f"mixed-intent-{i}"
                response = test_client.post(
                    "/api/v1/intent/interpret",
                    headers=headers,
                    json={
                        "query": f"混合测试查询 {i}",
                        "session_id": session_id,
                        "user_id": 13
                    }
                )
            elif request_type == 1:
                # 工具执行请求
                session_id = f"mixed-tool-{i}"
                response = test_client.post(
                    "/api/v1/execute",
                    headers=headers,
                    json={
                        "session_id": session_id,
                        "user_id": 13,
                        "tool_id": "translate_text",
                        "params": {
                            "text": f"Mixed test {i}",
                            "target_language": "zh"
                        }
                    }
                )
            else:
                # 基础接口请求
                response = test_client.get("/api/v1/tools", headers=headers)
            
            return i, request_type, response
        
        # 并发发送15个混合请求
        start_time = time.time()
        success_count = 0
        total_requests = 15
        responses = []
        
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_request = {
                executor.submit(make_mixed_request, i): i 
                for i in range(total_requests)
            }
            
            for future in as_completed(future_to_request):
                request_id, request_type, response = future.result()
                responses.append((request_id, request_type, response))
                
                if response.status_code in [200, 201]:
                    success_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # 验证成功率
        success_rate = success_count / total_requests
        assert success_rate >= 0.75, f"并发混合请求成功率应该≥75%，实际为{success_rate:.2%}"
        
        # 验证响应时间
        assert total_time <= 4.0, f"总响应时间应该≤4秒，实际为{total_time:.2f}秒"
        
        # 验证不同类型请求的响应
        for request_id, request_type, response in responses:
            if response.status_code in [200, 201]:
                if request_type == 0:  # 意图解析
                    data = response.json()
                    assert "session_id" in data
                    assert "type" in data
                elif request_type == 1:  # 工具执行
                    data = response.json()
                    assert "result" in data
                    assert "tts" in data
                # request_type == 2 是基础接口，不需要特殊验证


class TestConcurrencyEdgeCases:
    """并发测试边界情况"""
    
    def test_8_4_concurrent_auth_requests(self, test_client):
        """8.4 并发认证请求测试"""
        def make_auth_request(i):
            """发送认证请求"""
            response = test_client.post(
                "/api/v1/auth/token",
                data={
                    "username": f"testuser_{i}",
                    "password": "testpassword"
                }
            )
            return i, response
        
        # 并发发送5个认证请求
        start_time = time.time()
        total_requests = 5
        responses = []
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_request = {
                executor.submit(make_auth_request, i): i 
                for i in range(total_requests)
            }
            
            for future in as_completed(future_to_request):
                request_id, response = future.result()
                responses.append((request_id, response))
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # 认证请求应该能处理并发（即使失败也应该快速响应）
        assert total_time <= 2.0, f"并发认证请求总时间应该≤2秒，实际为{total_time:.2f}秒"
        
        # 验证响应状态码的合理性
        for request_id, response in responses:
            assert response.status_code in [200, 401, 422], \
                f"认证请求应该返回合理的状态码，实际为{response.status_code}"
    
    def test_8_5_concurrent_performance_metrics(self, test_client, auth_tokens):
        """8.5 并发性能指标测试"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        def make_performance_request(i):
            """发送性能测试请求"""
            start_time = time.time()
            response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": f"性能测试查询 {i}",
                    "session_id": f"perf-test-{i}",
                    "user_id": 13
                }
            )
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            return i, response, response_time
        
        # 并发发送12个性能测试请求
        total_requests = 12
        response_times = []
        success_count = 0
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_request = {
                executor.submit(make_performance_request, i): i 
                for i in range(total_requests)
            }
            
            for future in as_completed(future_to_request):
                request_id, response, response_time = future.result()
                response_times.append(response_time)
                
                if response.status_code == 200:
                    success_count += 1
        
        # 验证成功率
        success_rate = success_count / total_requests
        assert success_rate >= 0.8, f"并发性能测试成功率应该≥80%，实际为{success_rate:.2%}"
        
        # 验证响应时间分布
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            # 平均响应时间应该在合理范围内
            assert avg_response_time <= 500, f"平均响应时间应该≤500ms，实际为{avg_response_time:.2f}ms"
            
            # 最大响应时间不应该过高
            assert max_response_time <= 2000, f"最大响应时间应该≤2000ms，实际为{max_response_time:.2f}ms"
            
            # 响应时间差异不应该过大（系统应该稳定）
            time_variance = max_response_time - min_response_time
            assert time_variance <= 1000, f"响应时间差异应该≤1000ms，实际为{time_variance:.2f}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
