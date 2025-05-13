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

def create_admin_user(username, password):
    """创建管理员用户"""
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
            # 更新密码
            user.password_hash = get_password_hash(password)
            db.commit()
            print(f"已更新用户 '{username}' 的密码")
            return user.id
            
        # 创建新用户
        hashed_password = get_password_hash(password)
        user = User(
            username=username,
            password_hash=hashed_password,
            # 这里可以添加额外的管理员权限字段
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
    if len(sys.argv) != 3:
        print("使用方法: python create_admin.py <username> <password>")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    # 验证输入
    if len(username) < 3:
        print("错误: 用户名长度必须至少为3个字符")
        sys.exit(1)
        
    if len(password) < 6:
        print("错误: 密码长度必须至少为6个字符")
        sys.exit(1)
        
    # 创建管理员用户
    try:
        user_id = create_admin_user(username, password)
        print(f"操作成功完成，用户ID: {user_id}")
    except Exception as e:
        print(f"创建管理员用户时出错: {str(e)}")
        sys.exit(1) 