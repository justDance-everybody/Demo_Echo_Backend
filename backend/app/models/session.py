from sqlalchemy import Column, String, BigInteger, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.utils.db import Base, SessionLocal
import uuid

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
            'done',  # 已完成
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
    def get_or_create(cls, session_id, user_id):
        """获取会话，如果不存在则创建"""
        db = SessionLocal()
        try:
            session = db.query(cls).filter(cls.session_id == session_id).first()
            if not session:
                session = cls(session_id=session_id, user_id=user_id)
                db.add(session)
                db.commit()
                db.refresh(session)
            return session
        finally:
            db.close() 