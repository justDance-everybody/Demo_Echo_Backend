"""
测试用例 10: 异常情况处理

测试目标: 验证系统错误处理机制的有效性
"""

import pytest


class TestErrorHandling:
    """测试用例10: 异常情况处理测试"""

    def test_10_1_invalid_token(self, test_client):
        """10.1 测试无效token"""
        headers = {"Authorization": "Bearer invalid_token_123"}

        response = test_client.get("/tools", headers=headers) # APIClient会添加/api/v1前缀

        # 调试输出
        print(f"📋 10.1 无效token测试:")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 收集验收标准检查结果
        errors = []

        # 验收标准1: 返回状态码 401
        if response.status_code == 401:
            errors.append("✅ 返回状态码 401")
        else:
            errors.append(f"❌ 返回状态码 401，实际为 {response.status_code}")

        # 验收标准2: 错误信息清晰明确
        if response.status_code in [401, 403]:
            try:
                data = response.json()
                error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
                if error_message and len(error_message) > 0:
                    errors.append(f"✅ 错误信息清晰明确: {error_message}")
                else:
                    errors.append("❌ 错误信息清晰明确，实际为空或缺失")
            except:
                errors.append("❌ 错误信息清晰明确，响应不是有效JSON")
        else:
            errors.append("❌ 错误信息清晰明确，状态码不正确无法检查")

        # 显示检查结果
        print(f"📋 验收标准检查结果:")
        for error in errors:
            print(f"   {error}")

        # 如果有失败的检查，抛出错误
        failed_checks = [error for error in errors if error.startswith("❌")]
        if failed_checks:
            all_results = "\n   ".join(errors)
            assert False, f"测试10.1验收标准未满足:\n   {all_results}"

    def test_10_2_missing_required_parameters(self, test_client, auth_tokens):
        """10.2 测试缺失必要参数"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.post(
            "/intent/interpret", # APIClient会添加/api/v1前缀
            headers=headers,
            json={
                "session_id": "error-test-001"
                # 缺少query和user_id
            }
        )

        # 调试输出
        print(f"📋 10.2 缺失必要参数测试:")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 收集验收标准检查结果
        errors = []

        # 验收标准1: 返回状态码 422 (Validation Error)
        if response.status_code == 422:
            errors.append("✅ 返回状态码 422 (Validation Error)")
        else:
            errors.append(f"❌ 返回状态码 422 (Validation Error)，实际为 {response.status_code}")

        # 验收标准2: 错误信息指出缺失的字段
        if response.status_code == 422:
            try:
                data = response.json()
                detail = data.get("detail", [])
                if isinstance(detail, list) and len(detail) > 0:
                    # 检查是否包含字段缺失的错误
                    field_errors = []
                    for err in detail:
                        if isinstance(err, dict):
                            field_name = err.get("loc", [])
                            error_type = err.get("type", "")
                            if "missing" in error_type or len(field_name) > 0:
                                field_errors.append(f"{field_name}: {error_type}")

                    if field_errors:
                        errors.append(f"✅ 错误信息指出缺失的字段: {', '.join(field_errors)}")
                    else:
                        errors.append(f"❌ 错误信息指出缺失的字段，但未找到字段错误信息: {detail}")
                else:
                    errors.append(f"❌ 错误信息指出缺失的字段，detail为空: {detail}")
            except Exception as e:
                errors.append(f"❌ 错误信息指出缺失的字段，解析响应失败: {e}")
        else:
            errors.append("❌ 错误信息指出缺失的字段，状态码不正确无法检查")

        # 显示检查结果
        print(f"📋 验收标准检查结果:")
        for error in errors:
            print(f"   {error}")

        # 如果有失败的检查，抛出错误
        failed_checks = [error for error in errors if error.startswith("❌")]
        if failed_checks:
            all_results = "\n   ".join(errors)
            assert False, f"测试10.2验收标准未满足:\n   {all_results}"

    def test_10_3_nonexistent_tool(self, test_client, auth_tokens):
        """10.3 测试不存在的工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.post(
            "/execute", # APIClient会添加/api/v1前缀
            headers=headers,
            json={
                "session_id": "error-test-002",
                "user_id": 13,
                "tool_id": "non_existent_tool",
                "params": {}
            }
        )

        # 调试输出
        print(f"📋 10.3 不存在的工具测试:")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 收集验收标准检查结果
        errors = []

        # 验收标准1: 返回适当的错误状态码
        if response.status_code in [400, 404, 422]:
            errors.append(f"✅ 返回适当的错误状态码: {response.status_code}")
        else:
            errors.append(f"❌ 返回适当的错误状态码 (400/404/422)，实际为 {response.status_code}")

        # 验收标准2: 错误信息说明工具不存在
        if response.status_code != 500:  # 避免服务器错误影响判断
            try:
                data = response.json()
                error_message = data.get("detail", "") or data.get("error", "") or data.get("message", "")
                if error_message and len(error_message) > 0:
                    # 检查错误信息是否提到工具不存在
                    tool_related_keywords = ["tool", "工具", "not found", "不存在", "non_existent_tool"]
                    has_tool_info = any(keyword in str(error_message).lower() for keyword in tool_related_keywords)
                    if has_tool_info:
                        errors.append(f"✅ 错误信息说明工具不存在: {error_message}")
                    else:
                        errors.append(f"❌ 错误信息说明工具不存在，但信息不够明确: {error_message}")
                else:
                    errors.append("❌ 错误信息说明工具不存在，实际为空或缺失")
            except Exception as e:
                errors.append(f"❌ 错误信息说明工具不存在，解析响应失败: {e}")
        else:
            errors.append("❌ 错误信息说明工具不存在，服务器错误无法检查")

        # 显示检查结果
        print(f"📋 验收标准检查结果:")
        for error in errors:
            print(f"   {error}")

        # 如果有失败的检查，抛出错误
        failed_checks = [error for error in errors if error.startswith("❌")]
        if failed_checks:
            all_results = "\n   ".join(errors)
            assert False, f"测试10.3验收标准未满足:\n   {all_results}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
