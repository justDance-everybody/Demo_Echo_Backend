from sqlalchemy import Column, String, JSON, DateTime, Integer, Boolean, ForeignKey, BigInteger, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.utils.db import Base

class App(Base):
    """开发者应用模型"""
    __tablename__ = "apps"

    app_id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(String(512), nullable=True)
    version = Column(String(32), default='1.0.0', nullable=False)
    developer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)
    status = Column(Enum('draft', 'active', 'inactive', 'deployed', name='app_status'), default='draft', nullable=False)
    config = Column(JSON, nullable=True)  # 应用配置信息

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    developer = relationship("User", back_populates="apps")
    app_tools = relationship("AppTool", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<App(app_id={self.app_id}, name={self.name}, status={self.status})>"

class AppTool(Base):
    """应用工具关联模型"""
    __tablename__ = "app_tools"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    app_id = Column(String(50), ForeignKey('apps.app_id'), nullable=False)
    tool_id = Column(Integer, ForeignKey('tools.id'), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)  # 工具在应用中的顺序
    config = Column(JSON, default=dict)  # 工具在此应用中的特定配置
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<AppTool(app_id={self.app_id}, tool_id={self.tool_id}, order={self.order})>"
