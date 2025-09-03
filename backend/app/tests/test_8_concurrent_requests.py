"""
测试用例 8: 并发请求测试

测试目标: 验证系统在高并发情况下的稳定性
"""

import pytest
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from .conftest import generate_session_id


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
                "/intent/interpret", # APIClient会添加/api/v1前缀
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
        error_500_count = 0

        with ThreadPoolExecutor(max_workers=10) as executor:
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
                elif response.status_code == 500:
                    error_500_count += 1

        end_time = time.time()
        total_time = end_time - start_time

        # 调试输出
        print(f"📋 并发测试结果:")
        print(f"   - 总请求数: {total_requests}")
        print(f"   - 成功请求数: {success_count}")
        print(f"   - 500错误数: {error_500_count}")
        print(f"   - 总响应时间: {total_time:.2f}秒")

        for request_id, response in responses:
            print(f"   - 请求 {request_id}: 状态码 {response.status_code}")

        # 验收标准: 所有请求都应该成功返回
        success_rate = success_count / total_requests
        assert success_rate == 1.0, f"所有请求都应该成功返回，实际成功率为{success_rate:.2%}"

        # 验收标准: 响应时间应该在合理范围内（<2秒）
        assert total_time <= 2.0, f"响应时间应该在合理范围内（<2秒），实际为{total_time:.2f}秒"

        # 验收标准: 不应该出现500错误或连接超时
        assert error_500_count == 0, f"不应该出现500错误，实际出现{error_500_count}个"

        # 验证成功响应的结构
        for request_id, response in responses:
            if response.status_code == 200:
                data = response.json()
                assert "session_id" in data, f"请求 {request_id} 响应中缺少session_id字段"
                assert "type" in data, f"请求 {request_id} 响应中缺少type字段"
                assert "content" in data, f"请求 {request_id} 响应中缺少content字段"
                assert data["session_id"] == f"concurrent-test-{request_id}", f"请求 {request_id} 的session_id不匹配"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
