import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.models.user import User
from app.utils.security import get_password_hash
from app.config import settings

# 测试客户端
client = TestClient(app)

# 测试用户信息
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpassword"

# 预置测试用户
def setup_test_user():
    """创建一个测试用户"""
    from sqlalchemy.orm import Session
    from app.utils.db import Base
    
    # 创建测试数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 创建测试用户
    with SessionLocal() as db:
        # 检查测试用户是否已存在
        user = db.query(User).filter(User.username == TEST_USERNAME).first()
        
        if not user:
            # 创建测试用户
            hashed_password = get_password_hash(TEST_PASSWORD)
            user = User(username=TEST_USERNAME, password_hash=hashed_password)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user.id

def test_register_user():
    """测试用户注册"""
    # 创建随机用户名，避免冲突
    import random
    random_username = f"testuser_{random.randint(1000, 9999)}"
    
    # 发送注册请求
    response = client.post(
        f"{settings.API_PREFIX}/auth/register",
        json={"username": random_username, "password": "testpassword"}
    )
    
    # 验证响应
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["username"] == random_username

def test_login_user():
    """测试用户登录"""
    # 确保测试用户存在
    user_id = setup_test_user()
    
    # 发送登录请求
    response = client.post(
        f"{settings.API_PREFIX}/auth/token",
        data={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # 存储访问令牌供后续测试使用
    return data["access_token"]

def test_get_current_user():
    """测试获取当前用户信息"""
    # 获取有效令牌
    access_token = test_login_user()
    
    # 发送获取用户信息请求
    response = client.get(
        f"{settings.API_PREFIX}/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    # 验证响应
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == TEST_USERNAME

def test_protected_route_with_token():
    """测试带令牌访问受保护路由"""
    # 获取有效令牌
    access_token = test_login_user()
    
    # 测试访问 /api/v1/tools
    response = client.get(
        f"{settings.API_PREFIX}/tools",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    # 验证响应
    assert response.status_code == 200

def test_protected_route_without_token():
    """测试不带令牌访问受保护路由"""
    # 测试访问 /api/v1/tools 而不提供令牌
    response = client.get(f"{settings.API_PREFIX}/tools")
    
    # 验证响应 - 应该是401未授权
    assert response.status_code == 401

# 运行测试的主函数
if __name__ == "__main__":
    # 创建测试用户
    user_id = setup_test_user()
    print(f"Created test user with ID: {user_id}")
    
    # 测试登录并获取令牌
    access_token = test_login_user()
    print(f"Got access token: {access_token}")
    
    # 测试获取用户信息
    test_get_current_user()
    print("Successfully retrieved user info")
    
    # 测试受保护路由
    test_protected_route_with_token()
    print("Successfully accessed protected route with token")
    
    test_protected_route_without_token()
    print("Correctly denied access to protected route without token") 