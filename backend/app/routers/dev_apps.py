from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.utils.db import get_async_db_session
from app.utils.security import get_developer_user
from app.models.user import User
from app.schemas.dev_tools import (
    DeveloperAppCreate,
    DeveloperAppUpdate,
    DeveloperAppResponse,
    DeveloperAppListResponse
)
from app.services.dev_app_service import DeveloperAppService

# 创建路由器
router = APIRouter(
    prefix="/dev/apps",
    tags=["dev-apps"],
    responses={401: {"description": "未授权"}, 403: {"description": "权限不足"}},
)

# 开发者应用服务将在每个路由中实例化


@router.get("/", response_model=DeveloperAppListResponse)
async def get_developer_apps(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页大小"),
    status: Optional[str] = Query(None, description="应用状态筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    获取开发者应用列表
    
    Args:
        page: 页码
        page_size: 每页大小
        status: 应用状态筛选
        search: 搜索关键词
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        开发者应用列表
    """
    try:
        service = DeveloperAppService(db)
        return await service.get_apps(
            db=db,
            current_user=current_user,
            page=page,
            page_size=page_size,
            status=status,
            search=search
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取应用列表失败: {str(e)}"
        )


@router.post("/", response_model=DeveloperAppResponse)
async def create_developer_app(
    app_data: DeveloperAppCreate,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    创建新的开发者应用
    
    Args:
        app_data: 应用创建数据
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        创建的应用信息
        
    Raises:
        HTTPException: 如果创建失败
    """
    try:
        service = DeveloperAppService(db)
        return await service.create_app(
            db=db,
            current_user=current_user,
            app_data=app_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建应用失败: {str(e)}"
        )


@router.get("/{app_id}", response_model=DeveloperAppResponse)
async def get_developer_app(
    app_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    获取开发者应用详情
    
    Args:
        app_id: 应用ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        应用详情
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        service = DeveloperAppService(db)
        return await service.get_app(
            db=db,
            current_user=current_user,
            app_id=app_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取应用详情失败: {str(e)}"
        )


@router.put("/{app_id}", response_model=DeveloperAppResponse)
async def update_developer_app(
    app_id: str,
    app_data: DeveloperAppUpdate,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    更新开发者应用
    
    Args:
        app_id: 应用ID
        app_data: 应用更新数据
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        更新后的应用信息
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        service = DeveloperAppService(db)
        return await service.update_app(
            db=db,
            current_user=current_user,
            app_id=app_id,
            app_data=app_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新应用失败: {str(e)}"
        )


@router.delete("/{app_id}")
async def delete_developer_app(
    app_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    删除开发者应用
    
    Args:
        app_id: 应用ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        删除成功消息
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        service = DeveloperAppService(db)
        await service.delete_app(
            db=db,
            current_user=current_user,
            app_id=app_id
        )
        return {"message": f"应用 '{app_id}' 已成功删除"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除应用失败: {str(e)}"
        )


@router.post("/{app_id}/deploy")
async def deploy_developer_app(
    app_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    部署开发者应用
    
    Args:
        app_id: 应用ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        部署结果
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        # 获取应用信息（包含权限检查）
        app = await dev_app_service.get_app(
            db=db,
            current_user=current_user,
            app_id=app_id
        )
        
        # TODO: 实现应用部署逻辑
        # 这里需要在T025-9中实现具体的应用部署服务
        
        # 更新应用状态为已部署
        from app.schemas.dev_tools import DeveloperAppUpdate
        update_data = DeveloperAppUpdate(status="deployed")
        await dev_app_service.update_app(
            db=db,
            current_user=current_user,
            app_id=app_id,
            app_data=update_data
        )
        
        return {
            "message": f"应用 '{app_id}' 部署成功",
            "status": "deployed",
            "deployment_url": f"https://apps.example.com/{app_id}",
            "deployed_at": datetime.now()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"部署应用失败: {str(e)}"
        )


@router.post("/{app_id}/undeploy")
async def undeploy_developer_app(
    app_id: str,
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    取消部署开发者应用
    
    Args:
        app_id: 应用ID
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        取消部署结果
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        # 获取应用信息（包含权限检查）
        app = await dev_app_service.get_app(
            db=db,
            current_user=current_user,
            app_id=app_id
        )
        
        # TODO: 实现应用取消部署逻辑
        # 这里需要在T025-9中实现具体的应用取消部署服务
        
        # 更新应用状态为草稿
        from app.schemas.dev_tools import DeveloperAppUpdate
        update_data = DeveloperAppUpdate(status="draft")
        await dev_app_service.update_app(
            db=db,
            current_user=current_user,
            app_id=app_id,
            app_data=update_data
        )
        
        return {
            "message": f"应用 '{app_id}' 已取消部署",
            "status": "draft",
            "undeployed_at": datetime.now()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"取消部署应用失败: {str(e)}"
        )


@router.get("/{app_id}/logs")
async def get_app_logs(
    app_id: str,
    lines: int = Query(100, ge=1, le=1000, description="日志行数"),
    level: Optional[str] = Query(None, description="日志级别筛选"),
    current_user: User = Depends(get_developer_user),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    获取应用运行日志
    
    Args:
        app_id: 应用ID
        lines: 日志行数
        level: 日志级别筛选
        current_user: 当前开发者用户
        db: 数据库会话
        
    Returns:
        应用日志
        
    Raises:
        HTTPException: 如果应用不存在或无权限访问
    """
    try:
        # 获取应用信息（包含权限检查）
        app = await dev_app_service.get_app(
            db=db,
            current_user=current_user,
            app_id=app_id
        )
        
        # TODO: 实现应用日志获取逻辑
        # 这里需要在T025-10中实现具体的日志服务
        
        # 模拟日志数据
        mock_logs = [
            {
                "timestamp": datetime.now(),
                "level": "INFO",
                "message": f"应用 {app_id} 启动成功"
            },
            {
                "timestamp": datetime.now(),
                "level": "DEBUG",
                "message": "处理用户请求"
            },
            {
                "timestamp": datetime.now(),
                "level": "ERROR",
                "message": "连接数据库失败"
            }
        ]
        
        # 根据级别筛选
        if level:
            mock_logs = [log for log in mock_logs if log["level"] == level.upper()]
        
        # 限制行数
        mock_logs = mock_logs[:lines]
        
        return {
            "app_id": app_id,
            "logs": mock_logs,
            "total_lines": len(mock_logs),
            "filtered_by_level": level
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取应用日志失败: {str(e)}"
        )