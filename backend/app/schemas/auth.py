from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class Token(BaseModel):
    """访问令牌模型"""
    access_token: str
    token_type: str = "bearer"
    
class TokenData(BaseModel):
    """令牌数据模型"""
    user_id: int
    username: str
    
class UserCreate(BaseModel):
    """用户创建模型"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    
class UserLogin(BaseModel):
    """用户登录模型"""
    username: str
    password: str
    
class UserResponse(BaseModel):
    """用户信息响应模型"""
    id: int
    username: str
    
    class Config:
        from_attributes = True 