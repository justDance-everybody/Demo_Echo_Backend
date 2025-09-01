from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.utils.db import Base

class Log(Base):
    """操作日志模型"""
    __tablename__ = "logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.session_id"), nullable=False)
    step = Column(String(32), nullable=False)  # interpret, execute, confirm等
    status = Column(String(32), nullable=False)  # success, error等
    message = Column(Text, nullable=True)  # 详细信息
    timestamp = Column(DateTime, server_default=func.now())
    
    # 关系
    session = relationship("Session", backref="logs")
    
    def __repr__(self):
        return f"<Log(id={self.id}, session_id={self.session_id}, step={self.step}, status={self.status})>"
    
    @classmethod
    def create(cls, session_id, step, status, message=None):
        """创建日志记录 - 已废弃，请使用异步方法"""
        raise NotImplementedError("请使用异步数据库操作方法")