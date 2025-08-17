"""
测试用例 9: 响应时间测试

测试目标: 验证系统响应时间符合PRD要求
"""

import pytest
import time
import statistics
from .conftest import (
    assert_response_structure,
    assert_error_response,
    generate_session_id
)


class TestResponseTimeRequirements:
    """测试用例9: 响应时间要求测试"""
    
    def test_9_1_intent_interpretation_response_time(self, test_client, auth_tokens):
        """9.1 测试意图解析响应时间 ≤ 200ms"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 进行多次测试取平均值
        test_queries = [
            "今天天气如何",
            "翻译hello为中文",
            "深圳现在几点了",
            "帮我查一下明天的天气",
            "这个工具怎么用"
        ]
        
        response_times = []
        success_count = 0
        
        for i, query in enumerate(test_queries):
            session_id = f"perf-test-intent-{i}"
            
            start_time = time.time()
            response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": query,
                    "session_id": session_id,
                    "user_id": 13
                }
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            response_times.append(response_time)
            
            if response.status_code == 200:
                success_count += 1
        
        # 验证成功率
        success_rate = success_count / len(test_queries)
        assert success_rate >= 0.8, f"意图解析成功率应该≥80%，实际为{success_rate:.2%}"
        
        # 验证响应时间要求
        if response_times:
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            # PRD要求：意图解析时间 ≤ 200ms
            assert avg_response_time <= 200, f"意图解析平均响应时间应该≤200ms，实际为{avg_response_time:.2f}ms"
            
            # 单次响应时间不应该过高
            assert max_response_time <= 500, f"意图解析最大响应时间应该≤500ms，实际为{max_response_time:.2f}ms"
            
            # 响应时间应该相对稳定
            time_variance = max_response_time - min_response_time
            assert time_variance <= 300, f"响应时间差异应该≤300ms，实际为{time_variance:.2f}ms"
    
    def test_9_2_tool_execution_response_time(self, test_client, auth_tokens):
        """9.2 测试工具执行响应时间 ≤ 300ms"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试不同类型的工具
        test_tools = [
            {
                "tool_id": "translate_text",
                "params": {"text": "Hello World", "target_language": "zh"}
            },
            {
                "tool_id": "weather_query",
                "params": {"city": "深圳", "date": "today"}
            }
        ]
        
        response_times = []
        success_count = 0
        
        for i, tool_config in enumerate(test_tools):
            session_id = f"perf-test-tool-{i}"
            
            start_time = time.time()
            response = test_client.post(
                "/api/v1/execute",
                headers=headers,
                json={
                    "session_id": session_id,
                    "user_id": 13,
                    "tool_id": tool_config["tool_id"],
                    "params": tool_config["params"]
                }
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            response_times.append(response_time)
            
            if response.status_code == 200:
                success_count += 1
        
        # 验证成功率
        success_rate = success_count / len(test_tools)
        assert success_rate >= 0.7, f"工具执行成功率应该≥70%，实际为{success_rate:.2%}"
        
        # 验证响应时间要求
        if response_times:
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            # PRD要求：工具执行时间 ≤ 300ms
            assert avg_response_time <= 300, f"工具执行平均响应时间应该≤300ms，实际为{avg_response_time:.2f}ms"
            
            # 单次响应时间不应该过高
            assert max_response_time <= 800, f"工具执行最大响应时间应该≤800ms，实际为{max_response_time:.2f}ms"
            
            # 响应时间应该相对稳定
            time_variance = max_response_time - min_response_time
            assert time_variance <= 500, f"响应时间差异应该≤500ms，实际为{time_variance:.2f}ms"
    
    def test_9_3_end_to_end_response_time(self, test_client, auth_tokens):
        """9.3 测试端到端响应时间 ≤ 500ms"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 端到端流程：意图解析 + 工具执行
        test_queries = [
            "翻译hello world为中文",
            "查询深圳今天的天气",
            "现在几点了"
        ]
        
        end_to_end_times = []
        success_count = 0
        
        for i, query in enumerate(test_queries):
            session_id = f"perf-test-e2e-{i}"
            
            # 开始计时
            start_time = time.time()
            
            # 1. 意图解析
            intent_response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": query,
                    "session_id": session_id,
                    "user_id": 13
                }
            )
            
            if intent_response.status_code == 200:
                intent_data = intent_response.json()
                
                # 2. 如果是工具调用，执行工具
                if intent_data.get("type") == "tool_call" and "tool_calls" in intent_data:
                    tool_call = intent_data["tool_calls"][0]
                    tool_id = tool_call.get("tool_id")
                    
                    if tool_id:
                        # 执行工具
                        execute_response = test_client.post(
                            "/api/v1/execute",
                            headers=headers,
                            json={
                                "session_id": session_id,
                                "user_id": 13,
                                "tool_id": tool_id,
                                "params": tool_call.get("parameters", {})
                            }
                        )
                        
                        if execute_response.status_code == 200:
                            success_count += 1
                
                # 结束计时
                end_time = time.time()
                end_to_end_time = (end_time - start_time) * 1000  # 转换为毫秒
                end_to_end_times.append(end_to_end_time)
        
        # 验证成功率
        if test_queries:
            success_rate = success_count / len(test_queries)
            assert success_rate >= 0.6, f"端到端流程成功率应该≥60%，实际为{success_rate:.2%}"
        
        # 验证响应时间要求
        if end_to_end_times:
            avg_response_time = statistics.mean(end_to_end_times)
            max_response_time = max(end_to_end_times)
            min_response_time = min(end_to_end_times)
            
            # PRD要求：端到端总时间 ≤ 500ms
            assert avg_response_time <= 500, f"端到端平均响应时间应该≤500ms，实际为{avg_response_time:.2f}ms"
            
            # 单次响应时间不应该过高
            assert max_response_time <= 1000, f"端到端最大响应时间应该≤1000ms，实际为{max_response_time:.2f}ms"
            
            # 响应时间应该相对稳定
            time_variance = max_response_time - min_response_time
            assert time_variance <= 600, f"响应时间差异应该≤600ms，实际为{time_variance:.2f}ms"


class TestResponseTimeStability:
    """响应时间稳定性测试"""
    
    def test_9_4_response_time_consistency(self, test_client, auth_tokens):
        """9.4 测试响应时间一致性"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 对同一个接口进行多次测试
        session_id = generate_session_id()
        test_query = "今天天气如何"
        
        response_times = []
        
        for i in range(10):
            start_time = time.time()
            response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": test_query,
                    "session_id": f"{session_id}-{i}",
                    "user_id": 13
                }
            )
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
        
        # 验证响应时间一致性
        if len(response_times) >= 5:
            avg_time = statistics.mean(response_times)
            std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
            
            # 标准差应该相对较小（响应时间稳定）
            assert std_dev <= 100, f"响应时间标准差应该≤100ms，实际为{std_dev:.2f}ms"
            
            # 大部分响应时间应该在平均值附近
            within_range = sum(1 for t in response_times if abs(t - avg_time) <= 150)
            consistency_rate = within_range / len(response_times)
            assert consistency_rate >= 0.8, f"响应时间一致性应该≥80%，实际为{consistency_rate:.2%}"
    
    def test_9_5_response_time_under_load(self, test_client, auth_tokens):
        """9.5 测试负载下的响应时间"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 快速连续发送请求
        response_times = []
        success_count = 0
        
        for i in range(20):
            session_id = f"load-test-{i}"
            start_time = time.time()
            
            response = test_client.post(
                "/api/v1/intent/interpret",
                headers=headers,
                json={
                    "query": f"负载测试查询 {i}",
                    "session_id": session_id,
                    "user_id": 13
                }
            )
            
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
                success_count += 1
        
        # 验证负载下的性能
        if response_times:
            success_rate = success_count / 20
            assert success_rate >= 0.7, f"负载测试成功率应该≥70%，实际为{success_rate:.2%}"
            
            avg_time = statistics.mean(response_times)
            max_time = max(response_times)
            
            # 负载下平均响应时间不应该过高
            assert avg_time <= 400, f"负载下平均响应时间应该≤400ms，实际为{avg_time:.2f}ms"
            
            # 最大响应时间应该在合理范围内
            assert max_time <= 1000, f"负载下最大响应时间应该≤1000ms，实际为{max_time:.2f}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
