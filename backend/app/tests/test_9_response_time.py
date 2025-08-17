"""
测试用例 9: 响应时间测试

测试目标: 验证系统响应时间符合PRD要求
"""

import pytest
import time
import statistics


class TestResponseTimeRequirements:
    """测试用例9: 响应时间要求测试"""

    def test_9_1_intent_interpretation_response_time(self, test_client, auth_tokens):
        """9.1 测试意图解析响应时间"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试查询
        query = "今天天气如何"
        session_id = "perf-test-001"

        # 进行多次测试取平均值，确保结果稳定
        response_times = []
        success_count = 0
        test_count = 5  # 进行5次测试

        for i in range(test_count):
            start_time = time.time()
            response = test_client.post(
                "/intent/interpret", # APIClient会添加/api/v1前缀
                headers=headers,
                json={
                    "query": query,
                    "session_id": f"{session_id}-{i}",
                    "user_id": 13
                }
            )
            end_time = time.time()

            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            response_times.append(response_time)

            # 调试输出
            print(f"📋 测试 {i+1}: 响应时间 {response_time:.2f}ms, 状态码 {response.status_code}")

            if response.status_code == 200:
                success_count += 1
                # 验证响应结构
                data = response.json()
                assert "session_id" in data, "响应中缺少session_id字段"
                assert "type" in data, "响应中缺少type字段"
                assert "content" in data, "响应中缺少content字段"

        # 验证成功率
        success_rate = success_count / test_count
        assert success_rate >= 0.8, f"意图解析成功率应该≥80%，实际为{success_rate:.2%}"

        # 验证响应时间要求
        if response_times:
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)

            print(f"📋 响应时间统计:")
            print(f"   - 平均响应时间: {avg_response_time:.2f}ms")
            print(f"   - 最大响应时间: {max_response_time:.2f}ms")
            print(f"   - 最小响应时间: {min_response_time:.2f}ms")

                        # 收集所有PRD验收标准的检查结果
            errors = []

            # 验收标准1: 意图解析时间 ≤ 200ms (PRD要求)
            if avg_response_time > 200:
                errors.append(f"❌ 意图解析时间 ≤ 200ms (PRD要求)，实际为{avg_response_time:.2f}ms，超出{avg_response_time-200:.2f}ms ({(avg_response_time/200):.1f}倍)")
            else:
                errors.append(f"✅ 意图解析时间 ≤ 200ms (PRD要求)，实际为{avg_response_time:.2f}ms")

            # 验收标准2: 工具执行时间 ≤ 300ms (PRD要求)
            if max_response_time > 300:
                errors.append(f"❌ 工具执行时间 ≤ 300ms (PRD要求)，实际最大为{max_response_time:.2f}ms，超出{max_response_time-300:.2f}ms ({(max_response_time/300):.1f}倍)")
            else:
                errors.append(f"✅ 工具执行时间 ≤ 300ms (PRD要求)，实际最大为{max_response_time:.2f}ms")

            # 验收标准3: 端到端总时间 ≤ 500ms (PRD要求)
            if avg_response_time > 500:
                errors.append(f"❌ 端到端总时间 ≤ 500ms (PRD要求)，实际平均为{avg_response_time:.2f}ms，超出{avg_response_time-500:.2f}ms ({(avg_response_time/500):.1f}倍)")
            else:
                errors.append(f"✅ 端到端总时间 ≤ 500ms (PRD要求)，实际平均为{avg_response_time:.2f}ms")

            # 显示所有检查结果
            print(f"📋 PRD验收标准检查结果:")
            for error in errors:
                print(f"   {error}")

            # 如果有任何失败的标准，抛出包含所有信息的错误
            failed_checks = [error for error in errors if error.startswith("❌")]
            if failed_checks:
                all_results = "\n   ".join(errors)
                assert False, f"PRD响应时间要求未满足:\n   {all_results}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
