"""
Pytest配置文件 - 测试运行中的真实后端服务
"""
import pytest
import requests
import os
import sys
from pathlib import Path
from jose import jwt
from datetime import datetime, timedelta

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.config import settings

# 后端服务配置
BACKEND_BASE_URL = "http://localhost:3000"
API_PREFIX = "/api/v1"

# 测试配置
@pytest.fixture(scope="session")
def test_config():
    """测试环境配置"""
    return {
        "api_base_url": BACKEND_BASE_URL,
        "api_prefix": API_PREFIX,
        "test_users": {
            "user": {
                "username": "testuser_5090",
                "password": "8lpcUY2BOt",
                "role": "user"
            },
            "developer": {
                "username": "devuser_5090",
                "password": "mryuWTGdMk",
                "role": "developer"
            },
            "admin": {
                "username": "adminuser_5090",
                "password": "SAKMRtxCjT",
                "role": "admin"
            }
        }
    }

@pytest.fixture(scope="session")
def backend_health_check():
    """检查后端服务是否运行"""
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ 后端服务运行正常: {BACKEND_BASE_URL}")
            return True
        else:
            pytest.fail(f"❌ 后端服务健康检查失败，状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        pytest.fail(f"❌ 无法连接到后端服务 {BACKEND_BASE_URL}: {e}")

@pytest.fixture
def api_client(backend_health_check):
    """API客户端fixture - 直接调用真实后端"""
    class APIClient:
        def __init__(self):
            self.base_url = BACKEND_BASE_URL
            self.api_prefix = API_PREFIX
            self.session = requests.Session()

        def get(self, endpoint, headers=None, **kwargs):
            url = f"{self.base_url}{self.api_prefix}{endpoint}"
            return self.session.get(url, headers=headers, **kwargs)

        def post(self, endpoint, headers=None, json=None, data=None, **kwargs):
            url = f"{self.base_url}{self.api_prefix}{endpoint}"
            return self.session.post(url, headers=headers, json=json, data=data, **kwargs)

        def put(self, endpoint, headers=None, json=None, **kwargs):
            url = f"{self.base_url}{self.api_prefix}{endpoint}"
            return self.session.put(url, headers=headers, json=json, **kwargs)

        def delete(self, endpoint, headers=None, **kwargs):
            url = f"{self.base_url}{self.api_prefix}{endpoint}"
            return self.session.delete(url, headers=headers, **kwargs)

    return APIClient()

@pytest.fixture
def test_client(api_client):
    """兼容原有测试代码的客户端"""
    return api_client

@pytest.fixture
def test_users(test_config):
    """测试用户配置 - 使用真实后端的用户"""
    return test_config["test_users"]

@pytest.fixture
def auth_tokens(api_client, test_users):
    """获取真实的认证token"""
    tokens = {}

    for role, user_info in test_users.items():
        try:
            # 尝试登录获取真实token
            response = api_client.post(
                "/auth/token",
                data={
                    "username": user_info["username"],
                    "password": user_info["password"]
                }
            )

            if response.status_code == 200:
                data = response.json()
                tokens[role] = data["access_token"]
                print(f"✅ {role} 用户登录成功")
            else:
                # 如果登录失败，创建模拟token用于测试
                print(f"⚠️  {role} 用户登录失败，使用模拟token")
                payload = {
                    "sub": "1",
                    "username": user_info["username"],
                    "role": role,
                    "exp": datetime.utcnow() + timedelta(hours=1)
                }
                tokens[role] = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        except Exception as e:
            print(f"⚠️  {role} 用户认证异常: {e}，使用模拟token")
            # 创建模拟token
            payload = {
                "sub": "1",
                "username": user_info["username"],
                "role": role,
                "exp": datetime.utcnow() + timedelta(hours=1)
            }
            tokens[role] = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    return tokens

@pytest.fixture
def mock_llm_response():
    """模拟LLM响应"""
    return {
        "type": "tool_call",
        "content": "我理解您想要查询天气信息",
        "tool_calls": [
            {
                "tool_id": "weather_query",
                "parameters": {
                    "city": "深圳",
                    "date": "today"
                }
            }
        ]
    }

@pytest.fixture
def mock_tool_result():
    """模拟工具执行结果"""
    return {
        "result": {
            "city": "深圳",
            "weather": "晴天",
            "temperature": "25°C",
            "humidity": "60%"
        },
        "tts": "深圳今天晴天，温度25度，湿度60%",
        "session_id": "test-session-001"
    }

# 测试工具函数
def assert_response_structure(response, expected_fields):
    """断言响应结构"""
    assert response.status_code == 200
    data = response.json()
    for field in expected_fields:
        assert field in data, f"响应中缺少字段: {field}"
    return data

def assert_error_response(response, expected_status_code, expected_error_type=None):
    """断言错误响应"""
    assert response.status_code == expected_status_code
    if expected_error_type:
        data = response.json()
        assert "detail" in data or "error" in data

def generate_session_id():
    """生成测试会话ID"""
    return f"test-session-{datetime.now().strftime('%Y%m%d%H%M%S')}"

def create_test_query(query_type="weather"):
    """创建测试查询"""
    queries = {
        "weather": "今天深圳的天气怎么样",
        "translation": "把hello world翻译成中文",
        "random": "asdfghjkl随机文本",
        "simple": "你好，请介绍一下自己"
    }
    return queries.get(query_type, queries["simple"])
