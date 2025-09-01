#!/usr/bin/env python3
"""
创建测试用户脚本
"""

import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.utils.security import get_password_hash
from app.config import settings

def create_test_user():
    """创建测试用户"""
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 创建会话
    db = SessionLocal()
    try:
        # 检查用户是否已存在
        user = db.query(User).filter(User.username == "testuser").first()
        
        if user:
            print(f"用户 'testuser' 已存在，ID: {user.id}")
            return user.id
            
        # 创建新用户
        hashed_password = get_password_hash("testpass123")
        user = User(
            username="testuser",
            password_hash=hashed_password,
            role="user",
            is_active=1,
            is_superuser=0
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"已创建测试用户 'testuser'，ID: {user.id}")
        return user.id
    except Exception as e:
        print(f"创建用户时出错: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    try:
        user_id = create_test_user()
        print(f"操作成功完成，用户ID: {user_id}")
    except Exception as e:
        print(f"创建用户时出错: {str(e)}")
        sys.exit(1)
