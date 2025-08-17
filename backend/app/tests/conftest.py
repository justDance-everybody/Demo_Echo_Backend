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

@pytest.fixture(scope="session")
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

@pytest.fixture(scope="session")
def test_client(api_client):
    """兼容原有测试代码的客户端"""
    return api_client

@pytest.fixture(scope="session")
def test_users(test_config):
    """测试用户配置 - 使用真实后端的用户"""
    return test_config["test_users"]

@pytest.fixture(scope="session")
def auth_tokens(api_client, test_users):
    """确保用户存在并获取真实的认证token"""
    import pymysql
    from app.utils.security import get_password_hash

    # 首先确保用户在数据库中存在且角色正确
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='password',
        database='echo_db',
        charset='utf8mb4'
    )

    try:
        with connection.cursor() as cursor:
            for role, user_info in test_users.items():
                username = user_info["username"]
                password = user_info["password"]
                email = f"{username}@test.com"
                hashed_password = get_password_hash(password)

                # 先检查用户是否存在
                cursor.execute("SELECT id, role FROM users WHERE username = %s", (username,))
                existing_user = cursor.fetchone()

                if existing_user:
                    user_id, current_role = existing_user
                    if current_role != role:
                        # 更新角色
                        cursor.execute("UPDATE users SET role = %s WHERE username = %s", (role, username))
                        connection.commit()
                        print(f"✅ {role} 用户已存在，角色已更新: {username}")
                    else:
                        print(f"ℹ️  {role} 用户已存在，角色正确: {username}")
                else:
                    # 创建新用户
                    cursor.execute("""
                        INSERT INTO users (username, password_hash, email, role, is_active, is_superuser, created_at)
                        VALUES (%s, %s, %s, %s, 1, 0, NOW())
                    """, (username, hashed_password, email, role))
                    connection.commit()
                    print(f"✅ {role} 用户创建成功: {username}")

            # 验证创建的用户
            cursor.execute("SELECT username, role FROM users WHERE username IN %s",
                         (tuple(user_info["username"] for user_info in test_users.values()),))
            users = cursor.fetchall()
            print("📋 当前测试用户状态:")
            for username, role in users:
                print(f"   - {username}: {role}")

    except Exception as e:
        print(f"⚠️  用户创建过程异常: {e}")
        connection.rollback()
    finally:
        connection.close()

    # 现在尝试登录获取token
    tokens = {}
    for role, user_info in test_users.items():
        try:
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
                print(f"✅ {role} 用户登录成功，角色: {data.get('role', 'unknown')}")
            else:
                print(f"⚠️  {role} 用户登录失败 (状态码: {response.status_code})")
                print(f"   响应内容: {response.text}")
        except Exception as e:
            print(f"⚠️  {role} 用户认证异常: {e}")

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
