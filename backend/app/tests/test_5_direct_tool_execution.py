"""
测试用例 5: 直接工具执行测试

测试目标: 验证系统能够直接执行各种类型的工具
"""

import pytest
import uuid
from .conftest import generate_session_id


class TestDirectToolExecution:
    """测试用例5: 直接工具执行测试"""

    def test_5_1_translate_tool_execution(self, test_client, auth_tokens):
        """5.1 测试高德地图天气查询工具执行"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        response = test_client.post(
            "/execute", # APIClient会添加/api/v1前缀
            headers=headers,
            json={
                "session_id": "test-weather-001",
                "user_id": 13,
                "tool_id": "maps_weather",  # 使用高德地图天气查询工具
                "params": {
                    "city": "北京"
                }
            }
        )

        # 调试输出
        print(f"📋 5.1 高德地图天气查询工具执行测试:")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 验收标准检查
        assert response.status_code == 200, f"工具执行应该成功，状态码应为200，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
            assert data["session_id"] == "test-weather-001", f"session_id应匹配，实际为{data['session_id']}"

            # 检查天气查询结果
            if "data" in data and "tts_message" in data["data"]:
                print(f"✅ 天气查询成功，返回消息: {data['data']['tts_message']}")
            else:
                print(f"⚠️  天气查询返回格式: {data}")

        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_2_ai_generation_tools(self, test_client, auth_tokens):
        """5.2 测试AI生成工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试文本转图像工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-ai-gen-001",
                "user_id": 13,
                "tool_id": "text_to_image",
                "params": {
                    "prompt": "A beautiful sunset over mountains",
                    "style": "realistic"
                }
            }
        )

        print(f"📋 5.2 AI生成工具测试 (text_to_image):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"AI生成工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_3_maps_tools(self, test_client, auth_tokens):
        """5.3 测试地图相关工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试天气查询工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-maps-001",
                "user_id": 13,
                "tool_id": "maps_weather",
                "params": {
                    "city": "北京"
                }
            }
        )

        print(f"📋 5.3 地图工具测试 (maps_weather):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"地图工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_4_audio_tools(self, test_client, auth_tokens):
        """5.4 测试音频相关工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试音频播放工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-audio-001",
                "user_id": 13,
                "tool_id": "play_audio",
                "params": {
                    "file_path": "/tmp/test_audio.wav"
                }
            }
        )

        print(f"📋 5.4 音频工具测试 (play_audio):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"音频工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_5_video_tools(self, test_client, auth_tokens):
        """5.5 测试视频相关工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试视频生成工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-video-001",
                "user_id": 13,
                "tool_id": "generate_video",
                "params": {
                    "prompt": "A cat playing with a ball",
                    "duration": 5
                }
            }
        )

        print(f"📋 5.5 视频工具测试 (generate_video):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"视频工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_6_music_tools(self, test_client, auth_tokens):
        """5.6 测试音乐生成工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试音乐生成工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-music-001",
                "user_id": 13,
                "tool_id": "music_generation",
                "params": {
                    "prompt": "A peaceful piano melody",
                    "style": "classical"
                }
            }
        )

        print(f"📋 5.6 音乐工具测试 (music_generation):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"音乐工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_7_search_tools(self, test_client, auth_tokens):
        """5.7 测试搜索相关工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试文本搜索工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-search-001",
                "user_id": 13,
                "tool_id": "maps_text_search",
                "params": {
                    "keywords": "咖啡厅",
                    "city": "北京"
                }
            }
        )

        print(f"📋 5.7 搜索工具测试 (maps_text_search):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"搜索工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_8_direction_tools(self, test_client, auth_tokens):
        """5.8 测试路径规划工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试步行路径规划工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-direction-001",
                "user_id": 13,
                "tool_id": "maps_direction_walking",
                "params": {
                    "origin": "116.397128,39.916527",  # 天安门
                    "destination": "116.397428,39.916527"  # 附近点
                }
            }
        )

        print(f"📋 5.8 路径规划工具测试 (maps_direction_walking):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"路径规划工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"

    def test_5_9_utility_tools(self, test_client, auth_tokens):
        """5.9 测试实用工具"""
        token = auth_tokens["user"]
        headers = {"Authorization": f"Bearer {token}"}

        # 测试IP定位工具
        response = test_client.post(
            "/execute",
            headers=headers,
            json={
                "session_id": "test-utility-001",
                "user_id": 13,
                "tool_id": "maps_ip_location",
                "params": {
                    "ip": "8.8.8.8"
                }
            }
        )

        print(f"📋 5.9 实用工具测试 (maps_ip_location):")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应内容: {response.text}")

        # 检查响应
        assert response.status_code in [200, 201], f"实用工具执行状态码应为200或201，实际为{response.status_code}"

        try:
            data = response.json()
            assert "data" in data, "响应应包含data字段"
            assert "session_id" in data, "响应应包含session_id字段"
        except Exception as e:
            assert False, f"响应解析失败: {e}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
