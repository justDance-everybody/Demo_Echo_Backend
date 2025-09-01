from typing import List, Dict, Any, Optional, Tuple, Union
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func
from datetime import datetime
import uuid
import logging

from app.models.app import App, AppTool
from app.models.tool import Tool
from app.models.user import User
from app.schemas.dev_tools import (
    DeveloperAppCreate,
    DeveloperAppUpdate,
    DeveloperAppResponse,
    DeveloperAppListResponse
)

logger = logging.getLogger(__name__)

class DeveloperAppService:
    """开发者应用服务，负责管理开发者应用相关的业务逻辑"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_apps(
        self,
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 10,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> DeveloperAppListResponse:
        """
        获取开发者应用列表
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            page: 页码
            page_size: 每页大小
            status: 状态筛选
            search: 搜索关键词
            
        Returns:
            DeveloperAppListResponse: 应用列表响应
        """
        try:
            # 构建查询条件
            query = select(App)
            
            # 权限过滤：普通开发者只能看到自己的应用，管理员可以看到所有应用
            if current_user.role != 'admin':
                query = query.where(App.developer_id == current_user.id)
            
            # 状态筛选
            if status:
                query = query.where(App.status == status)
            
            # 搜索筛选
            if search:
                search_pattern = f"%{search}%"
                query = query.where(
                    or_(
                        App.name.like(search_pattern),
                        App.description.like(search_pattern)
                    )
                )
            
            # 获取总数
            count_query = select(func.count(App.app_id)).select_from(query.subquery())
            total_result = await db.execute(count_query)
            total = total_result.scalar()
            
            # 分页和排序
            query = query.order_by(App.created_at.desc())
            query = query.offset((page - 1) * page_size).limit(page_size)
            
            # 执行查询
            result = await db.execute(query)
            apps = result.scalars().all()
            
            # 转换为响应模型
            app_responses = []
            for app in apps:
                # 获取关联的工具
                tools_query = select(Tool).join(AppTool, Tool.id == AppTool.tool_id).where(AppTool.app_id == app.app_id)
                tools_result = await db.execute(tools_query)
                tools = tools_result.scalars().all()
                
                app_response = DeveloperAppResponse(
                    app_id=app.app_id,
                    name=app.name,
                    description=app.description,
                    version=app.version,
                    developer_id=app.developer_id,
                    is_public=app.is_public,
                    status=app.status,
                    tools=[tool.id for tool in tools],
                    config=app.config or {},
                    created_at=app.created_at,
                    updated_at=app.updated_at
                )
                app_responses.append(app_response)
            
            return DeveloperAppListResponse(
                apps=app_responses,
                total=total,
                page=page,
                page_size=page_size
            )
            
        except Exception as e:
            logger.error(f"获取应用列表失败: {str(e)}")
            raise

    async def create_app(
        self,
        db: AsyncSession,
        current_user: User,
        app_data: DeveloperAppCreate
    ) -> DeveloperAppResponse:
        """
        创建新应用
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            app_data: 应用创建数据
            
        Returns:
            DeveloperAppResponse: 创建的应用信息
        """
        try:
            # 生成应用ID
            app_id = f"app_{uuid.uuid4().hex[:12]}"
            
            # 创建应用
            new_app = App(
                app_id=app_id,
                name=app_data.name,
                description=app_data.description,
                version=app_data.version,
                developer_id=current_user.id,
                is_public=app_data.is_public,
                status='draft',
                config={}
            )
            
            db.add(new_app)
            await db.flush()  # 获取生成的ID
            
            # 关联工具
            if app_data.tool_ids:
                await self._associate_tools(db, app_id, app_data.tool_ids, current_user)
            
            await db.commit()
            
            # 获取完整的应用信息
            return await self.get_app(db, current_user, app_id)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"创建应用失败: {str(e)}")
            raise

    async def get_app(
        self,
        db: AsyncSession,
        current_user: User,
        app_id: str
    ) -> DeveloperAppResponse:
        """
        获取应用详情
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            app_id: 应用ID
            
        Returns:
            DeveloperAppResponse: 应用详情
        """
        try:
            # 查询应用
            query = select(App).where(App.app_id == app_id)
            result = await db.execute(query)
            app = result.scalar_one_or_none()
            
            if not app:
                raise ValueError(f"应用不存在: {app_id}")
            
            # 权限检查
            if current_user.role != 'admin' and app.developer_id != current_user.id:
                raise PermissionError("无权访问此应用")
            
            # 获取关联的工具
            tools_query = select(Tool).join(AppTool, Tool.id == AppTool.tool_id).where(AppTool.app_id == app_id)
            tools_result = await db.execute(tools_query)
            tools = tools_result.scalars().all()
            
            return DeveloperAppResponse(
                app_id=app.app_id,
                name=app.name,
                description=app.description,
                version=app.version,
                developer_id=app.developer_id,
                is_public=app.is_public,
                status=app.status,
                tools=[tool.id for tool in tools],
                config=app.config or {},
                created_at=app.created_at,
                updated_at=app.updated_at
            )
            
        except Exception as e:
            logger.error(f"获取应用详情失败: {str(e)}")
            raise

    async def update_app(
        self,
        db: AsyncSession,
        current_user: User,
        app_id: str,
        app_data: DeveloperAppUpdate
    ) -> DeveloperAppResponse:
        """
        更新应用
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            app_id: 应用ID
            app_data: 更新数据
            
        Returns:
            DeveloperAppResponse: 更新后的应用信息
        """
        try:
            # 查询应用
            query = select(App).where(App.app_id == app_id)
            result = await db.execute(query)
            app = result.scalar_one_or_none()
            
            if not app:
                raise ValueError(f"应用不存在: {app_id}")
            
            # 权限检查
            if current_user.role != 'admin' and app.developer_id != current_user.id:
                raise PermissionError("无权修改此应用")
            
            # 更新字段
            if app_data.name is not None:
                app.name = app_data.name
            if app_data.description is not None:
                app.description = app_data.description
            if app_data.version is not None:
                app.version = app_data.version
            if app_data.is_public is not None:
                app.is_public = app_data.is_public
            if app_data.status is not None:
                app.status = app_data.status
            
            app.updated_at = datetime.utcnow()
            
            # 更新工具关联
            if app_data.tool_ids is not None:
                # 清除现有关联
                await self._clear_tool_associations(db, app_id)
                # 添加新关联
                if app_data.tool_ids:
                    await self._associate_tools(db, app_id, app_data.tool_ids, current_user)
            
            await db.commit()
            
            # 返回更新后的应用信息
            return await self.get_app(db, current_user, app_id)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"更新应用失败: {str(e)}")
            raise

    async def delete_app(
        self,
        db: AsyncSession,
        current_user: User,
        app_id: str
    ) -> bool:
        """
        删除应用
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            app_id: 应用ID
            
        Returns:
            bool: 删除是否成功
        """
        try:
            # 查询应用
            query = select(App).where(App.app_id == app_id)
            result = await db.execute(query)
            app = result.scalar_one_or_none()
            
            if not app:
                raise ValueError(f"应用不存在: {app_id}")
            
            # 权限检查
            if current_user.role != 'admin' and app.developer_id != current_user.id:
                raise PermissionError("无权删除此应用")
            
            # 清除工具关联
            await self._clear_tool_associations(db, app_id)
            
            # 删除应用
            await db.delete(app)
            await db.commit()
            
            logger.info(f"应用删除成功: {app_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"删除应用失败: {str(e)}")
            raise

    async def _associate_tools(
        self,
        db: AsyncSession,
        app_id: str,
        tool_ids: List[int],
        current_user: User
    ) -> None:
        """
        关联工具到应用
        
        Args:
            db: 数据库会话
            app_id: 应用ID
            tool_ids: 工具ID列表
            current_user: 当前用户
        """
        for i, tool_id in enumerate(tool_ids):
            # 验证工具存在且用户有权限
            tool_query = select(Tool).where(Tool.id == tool_id)
            tool_result = await db.execute(tool_query)
            tool = tool_result.scalar_one_or_none()
            
            if not tool:
                logger.warning(f"工具不存在，跳过关联: {tool_id}")
                continue
            
            # 权限检查：只能关联自己的工具或公开工具
            if (current_user.role != 'admin' and 
                tool.developer_id != current_user.id and 
                not tool.is_public):
                logger.warning(f"无权关联工具，跳过: {tool_id}")
                continue
            
            # 创建关联记录
            app_tool = AppTool(
                app_id=app_id,
                tool_id=tool_id,
                order_index=i,
                config={}
            )
            db.add(app_tool)

    async def _clear_tool_associations(
        self,
        db: AsyncSession,
        app_id: str
    ) -> None:
        """
        清除应用的工具关联
        
        Args:
            db: 数据库会话
            app_id: 应用ID
        """
        # 删除关联记录
        from sqlalchemy import delete
        stmt = delete(AppTool).where(AppTool.app_id == app_id)
        await db.execute(stmt)