from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.utils.db import get_db, get_async_db_session

# 定义身份验证相关的异常和依赖项
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

# 使用bcrypt算法处理密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 用户令牌数据模型
class TokenData(BaseModel):
    user_id: int
    username: str
    
# 创建一个用户模型的Pydantic表示以提高类型安全性
class UserInDB(BaseModel):
    id: int
    username: str
    password_hash: str

# 验证密码函数
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码是否匹配哈希值"""
    return pwd_context.verify(plain_password, hashed_password)

# 生成密码哈希函数
def get_password_hash(password: str) -> str:
    """生成密码的哈希值"""
    return pwd_context.hash(password)

# 创建访问令牌
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌
    
    Args:
        data: 需要编码到令牌中的数据
        expires_delta: 可选的令牌过期时间
        
    Returns:
        编码后的JWT令牌
    """
    to_encode = data.copy()
    # 设置令牌过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# 获取当前用户
async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_async_db_session)
) -> User:
    """
    验证JWT令牌并获取当前用户
    
    Args:
        token: JWT令牌
        db: 数据库会话
        
    Returns:
        当前登录的用户对象
        
    Raises:
        HTTPException: 如果令牌无效或用户不存在
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 解码JWT令牌
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id, username=payload.get("username", ""))
    except JWTError:
        raise credentials_exception
        
    # 从数据库获取用户
    from sqlalchemy.future import select
    stmt = select(User).where(User.id == token_data.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user

# 获取当前活跃用户（可选验证）
async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    检查当前用户是否处于活跃状态
    
    此函数可扩展以检查用户是否已禁用、锁定等状态
    
    Args:
        current_user: 当前登录的用户对象
        
    Returns:
        验证为活跃状态的用户对象
        
    Raises:
        HTTPException: 如果用户被禁用或处于非活跃状态
    """
    # 这里可以添加额外的验证逻辑，例如检查用户是否被禁用
    # if user.disabled:
    #     raise HTTPException(status_code=400, detail="用户已禁用")
    return current_user

# 获取管理员用户
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    验证当前用户是否为管理员
    
    Args:
        current_user: 当前登录的用户对象
        
    Returns:
        验证为管理员的用户对象
        
    Raises:
        HTTPException: 如果用户不是管理员
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限才能访问此资源"
        )
    return current_user