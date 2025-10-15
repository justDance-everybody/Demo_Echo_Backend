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
        
        # 构建查询（使用 selectinload 预加载开发者信息）
        from sqlalchemy.orm import selectinload
        
        query = select(Tool).options(selectinload(Tool.developer))
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
        创建新的开发者工具（增强版：支持格式验证、连通性测试、自动生成）
        
        Args:
            db: 数据库会话
            tool_data: 工具创建数据
            current_user: 当前用户
            
        Returns:
            创建的工具信息
            
        Raises:
            HTTPException: 如果验证失败、连通性测试失败或工具ID已存在
        """
        logger.info(f"创建开发者工具 - 用户: {current_user.id}")
        
        # 1. 格式验证
        validation_result = await self.validate_tool_data(tool_data)
        if not validation_result["valid"]:
            logger.warning(f"工具数据验证失败: {validation_result['errors']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"工具数据验证失败: {'; '.join(validation_result['errors'])}"
            )
        
        # 2. 如果是 HTTP 类型 + Dify/Coze 平台，执行自动探测和连通性测试
        if tool_data.type == "http":
            platform = tool_data.endpoint.get("platform")
            if platform in ["dify", "coze"]:
                logger.info(f"开始 {platform} 平台处理...")
                
                # 设置默认 base_url（如果未提供）
                if not tool_data.endpoint.get("base_url"):
                    if platform == "dify":
                        tool_data.endpoint["base_url"] = "https://api.dify.ai/v1"
                    elif platform == "coze":
                        tool_data.endpoint["base_url"] = "https://api.coze.com"
                    logger.info(f"使用默认 base_url: {tool_data.endpoint['base_url']}")
                
                # Dify 特殊处理：自动探测应用类型
                if platform == "dify":
                    # 自动探测应用类型（会自动测试连通性）
                    detected_type = await self._detect_dify_app_type(tool_data.endpoint)
                    tool_data.endpoint["app_type"] = detected_type
                    
                    # 设置 app_config
                    if "app_config" not in tool_data.endpoint:
                        tool_data.endpoint["app_config"] = {}
                    tool_data.endpoint["app_config"]["response_mode"] = "blocking"
                    
                    logger.info(f"✅ Dify 工具配置完成 - 应用类型: {detected_type}")
                
                # Coze 平台仍使用原有的连通性测试
                elif platform == "coze":
                    await self._test_platform_connectivity(tool_data.endpoint, platform)
        
        # 3. 自动生成 tool_id（如果未提供）
        if not tool_data.tool_id:
            platform = tool_data.endpoint.get("platform") if tool_data.type == "http" else None
            tool_data.tool_id = self._generate_tool_id(tool_data.type, platform)
        
        # 4. 自动生成 request_schema（如果未提供且是 HTTP 工具）
        if tool_data.type == "http" and not tool_data.request_schema:
            tool_data.request_schema = {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "用户查询内容"
                    }
                },
                "required": ["query"]
            }
            logger.info("自动生成 request_schema")
        
        # 5. 检查工具ID是否已存在
        existing_tool = await db.execute(
            select(Tool).where(Tool.tool_id == tool_data.tool_id)
        )
        if existing_tool.scalar_one_or_none():
            logger.warning(f"工具ID '{tool_data.tool_id}' 已存在")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"工具ID '{tool_data.tool_id}' 已存在"
            )
        
        # 6. 创建新工具（测试通过后状态设为 active）
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
            status="active",  # 连通性测试通过，直接激活
            download_count=0,
            rating=0.0
        )
        
        db.add(new_tool)
        await db.commit()
        await db.refresh(new_tool)
        
        logger.info(f"成功创建工具: {new_tool.tool_id} (平台: {tool_data.endpoint.get('platform', 'N/A')})")
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
        
        # 查询工具（预加载开发者信息）
        from sqlalchemy.orm import selectinload
        
        result = await db.execute(
            select(Tool).options(selectinload(Tool.developer)).where(Tool.tool_id == tool_id)
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
        验证工具数据的有效性（增强版：支持 Dify/Coze 平台验证）
        
        Args:
            tool_data: 工具数据
            
        Returns:
            验证结果
        """
        logger.info(f"验证工具数据 - 工具ID: {tool_data.tool_id}")
        
        errors = []
        warnings = []
        
        # 验证工具ID格式（如果提供）
        if tool_data.tool_id and len(tool_data.tool_id) < 3:
            errors.append("工具ID长度至少为3个字符")
        
        # 验证工具类型（修正：只支持 mcp 和 http）
        valid_types = ["mcp", "http"]
        if tool_data.type not in valid_types:
            errors.append(f"工具类型必须是以下之一: {', '.join(valid_types)}")
        
        # 验证端点配置
        if not tool_data.endpoint:
            errors.append("端点配置不能为空")
        elif tool_data.type == "http":
            # HTTP 类型工具的详细验证
            endpoint = tool_data.endpoint
            platform = endpoint.get("platform")
            
            if not platform:
                errors.append("HTTP 工具必须指定 platform 字段（dify/coze）")
            elif platform == "dify":
                # Dify 平台验证
                api_key = endpoint.get("api_key", "")
                if not api_key:
                    errors.append("Dify 工具缺少 api_key")
                elif not api_key.startswith("app-"):
                    errors.append("Dify API Key 必须以 'app-' 开头")
                if len(api_key) > 256:
                    errors.append("API Key 长度不能超过 256 字符")
                
                base_url = endpoint.get("base_url", "")
                if base_url and not base_url.startswith("https://"):
                    errors.append("Base URL 必须使用 HTTPS 协议")
                
                app_config = endpoint.get("app_config", {})
                response_mode = app_config.get("response_mode")
                if response_mode and response_mode not in ["streaming", "blocking"]:
                    errors.append("response_mode 必须是 'streaming' 或 'blocking'")
                    
            elif platform == "coze":
                # Coze 平台验证
                api_key = endpoint.get("api_key", "")
                if not api_key:
                    errors.append("Coze 工具缺少 api_key")
                elif not api_key.startswith("pat_"):
                    errors.append("Coze API Key 必须以 'pat_' 开头")
                if len(api_key) > 256:
                    errors.append("API Key 长度不能超过 256 字符")
                
                base_url = endpoint.get("base_url", "")
                if base_url and not base_url.startswith("https://"):
                    errors.append("Base URL 必须使用 HTTPS 协议")
                
                app_config = endpoint.get("app_config", {})
                bot_id = app_config.get("bot_id")
                if not bot_id:
                    errors.append("Coze 工具必须提供 bot_id")
                elif not str(bot_id).isdigit():
                    errors.append("Coze bot_id 必须是数字")
            else:
                errors.append(f"不支持的平台类型: {platform}，目前仅支持 dify 和 coze")
        
        # 验证请求模式（MCP 工具需要）
        if tool_data.type == "mcp" and not tool_data.request_schema:
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

    def _generate_tool_id(self, tool_type: str, platform: Optional[str] = None) -> str:
        """
        自动生成工具 ID
        
        Args:
            tool_type: 工具类型 (mcp/http)
            platform: 平台类型 (dify/coze)，HTTP 工具需要
            
        Returns:
            生成的工具 ID
        """
        import uuid
        import time
        
        if tool_type == "http" and platform:
            prefix = f"{platform}_"
        else:
            prefix = f"{tool_type}_"
        
        timestamp = int(time.time())
        short_uuid = str(uuid.uuid4())[:8]
        tool_id = f"{prefix}{timestamp}_{short_uuid}"
        
        logger.info(f"自动生成工具 ID: {tool_id}")
        return tool_id

    def _parse_error_response(self, response, platform: str) -> str:
        """
        解析不同平台的错误响应，返回友好提示
        
        Args:
            response: httpx.Response 对象
            platform: 平台类型 (dify/coze)
            
        Returns:
            友好的错误提示信息
        """
        status_code = response.status_code
        
        # 常见 HTTP 错误码
        if status_code == 401:
            return "API Key 无效或已过期，请检查后重新提交"
        elif status_code == 403:
            return "无权限访问，请检查 API Key 权限配置"
        elif status_code == 404:
            if platform == "coze":
                return "Bot ID 不存在，请确认 Bot ID 是否正确"
            return "API 端点不存在，请检查 base_url 配置"
        elif status_code == 429:
            return "请求过于频繁，请稍后重试"
        elif status_code >= 500:
            return f"{platform} 服务器错误，请稍后重试"
        
        # 尝试解析响应体（Dify 特殊错误处理）
        try:
            error_body = response.json()
            if platform == "dify":
                error_code = error_body.get("code", "")
                error_msg = error_body.get("message", "未知错误")
                
                # Dify 特定错误码处理
                if error_code == "not_chat_app":
                    return "应用模式不匹配：此 Dify 应用不是 Chat App 模式。请在 Dify 后台检查应用类型，或使用对应的 API 路径（Agent/Workflow/Completion）"
                
                return f"Dify API 错误：{error_msg}"
            elif platform == "coze":
                error_msg = error_body.get("msg", "未知错误")
                return f"Coze API 返回错误：{error_msg}"
        except:
            pass
        
        return f"HTTP {status_code} 错误，响应内容：{response.text[:100]}"

    async def _detect_dify_app_type(self, endpoint: dict) -> str:
        """
        自动探测 Dify 应用类型
        
        策略：按常见度顺序尝试不同端点
        1. Chat App (/chat-messages) - 最常见
        2. Workflow (/workflows/run) - 第二常见
        3. Agent (/agent/chat)
        4. Completion (/completion-messages)
        
        Args:
            endpoint: 端点配置
            
        Returns:
            应用类型字符串: 'chat', 'workflow', 'agent', 'completion'
            
        Raises:
            HTTPException: 如果所有端点都失败
        """
        import httpx
        
        api_key = endpoint.get("api_key")
        base_url = endpoint.get("base_url", "https://api.dify.ai/v1")
        test_query = "测试连接"
        
        logger.info(f"开始自动探测 Dify 应用类型: {api_key[:15]}...")
        
        # 1. 尝试 Chat App
        try:
            url = f"{base_url}/chat-messages"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "query": test_query,
                "user": "test-user",
                "response_mode": "blocking",
                "inputs": {}
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info("✅ 探测成功：Dify 应用类型为 Chat App")
                    return "chat"
        except Exception as e:
            logger.debug(f"Chat App 探测失败: {e}")
        
        # 2. 尝试 Workflow
        try:
            url = f"{base_url}/workflows/run"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "inputs": {"query": test_query},
                "user": "test-user",
                "response_mode": "blocking"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info("✅ 探测成功：Dify 应用类型为 Workflow")
                    return "workflow"
        except Exception as e:
            logger.debug(f"Workflow 探测失败: {e}")
        
        # 3. 尝试 Agent
        try:
            url = f"{base_url}/agent/chat"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "query": test_query,
                "user": "test-user",
                "response_mode": "blocking",
                "inputs": {}
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info("✅ 探测成功：Dify 应用类型为 Agent")
                    return "agent"
        except Exception as e:
            logger.debug(f"Agent 探测失败: {e}")
        
        # 4. 尝试 Completion
        try:
            url = f"{base_url}/completion-messages"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "inputs": {},
                "user": "test-user",
                "response_mode": "blocking"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    logger.info("✅ 探测成功：Dify 应用类型为 Completion")
                    return "completion"
        except Exception as e:
            logger.debug(f"Completion 探测失败: {e}")
        
        # 所有端点都失败
        logger.error("❌ 无法探测 Dify 应用类型，所有端点都失败")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法识别 Dify 应用类型。请检查 API Key 是否有效，或应用是否已发布。"
        )

    async def _test_platform_connectivity(self, endpoint: dict, platform: str):
        """
        测试 Dify/Coze 平台连通性（已废弃，保留兼容性）
        
        现在使用 _detect_dify_app_type 替代
        
        Args:
            endpoint: 端点配置
            platform: 平台类型 (dify/coze)
            
        Raises:
            HTTPException: 如果连通性测试失败
        """
        import httpx
        
        api_key = endpoint.get("api_key")
        base_url = endpoint.get("base_url")
        app_config = endpoint.get("app_config", {})
        
        # 构造测试请求
        if platform == "dify":
            test_url = f"{base_url}/chat-messages"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "query": "测试连接",
                "user": "test-user",
                "response_mode": app_config.get("response_mode", "blocking"),
                "inputs": {}
            }
        elif platform == "coze":
            test_url = f"{base_url}/v3/chat"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            bot_id = app_config.get("bot_id")
            if not bot_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Coze 工具缺少 bot_id 配置"
                )
            payload = {
                "bot_id": bot_id,
                "user": "test-user",
                "query": "测试连接",
                "stream": False
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的平台类型: {platform}"
            )
        
        # 执行测试（10秒超时）
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                logger.info(f"发送测试请求到: {test_url}")
                response = await client.post(test_url, headers=headers, json=payload)
                
                # 判断成功/失败
                if response.status_code == 200:
                    logger.info(f"{platform} 平台连通性测试成功")
                    return  # 测试通过，继续创建
                else:
                    # HTTP 错误码 - 详细反馈
                    error_detail = self._parse_error_response(response, platform)
                    logger.error(f"{platform} 连通性测试失败: {error_detail}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"连通性测试失败 ({platform})：{error_detail}"
                    )
                    
        except httpx.TimeoutException:
            logger.error(f"{platform} 连通性测试超时")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"连通性测试超时，请检查网络或 {platform} 服务是否可用"
            )
        except httpx.HTTPError as e:
            logger.error(f"{platform} 连通性测试网络错误: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"连接失败：无法访问 {platform} API，请检查 base_url 是否正确"
            )
        except HTTPException:
            # 重新抛出已经格式化的 HTTPException
            raise
        except Exception as e:
            logger.error(f"{platform} 连通性测试未知错误: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"测试时发生错误：{str(e)}"
            )

    def _convert_to_response(self, tool: Tool) -> DeveloperToolResponse:
        """
        将Tool模型转换为DeveloperToolResponse
        
        Args:
            tool: Tool模型实例
            
        Returns:
            DeveloperToolResponse实例
        """
        # 获取开发者用户名（通过关联关系）
        developer_username = None
        if tool.developer:
            developer_username = tool.developer.username
        
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
            developer_username=developer_username,
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