#!/usr/bin/env python3
"""
开发者工具生命周期测试
测试场景：开发者提交API工具 -> 删除工具 -> 权限验证

测试目标：
1. 验证开发者可以成功创建工具
2. 验证开发者可以删除自己的工具
3. 验证开发者无法删除其他开发者的工具
4. 验证管理员可以删除任何工具
"""

import asyncio
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# 添加路径
sys.path.insert(0, '/home/devbox/project/Backend/backend')

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.db import get_async_db_session
from app.models.tool import Tool
from app.models.user import User
from app.services.dev_tool_service import DeveloperToolService
from app.schemas.dev_tools import DeveloperToolCreate
from app.utils.security import get_password_hash


# ==================== 测试配置 ====================

TEST_ACCOUNTS = {
    "dev1": {
        "username": "testdev1_auto",
        "password": "DevPassword123",
        "role": "developer",
        "description": "测试开发者1"
    },
    "dev2": {
        "username": "testdev2_auto",
        "password": "DevPassword456",
        "role": "developer",
        "description": "测试开发者2"
    },
    "admin": {
        "username": "testadmin_auto",
        "password": "AdminPassword789",
        "role": "admin",
        "description": "测试管理员"
    }
}


# ==================== 工具函数 ====================

class TestLogger:
    """测试日志记录器"""
    
    def __init__(self):
        self.logs = []
        self.test_start_time = datetime.now()
    
    def log(self, level: str, message: str, data: Any = None):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        elapsed = (datetime.now() - self.test_start_time).total_seconds()
        
        log_entry = {
            "timestamp": timestamp,
            "elapsed": f"{elapsed:.3f}s",
            "level": level,
            "message": message
        }
        
        if data is not None:
            log_entry["data"] = data
        
        self.logs.append(log_entry)
        
        # 控制台输出
        emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️",
            "STEP": "🔹"
        }.get(level, "📝")
        
        print(f"[{timestamp}] [{elapsed:>7.3f}s] {emoji} {message}")
        if data:
            print(f"    数据: {json.dumps(data, ensure_ascii=False, indent=2)}")
    
    def info(self, message: str, data: Any = None):
        self.log("INFO", message, data)
    
    def success(self, message: str, data: Any = None):
        self.log("SUCCESS", message, data)
    
    def error(self, message: str, data: Any = None):
        self.log("ERROR", message, data)
    
    def warning(self, message: str, data: Any = None):
        self.log("WARNING", message, data)
    
    def step(self, message: str):
        self.log("STEP", f"\n{'='*60}\n{message}\n{'='*60}")
    
    def save_to_file(self, filename: str = "test_developer_tool_lifecycle.log"):
        """保存日志到文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.logs, f, ensure_ascii=False, indent=2)
        print(f"\n📄 日志已保存到: {filename}")


logger = TestLogger()


async def ensure_test_user(db: AsyncSession, account_info: Dict) -> User:
    """确保测试用户存在"""
    username = account_info["username"]
    
    # 检查用户是否存在
    result = await db.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()
    
    if user:
        logger.info(f"用户已存在: {username} (ID: {user.id})")
        return user
    
    # 创建新用户
    password_hash = get_password_hash(account_info["password"])
    new_user = User(
        username=username,
        password_hash=password_hash,
        role=account_info["role"],
        is_active=1,
        is_superuser=1 if account_info["role"] == "admin" else 0
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.success(f"创建用户成功: {username} (ID: {new_user.id}, 角色: {new_user.role})")
    return new_user


async def create_test_tool(
    db: AsyncSession, 
    user: User, 
    tool_name: str,
    description: str
) -> Optional[Tool]:
    """创建测试工具"""
    service = DeveloperToolService()
    
    tool_data = DeveloperToolCreate(
        name=tool_name,
        type="http",
        description=description,
        endpoint={
            "platform": "generic",
            "url": "https://api.example.com/test",
            "method": "POST"
        },
        request_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "用户查询"}
            },
            "required": ["query"]
        }
    )
    
    try:
        response = await service.create_tool(db, tool_data, user)
        logger.success(f"创建工具成功: {response.tool_id}", {
            "tool_id": response.tool_id,
            "name": response.name,
            "developer_id": response.developer_id,
            "type": response.type
        })
        
        # 查询返回Tool对象
        result = await db.execute(
            select(Tool).where(Tool.tool_id == response.tool_id)
        )
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"创建工具失败: {e}")
        return None


async def delete_test_tool(
    db: AsyncSession,
    tool_id: str,
    user: User,
    should_succeed: bool = True
) -> bool:
    """删除测试工具"""
    service = DeveloperToolService()
    
    try:
        result = await service.delete_tool(db, tool_id, user)
        logger.success(f"删除工具成功: {tool_id}", result)
        
        if not should_succeed:
            logger.error("预期删除应该失败，但实际成功了！")
            return False
        return True
    except Exception as e:
        error_msg = str(e)
        if "403" in error_msg or "无权限" in error_msg:
            if should_succeed:
                logger.error(f"删除工具失败（权限不足）: {error_msg}")
                return False
            else:
                logger.success(f"权限验证正确：无权限删除其他开发者的工具")
                return True
        else:
            logger.error(f"删除工具失败: {error_msg}")
            return False


async def verify_tool_not_exists(db: AsyncSession, tool_id: str) -> bool:
    """验证工具已被删除"""
    result = await db.execute(
        select(Tool).where(Tool.tool_id == tool_id)
    )
    tool = result.scalar_one_or_none()
    
    if tool:
        logger.error(f"验证失败：工具仍然存在 - {tool_id}")
        return False
    else:
        logger.success(f"验证成功：工具已被删除 - {tool_id}")
        return True


async def cleanup_test_data(db: AsyncSession):
    """清理测试数据"""
    logger.step("清理测试数据")
    
    # 删除测试工具
    result = await db.execute(
        select(Tool).where(Tool.name.like("自动化测试工具%"))
    )
    tools = result.scalars().all()
    
    for tool in tools:
        await db.delete(tool)
        logger.info(f"删除测试工具: {tool.tool_id}")
    
    # 删除测试用户
    for account_info in TEST_ACCOUNTS.values():
        result = await db.execute(
            select(User).where(User.username == account_info["username"])
        )
        user = result.scalar_one_or_none()
        if user:
            await db.delete(user)
            logger.info(f"删除测试用户: {account_info['username']}")
    
    await db.commit()
    logger.success("测试数据清理完成")


# ==================== 测试场景 ====================

async def test_scenario_1_basic_lifecycle():
    """
    测试场景1: 基础工具生命周期
    - 开发者创建工具
    - 开发者删除自己的工具
    """
    logger.step("测试场景1: 基础工具生命周期")
    
    async for db in get_async_db_session():
        try:
            # 1. 准备测试用户
            dev1 = await ensure_test_user(db, TEST_ACCOUNTS["dev1"])
            
            # 2. 开发者1创建工具
            logger.info(f"步骤1: {dev1.username} 创建工具...")
            tool1 = await create_test_tool(
                db, dev1,
                "自动化测试工具-基础生命周期",
                "这是一个用于测试基础生命周期的工具。当用户说'测试生命周期'时使用。适用于自动化测试场景。"
            )
            
            if not tool1:
                logger.error("场景1失败：无法创建工具")
                return False
            
            # 3. 开发者1删除自己的工具
            logger.info(f"步骤2: {dev1.username} 删除自己的工具...")
            delete_success = await delete_test_tool(db, tool1.tool_id, dev1, should_succeed=True)
            
            if not delete_success:
                logger.error("场景1失败：无法删除自己的工具")
                return False
            
            # 4. 验证工具已被删除
            logger.info("步骤3: 验证工具已被删除...")
            verify_success = await verify_tool_not_exists(db, tool1.tool_id)
            
            if verify_success:
                logger.success("✅ 场景1测试通过")
                return True
            else:
                logger.error("❌ 场景1测试失败")
                return False
                
        except Exception as e:
            logger.error(f"场景1异常: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            break


async def test_scenario_2_cross_developer_permission():
    """
    测试场景2: 跨开发者权限验证
    - 开发者1创建工具
    - 开发者2尝试删除开发者1的工具（应该失败）
    - 开发者1删除自己的工具（应该成功）
    """
    logger.step("测试场景2: 跨开发者权限验证")
    
    async for db in get_async_db_session():
        try:
            # 1. 准备测试用户
            dev1 = await ensure_test_user(db, TEST_ACCOUNTS["dev1"])
            dev2 = await ensure_test_user(db, TEST_ACCOUNTS["dev2"])
            
            # 2. 开发者1创建工具
            logger.info(f"步骤1: {dev1.username} 创建工具...")
            tool1 = await create_test_tool(
                db, dev1,
                "自动化测试工具-权限验证",
                "这是一个用于测试权限验证的工具。当用户说'测试权限'时使用。适用于权限测试场景。"
            )
            
            if not tool1:
                logger.error("场景2失败：无法创建工具")
                return False
            
            # 3. 开发者2尝试删除开发者1的工具（应该失败）
            logger.info(f"步骤2: {dev2.username} 尝试删除 {dev1.username} 的工具...")
            delete_failed = await delete_test_tool(
                db, tool1.tool_id, dev2, should_succeed=False
            )
            
            if not delete_failed:
                logger.error("场景2失败：权限验证不正确")
                return False
            
            # 4. 验证工具仍然存在
            result = await db.execute(
                select(Tool).where(Tool.tool_id == tool1.tool_id)
            )
            tool_still_exists = result.scalar_one_or_none() is not None
            
            if not tool_still_exists:
                logger.error("场景2失败：工具被错误删除")
                return False
            
            logger.success("权限验证通过：工具仍然存在")
            
            # 5. 开发者1删除自己的工具（应该成功）
            logger.info(f"步骤3: {dev1.username} 删除自己的工具...")
            delete_success = await delete_test_tool(db, tool1.tool_id, dev1, should_succeed=True)
            
            if not delete_success:
                logger.error("场景2失败：所有者无法删除自己的工具")
                return False
            
            # 6. 验证工具已被删除
            verify_success = await verify_tool_not_exists(db, tool1.tool_id)
            
            if verify_success:
                logger.success("✅ 场景2测试通过")
                return True
            else:
                logger.error("❌ 场景2测试失败")
                return False
                
        except Exception as e:
            logger.error(f"场景2异常: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            break


async def test_scenario_3_admin_permission():
    """
    测试场景3: 管理员权限验证
    - 开发者1创建工具
    - 管理员删除开发者1的工具（应该成功）
    """
    logger.step("测试场景3: 管理员权限验证")
    
    async for db in get_async_db_session():
        try:
            # 1. 准备测试用户
            dev1 = await ensure_test_user(db, TEST_ACCOUNTS["dev1"])
            admin = await ensure_test_user(db, TEST_ACCOUNTS["admin"])
            
            # 2. 开发者1创建工具
            logger.info(f"步骤1: {dev1.username} 创建工具...")
            tool1 = await create_test_tool(
                db, dev1,
                "自动化测试工具-管理员权限",
                "这是一个用于测试管理员权限的工具。当用户说'测试管理员'时使用。适用于管理员测试场景。"
            )
            
            if not tool1:
                logger.error("场景3失败：无法创建工具")
                return False
            
            # 3. 管理员删除开发者1的工具（应该成功）
            logger.info(f"步骤2: {admin.username} (管理员) 删除 {dev1.username} 的工具...")
            delete_success = await delete_test_tool(db, tool1.tool_id, admin, should_succeed=True)
            
            if not delete_success:
                logger.error("场景3失败：管理员无法删除工具")
                return False
            
            # 4. 验证工具已被删除
            verify_success = await verify_tool_not_exists(db, tool1.tool_id)
            
            if verify_success:
                logger.success("✅ 场景3测试通过")
                return True
            else:
                logger.error("❌ 场景3测试失败")
                return False
                
        except Exception as e:
            logger.error(f"场景3异常: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            break


# ==================== 主测试流程 ====================

async def main():
    """主测试流程"""
    print("\n" + "="*70)
    print("🧪 开发者工具生命周期测试")
    print("="*70)
    print(f"📅 开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    test_results = []
    
    try:
        # 清理旧的测试数据
        async for db in get_async_db_session():
            try:
                await cleanup_test_data(db)
            finally:
                break
        
        # 运行测试场景
        logger.step("开始执行测试场景")
        
        # 场景1: 基础生命周期
        result1 = await test_scenario_1_basic_lifecycle()
        test_results.append(("场景1: 基础工具生命周期", result1))
        
        # 场景2: 跨开发者权限验证
        result2 = await test_scenario_2_cross_developer_permission()
        test_results.append(("场景2: 跨开发者权限验证", result2))
        
        # 场景3: 管理员权限验证
        result3 = await test_scenario_3_admin_permission()
        test_results.append(("场景3: 管理员权限验证", result3))
        
    except Exception as e:
        logger.error(f"测试流程异常: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 最终清理
        async for db in get_async_db_session():
            try:
                await cleanup_test_data(db)
            finally:
                break
    
    # 输出测试结果
    print("\n" + "="*70)
    print("📊 测试结果汇总")
    print("="*70)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for scenario, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} | {scenario}")
    
    print("="*70)
    print(f"总计: {passed}/{total} 通过 ({passed/total*100:.1f}%)")
    print(f"📅 结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    # 保存日志
    logger.save_to_file()
    
    # 返回退出码
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    asyncio.run(main())






