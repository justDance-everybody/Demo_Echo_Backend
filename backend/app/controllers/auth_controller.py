from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import AuthService
from app.utils.db import get_async_db_session
from app.models.user import User
from app.utils.security import get_current_user

class AuthController:
    """用户认证控制器"""
    
    @staticmethod
    async def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_async_db_session)
    ) -> Token:
        """
        用户登录并获取访问令牌
        
        Args:
            form_data: OAuth2表单数据（包含用户名和密码）
            db: 数据库会话
            
        Returns:
            Token: 包含访问令牌和令牌类型的响应
            
        Raises:
            HTTPException: 如果登录凭据无效
        """
        user = await AuthService.authenticate_user(db, form_data.username, form_data.password)
        
        if not user:
            logger.warning(f"登录失败: 用户名 '{form_data.username}' 或密码无效")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码不正确",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        logger.info(f"用户 '{user.username}' 登录成功")
        token_data = AuthService.create_user_token(user)
        return Token(**token_data)
    
    @staticmethod
    async def register(
        user_data: UserCreate,
        db: AsyncSession = Depends(get_async_db_session)
    ) -> UserResponse:
        """
        注册新用户
        
        Args:
            user_data: 用户创建数据
            db: 数据库会话
            
        Returns:
            UserResponse: 用户信息响应
            
        Raises:
            HTTPException: 如果用户名已存在
        """
        user, is_new = await AuthService.register_user(
            db, user_data.username, user_data.password
        )
        
        if not is_new:
            logger.warning(f"用户注册失败: 用户名 '{user_data.username}' 已存在")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="用户名已存在",
            )
            
        logger.info(f"新用户 '{user.username}' 注册成功")
        return UserResponse(id=user.id, username=user.username)
    
    @staticmethod
    async def get_current_user_info(
        current_user: User = Depends(get_current_user)
    ) -> UserResponse:
        """
        获取当前登录用户的信息
        
        Args:
            current_user: 当前登录的用户对象
            
        Returns:
            UserResponse: 用户信息响应
        """
        return UserResponse(id=current_user.id, username=current_user.username)