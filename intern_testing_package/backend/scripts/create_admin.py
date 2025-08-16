#!/usr/bin/env python3
"""
创建管理员用户脚本

使用方法：
    python create_admin.py <username> <password>
"""

import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.utils.security import get_password_hash
from app.config import settings

def create_admin_user(username, password, role='admin'):
    """创建管理员或开发者用户"""
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 创建会话
    db = SessionLocal()
    try:
        # 检查用户是否已存在
        user = db.query(User).filter(User.username == username).first()
        
        if user:
            print(f"用户 '{username}' 已存在，ID: {user.id}")
            # 更新密码和角色
            user.password_hash = get_password_hash(password)
            user.role = role
            user.is_superuser = 1 if role == 'admin' else 0
            db.commit()
            print(f"已更新用户 '{username}' 的密码和角色为 '{role}'")
            return user.id
            
        # 创建新用户
        hashed_password = get_password_hash(password)
        user = User(
            username=username,
            password_hash=hashed_password,
            role=role,  # 设置用户角色
            is_active=1,
            is_superuser=1 if role == 'admin' else 0
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"已创建管理员用户 '{username}'，ID: {user.id}")
        return user.id
    finally:
        db.close()

if __name__ == "__main__":
    # 检查命令行参数
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("使用方法: python create_admin.py <username> <password> [role]")
        print("角色可选: admin, developer, user (默认: admin)")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    role = sys.argv[3] if len(sys.argv) == 4 else 'admin'
    
    # 验证输入
    if len(username) < 3:
        print("错误: 用户名长度必须至少为3个字符")
        sys.exit(1)
        
    if len(password) < 6:
        print("错误: 密码长度必须至少为6个字符")
        sys.exit(1)
        
    # 验证角色
    if role not in ['admin', 'developer', 'user']:
        print("错误: 角色必须是 admin, developer 或 user")
        sys.exit(1)
    
    # 创建用户
    try:
        user_id = create_admin_user(username, password, role)
        print(f"操作成功完成，用户ID: {user_id}，角色: {role}")
    except Exception as e:
        print(f"创建用户时出错: {str(e)}")
        sys.exit(1)