from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func
from loguru import logger
from fastapi import HTTPException, status
from datetime import datetime

from app.models.tool import Tool
from app.models.user import User
from app.schemas.dev_tools import (
    DeveloperToolCreate,
    DeveloperToolUpdate,
    DeveloperToolResponse,
    DeveloperToolListResponse
)


class DeveloperToolService:
    """开发者工具服务，负责管理开发者工具相关的业务逻辑"""

    async def get_tools_list(
        self,
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 10,
        status: Optional[str] = None,
        is_public: Optional[bool] = None,
        search: Optional[str] = None
    ) -> DeveloperToolListResponse:
        """
        获取开发者工具列表
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            page: 页码
            page_size: 每页大小
            status: 工具状态筛选
            is_public: 是否公开筛选
            search: 搜索关键词
            
        Returns:
            开发者工具列表响应
        """
        logger.info(f"获取开发者工具列表 - 用户: {current_user.id}, 页码: {page}, 每页: {page_size}")
        
        # 构建查询条件
        conditions = []
        
        # 只能查看自己的工具，管理员可以查看所有
        if current_user.role != "admin":
            conditions.append(Tool.developer_id == current_user.id)
        
        # 状态筛选
        if status:
            conditions.append(Tool.status == status)
        
        # 公开性筛选
        if is_public is not None:
            conditions.append(Tool.is_public == is_public)
        
        # 搜索关键词
        if search:
            search_condition = or_(
                Tool.name.ilike(f"%{search}%"),
                Tool.description.ilike(f"%{search}%")
            )
            conditions.append(search_condition)
        
        # 构建查询
        query = select(Tool)
        if conditions:
            query = query.where(and_(*conditions))
        
        # 计算总数
        count_query = select(func.count(Tool.tool_id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # 分页查询
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(Tool.created_at.desc())
        
        result = await db.execute(query)
        tools = result.scalars().all()
        
        # 转换为响应模型
        tool_responses = []
        for tool in tools:
            tool_response = self._convert_to_response(tool)
            tool_responses.append(tool_response)
        
        logger.info(f"成功获取 {len(tool_responses)} 个工具，总计 {total} 个")
        
        return DeveloperToolListResponse(
            tools=tool_responses,
            total=total,
            page=page,
            page_size=page_size
        )

    async def create_tool(
        self,
        db: AsyncSession,
        tool_data: DeveloperToolCreate,
        current_user: User
    ) -> DeveloperToolResponse:
        """
        创建新的开发者工具
        
        Args:
            db: 数据库会话
            tool_data: 工具创建数据
            current_user: 当前用户
            
        Returns:
            创建的工具信息
            
        Raises:
            HTTPException: 如果工具ID已存在
        """
        logger.info(f"创建开发者工具 - 工具ID: {tool_data.tool_id}, 用户: {current_user.id}")
        
        # 检查工具ID是否已存在
        existing_tool = await db.execute(
            select(Tool).where(Tool.tool_id == tool_data.tool_id)
        )
        if existing_tool.scalar_one_or_none():
            logger.warning(f"工具ID '{tool_data.tool_id}' 已存在")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"工具ID '{tool_data.tool_id}' 已存在"
            )
        
        # 创建新工具
        new_tool = Tool(
            tool_id=tool_data.tool_id,
            name=tool_data.name,
            type=tool_data.type,
            description=tool_data.description,
            endpoint=tool_data.endpoint,
            request_schema=tool_data.request_schema,
            response_schema=tool_data.response_schema,
            server_name=tool_data.server_name,
            developer_id=current_user.id,
            is_public=tool_data.is_public,
            version=tool_data.version,
            tags=tool_data.tags,
            status="pending",  # 默认状态为待审核
            download_count=0,
            rating=0.0
        )
        
        db.add(new_tool)
        await db.commit()
        await db.refresh(new_tool)
        
        logger.info(f"成功创建工具: {new_tool.tool_id}")
        return self._convert_to_response(new_tool)

    async def get_tool_by_id(
        self,
        db: AsyncSession,
        tool_id: str,
        current_user: User
    ) -> DeveloperToolResponse:
        """
        获取开发者工具详情
        
        Args:
            db: 数据库会话
            tool_id: 工具ID
            current_user: 当前用户
            
        Returns:
            工具详情
            
        Raises:
            HTTPException: 如果工具不存在或无权限访问
        """
        logger.info(f"获取工具详情 - 工具ID: {tool_id}, 用户: {current_user.id}")
        
        # 查询工具
        result = await db.execute(
            select(Tool).where(Tool.tool_id == tool_id)
        )
        tool = result.scalar_one_or_none()
        
        if not tool:
            logger.warning(f"工具不存在: {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="工具不存在"
            )
        
        # 权限检查：只能访问自己的工具，管理员可以访问所有
        if current_user.role != "admin" and tool.developer_id != current_user.id:
            logger.warning(f"用户 {current_user.id} 无权限访问工具 {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此工具"
            )
        
        logger.info(f"成功获取工具详情: {tool_id}")
        return self._convert_to_response(tool)

    async def update_tool(
        self,
        db: AsyncSession,
        tool_id: str,
        tool_data: DeveloperToolUpdate,
        current_user: User
    ) -> DeveloperToolResponse:
        """
        更新开发者工具
        
        Args:
            db: 数据库会话
            tool_id: 工具ID
            tool_data: 工具更新数据
            current_user: 当前用户
            
        Returns:
            更新后的工具信息
            
        Raises:
            HTTPException: 如果工具不存在或无权限访问
        """
        logger.info(f"更新工具 - 工具ID: {tool_id}, 用户: {current_user.id}")
        
        # 查询工具
        result = await db.execute(
            select(Tool).where(Tool.tool_id == tool_id)
        )
        tool = result.scalar_one_or_none()
        
        if not tool:
            logger.warning(f"工具不存在: {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="工具不存在"
            )
        
        # 权限检查：只能更新自己的工具，管理员可以更新所有
        if current_user.role != "admin" and tool.developer_id != current_user.id:
            logger.warning(f"用户 {current_user.id} 无权限更新工具 {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限更新此工具"
            )
        
        # 更新工具字段
        update_data = tool_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tool, field, value)
        
        # 更新时间戳
        tool.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(tool)
        
        logger.info(f"成功更新工具: {tool_id}")
        return self._convert_to_response(tool)

    async def delete_tool(
        self,
        db: AsyncSession,
        tool_id: str,
        current_user: User
    ) -> Dict[str, str]:
        """
        删除开发者工具
        
        Args:
            db: 数据库会话
            tool_id: 工具ID
            current_user: 当前用户
            
        Returns:
            删除成功消息
            
        Raises:
            HTTPException: 如果工具不存在或无权限访问
        """
        logger.info(f"删除工具 - 工具ID: {tool_id}, 用户: {current_user.id}")
        
        # 查询工具
        result = await db.execute(
            select(Tool).where(Tool.tool_id == tool_id)
        )
        tool = result.scalar_one_or_none()
        
        if not tool:
            logger.warning(f"工具不存在: {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="工具不存在"
            )
        
        # 权限检查：只能删除自己的工具，管理员可以删除所有
        if current_user.role != "admin" and tool.developer_id != current_user.id:
            logger.warning(f"用户 {current_user.id} 无权限删除工具 {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限删除此工具"
            )
        
        await db.delete(tool)
        await db.commit()
        
        logger.info(f"成功删除工具: {tool_id}")
        return {"message": f"工具 '{tool_id}' 已成功删除"}

    async def validate_tool_data(
        self,
        tool_data: DeveloperToolCreate
    ) -> Dict[str, Any]:
        """
        验证工具数据的有效性
        
        Args:
            tool_data: 工具数据
            
        Returns:
            验证结果
        """
        logger.info(f"验证工具数据 - 工具ID: {tool_data.tool_id}")
        
        errors = []
        warnings = []
        
        # 验证工具ID格式
        if not tool_data.tool_id or len(tool_data.tool_id) < 3:
            errors.append("工具ID长度至少为3个字符")
        
        # 验证工具类型
        valid_types = ["mcp", "http", "api"]
        if tool_data.type not in valid_types:
            errors.append(f"工具类型必须是以下之一: {', '.join(valid_types)}")
        
        # 验证端点配置
        if not tool_data.endpoint:
            errors.append("端点配置不能为空")
        elif tool_data.type == "http" and "url" not in tool_data.endpoint:
            errors.append("HTTP类型工具必须包含url字段")
        
        # 验证请求模式
        if not tool_data.request_schema:
            warnings.append("建议提供请求参数模式以便更好的验证")
        
        is_valid = len(errors) == 0
        
        result = {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings
        }
        
        logger.info(f"工具数据验证完成 - 有效: {is_valid}, 错误: {len(errors)}, 警告: {len(warnings)}")
        return result

    async def test_tool(
        self,
        db: AsyncSession,
        tool_id: str,
        test_data: Any,
        current_user: User
    ) -> Dict[str, Any]:
        """
        测试开发者工具
        
        Args:
            db: 数据库会话
            tool_id: 工具ID
            test_data: 测试数据
            current_user: 当前用户
            
        Returns:
            测试结果
            
        Raises:
            HTTPException: 如果工具不存在或无权限访问
        """
        logger.info(f"测试工具 - 工具ID: {tool_id}, 用户: {current_user.id}")
        
        # 查询工具
        result = await db.execute(
            select(Tool).where(Tool.tool_id == tool_id)
        )
        tool = result.scalar_one_or_none()
        
        if not tool:
            logger.warning(f"工具不存在: {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="工具不存在"
            )
        
        # 权限检查：只能测试自己的工具，管理员可以测试所有
        if current_user.role != "admin" and tool.developer_id != current_user.id:
            logger.warning(f"用户 {current_user.id} 无权限测试工具 {tool_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限测试此工具"
            )
        
        try:
            # 导入执行服务
            from app.services.execute_service import ExecuteService
            
            # 创建执行服务实例
            execute_service = ExecuteService()
            
            # 调用执行服务测试工具
            execute_result = await execute_service.execute_tool(
                tool_id=tool_id,
                params=test_data if isinstance(test_data, dict) else {},
                db=db,
                user_id=current_user.id,
                session_id=f"test_session_{current_user.id}_{tool_id}"
            )
            
            # 转换执行结果为测试响应格式
            if execute_result.success:
                logger.info(f"工具测试成功: {tool_id}")
                return {
                    "success": True,
                    "result": {
                        "message": f"工具 {tool_id} 测试成功",
                        "data": execute_result.data,
                        "tool_id": execute_result.tool_id,
                        "session_id": execute_result.session_id
                    },
                    "error": None,
                    "execution_time": execute_result.execution_time,
                    "timestamp": datetime.utcnow()
                }
            else:
                logger.warning(f"工具测试失败: {tool_id}, 错误: {execute_result.error}")
                return {
                    "success": False,
                    "result": None,
                    "error": execute_result.error.get("message", "工具执行失败") if execute_result.error else "未知错误",
                    "execution_time": execute_result.execution_time,
                    "timestamp": datetime.utcnow()
                }
                
        except Exception as e:
            logger.error(f"测试工具失败: tool_id={tool_id}, error={str(e)}")
            return {
                "success": False,
                "result": None,
                "error": f"测试失败: {str(e)}",
                "execution_time": 0.0,
                "timestamp": datetime.utcnow()
            }

    async def get_tool_statistics(
        self,
        db: AsyncSession,
        current_user: User
    ) -> Dict[str, Any]:
        """
        获取开发者工具统计信息
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            
        Returns:
            统计信息
        """
        logger.info(f"获取工具统计信息 - 用户: {current_user.id}")
        
        # 构建查询条件
        conditions = []
        if current_user.role != "admin":
            conditions.append(Tool.developer_id == current_user.id)
        
        # 总工具数
        total_query = select(func.count(Tool.tool_id))
        if conditions:
            total_query = total_query.where(and_(*conditions))
        total_result = await db.execute(total_query)
        total_tools = total_result.scalar()
        
        # 公开工具数
        public_query = select(func.count(Tool.tool_id)).where(Tool.is_public == True)
        if conditions:
            public_query = public_query.where(and_(Tool.is_public == True, *conditions))
        public_result = await db.execute(public_query)
        public_tools = public_result.scalar()
        
        # 按状态统计
        status_query = select(Tool.status, func.count(Tool.tool_id)).group_by(Tool.status)
        if conditions:
            status_query = status_query.where(and_(*conditions))
        status_result = await db.execute(status_query)
        status_stats = {row[0]: row[1] for row in status_result.fetchall()}
        
        # 按类型统计
        type_query = select(Tool.type, func.count(Tool.tool_id)).group_by(Tool.type)
        if conditions:
            type_query = type_query.where(and_(*conditions))
        type_result = await db.execute(type_query)
        type_stats = {row[0]: row[1] for row in type_result.fetchall()}
        
        statistics = {
            "total_tools": total_tools,
            "public_tools": public_tools,
            "private_tools": total_tools - public_tools,
            "status_distribution": status_stats,
            "type_distribution": type_stats
        }
        
        logger.info(f"成功获取工具统计信息: {statistics}")
        return statistics

    def _convert_to_response(self, tool: Tool) -> DeveloperToolResponse:
        """
        将Tool模型转换为DeveloperToolResponse
        
        Args:
            tool: Tool模型实例
            
        Returns:
            DeveloperToolResponse实例
        """
        return DeveloperToolResponse(
            tool_id=tool.tool_id,
            name=tool.name,
            type=tool.type,
            description=tool.description,
            endpoint=tool.endpoint,
            request_schema=tool.request_schema,
            response_schema=tool.response_schema,
            server_name=tool.server_name,
            developer_id=tool.developer_id,
            is_public=tool.is_public,
            status=tool.status,
            version=tool.version,
            tags=tool.tags if tool.tags else [],
            download_count=tool.download_count,
            rating=tool.rating,
            created_at=tool.created_at,
            updated_at=tool.updated_at
        )


# 创建开发者工具服务实例
dev_tool_service = DeveloperToolService()