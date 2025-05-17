from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from typing import Optional, Dict, Any
from datetime import timedelta
from pydantic import BaseModel

from app.utils.db import get_async_db_session
from app.utils.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user
)
from app.models.user import User
from app.config import settings

# 创建路由器
router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"description": "未授权"}},
)

# 请求响应模型
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    
class UserLogin(BaseModel):
    username: str
    password: str
    
class TokenData(BaseModel):
    user_id: int
    username: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    role: Optional[str] = None
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_id: int
    username: str
    role: Optional[str] = None
    
# 用户注册
@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    注册新用户
    
    Args:
        user_data: 用户创建请求
        db: 数据库会话
        
    Returns:
        新创建的用户信息
        
    Raises:
        HTTPException: 如果用户名已存在
    """
    # 检查用户是否已存在
    result = await db.execute(select(User).where(User.username == user_data.username))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已存在"
        )
        
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        password_hash=hashed_password,
        email=user_data.email
    )
    
    try:
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            role=new_user.role
        )
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户创建失败，可能用户名已存在"
        )

# 用户登录获取token
@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    用户登录获取访问令牌
    
    Args:
        form_data: 表单数据，包含用户名和密码
        db: 数据库会话
        
    Returns:
        访问令牌和相关信息
        
    Raises:
        HTTPException: 如果用户名或密码错误
    """
    # 查询用户
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    # 验证用户名和密码
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.JWT_EXPIRATION)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION * 60,  # 转换为秒
        user_id=user.id,
        username=user.username,
        role=user.role
    )

# 获取当前用户
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息
    
    Args:
        current_user: 当前用户，通过依赖项注入
        
    Returns:
        当前用户信息
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role
    ) 