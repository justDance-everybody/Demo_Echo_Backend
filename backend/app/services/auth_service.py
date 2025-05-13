from typing import Optional, Tuple, Dict, Any
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from loguru import logger

from app.models.user import User
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.config import settings

class AuthService:
    @staticmethod
    async def authenticate_user(
        db: AsyncSession, username: str, password: str
    ) -> Optional[User]:
        """
        验证用户凭据
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 密码
            
        Returns:
            如果验证成功，则返回用户对象，否则返回None
        """
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return None
            
        if not verify_password(password, user.password_hash):
            return None
            
        return user
    
    @staticmethod
    async def register_user(
        db: AsyncSession, username: str, password: str
    ) -> Tuple[User, bool]:
        """
        注册新用户
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 密码
            
        Returns:
            元组 (用户对象, 是否为新用户)
        """
        # 检查用户是否已存在
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return existing_user, False
            
        # 创建新用户
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            password_hash=hashed_password
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"新用户注册成功: {username}")
        return new_user, True
    
    @staticmethod
    def create_user_token(user: User) -> Dict[str, Any]:
        """
        为用户创建访问令牌
        
        Args:
            user: 用户对象
            
        Returns:
            包含访问令牌和令牌类型的字典
        """
        access_token_expires = timedelta(minutes=settings.JWT_EXPIRATION)
        
        # 创建令牌数据
        token_data = {
            "sub": str(user.id),
            "username": user.username
        }
        
        # 使用令牌数据创建JWT令牌
        access_token = create_access_token(
            data=token_data, 
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"} 