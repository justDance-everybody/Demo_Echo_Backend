"""
Pytest配置文件 - 设置测试环境和通用fixture
"""
import pytest
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt
from datetime import datetime, timedelta

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.main import app
from app.models.user import User
from app.utils.db import Base, get_async_db_session
from app.config import settings

# 测试配置
@pytest.fixture(scope="session")
def test_config():
    """测试环境配置"""
    return {
        "api_base_url": "http://localhost:3000",
        "api_prefix": "/api/v1",
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

# 创建内存数据库用于测试
@pytest.fixture(scope="session")
def test_database():
    """创建测试数据库"""
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # 创建测试数据库表
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    return engine, TestingSessionLocal

@pytest.fixture
def db_session(test_database):
    """数据库会话fixture"""
    engine, TestingSessionLocal = test_database
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def test_client(test_database):
    """测试客户端fixture"""
    engine, TestingSessionLocal = test_database

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    # 使用测试数据库替换依赖
    app.dependency_overrides[get_async_db_session] = override_get_db

    with TestClient(app) as client:
        yield client

    # 清理依赖覆盖
    app.dependency_overrides.clear()

@pytest.fixture
def test_users(db_session):
    """创建测试用户"""
    users = {}

    # 创建普通用户
    user = User(
        username="testuser_5090",
        password_hash="hashed_password_123",  # 实际测试中会使用真实密码
        role="user",
        email="testuser@example.com"
    )
    db_session.add(user)

    # 创建开发者用户
    dev_user = User(
        username="devuser_5090",
        password_hash="hashed_password_456",
        role="developer",
        email="devuser@example.com"
    )
    db_session.add(dev_user)

    # 创建管理员用户
    admin_user = User(
        username="adminuser_5090",
        password_hash="hashed_password_789",
        role="admin",
        email="adminuser@example.com"
    )
    db_session.add(admin_user)

    db_session.commit()

    # 刷新获取ID
    for u in [user, dev_user, admin_user]:
        db_session.refresh(u)
        users[u.role] = u

    yield users

    # 清理测试数据
    for u in users.values():
        db_session.delete(u)
    db_session.commit()

@pytest.fixture
def auth_tokens(test_client, test_users):
    """获取认证token"""
    tokens = {}

    # 注意：这里使用模拟的token，实际测试中需要真实的认证流程
    for role, user in test_users.items():
        # 创建测试JWT token
        payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        tokens[role] = token

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
