from sqlalchemy import Column, BigInteger, String, JSON, DateTime
from sqlalchemy.sql import func
from app.utils.db import Base

class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False)
    contacts = Column(JSON, default=lambda: [])  # 联系人列表
    wallets = Column(JSON, default=lambda: [])   # 钱包信息
    created_at = Column(DateTime, server_default=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>" 