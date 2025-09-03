from sqlalchemy import Column, String, BigInteger, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.utils.db import Base, SessionLocal
import uuid
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

class Session(Base):
    """会话模型"""
    __tablename__ = "sessions"
    
    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    status = Column(
        Enum(
            'interpreting',  # 解析意图中
            'waiting_confirm',  # 等待用户确认
            'executing',  # 执行中
            'confirmed',  # 已确认
            'completed',  # 已完成
            'cancelled',  # 已取消
            'error',  # 出错
            name='session_status'
        ),
        nullable=False,
        default='interpreting'
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", backref="sessions")
    
    def __repr__(self):
        return f"<Session(session_id={self.session_id}, user_id={self.user_id}, status={self.status})>"
    
    @classmethod
    async def get_or_create(cls, db: AsyncSession, session_id: str, user_id: int):
        """
        获取会话，如果不存在则创建 (异步版本)
        
        Args:
            db: AsyncSession 数据库会话
            session_id: 会话ID
            user_id: 用户ID
            
        Returns:
            Session: 会话实例
        """
        logger.debug(f"异步获取或创建会话: session_id={session_id}, user_id={user_id}")
        
        # 使用 AsyncSession 异步查询
        result = await db.execute(select(cls).where(cls.session_id == session_id))
        session = result.scalars().first()
        
        if not session:
            logger.info(f"会话 {session_id} 不存在，创建新会话")
            session = cls(session_id=session_id, user_id=user_id)
            db.add(session)
            await db.commit()
            await db.refresh(session)
            
        return session 