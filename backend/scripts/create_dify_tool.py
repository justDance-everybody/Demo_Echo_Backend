#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建Dify工具并入库
"""

import sys
import asyncio
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.future import select
from app.utils.db import get_async_db_session
from app.services.dev_tool_service import dev_tool_service, DeveloperToolService
from app.schemas.dev_tools import DeveloperToolCreate
from app.models.user import User


from app.config import settings
from app.utils.security import get_password_hash

async def get_admin_user(db):
    """获取admin用户，如果不存在则根据配置自动创建"""
    # 优先使用配置的测试管理员用户名，默认为 'admin_user'
    admin_username = settings.TEST_ADMIN_USERNAME or 'admin_user'
    
    result = await db.execute(select(User).where(User.username == admin_username))
    user = result.scalar_one_or_none()
    
    if not user:
        print(f"未找到用户 {admin_username}，正在自动创建...")
        try:
            # 获取配置的密码，若未配置则使用默认安全兜底（仅限开发环境）
            admin_password = settings.TEST_ADMIN_PASSWORD or 'AdminPass123!'
            admin_role = settings.TEST_ADMIN_ROLE or 'admin'
            
            new_user = User(
                username=admin_username,
                password_hash=get_password_hash(admin_password),
                # email 和 full_name 可以为空或设置默认值
                email='admin@example.com',
                full_name='System Admin',
                role=admin_role,
                is_active=1,
                is_superuser=1
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            print(f"✅ 管理员用户 {admin_username} 创建成功")
            return new_user
        except Exception as e:
            print(f"❌ 创建管理员用户失败: {e}")
            raise e
            
    return user


async def test_dify_connectivity():
    """测试Dify连通性"""
    print("=" * 60)
    print("步骤1: 测试Dify API连通性")
    print("=" * 60)

    result_value = False
    async for db in get_async_db_session():
        user = await get_admin_user(db)

        config = {
            "name": "Dify连通性测试工具",
            "type": "http",
            "description": "用于测试Dify平台API的连通性和可用性，验证API密钥是否有效",
            "endpoint": {
                "platform": "dify",
                "api_key": "app-zU3COjz5BhktlvqqoyaEgiBz",
                "base_url": "https://api.dify.ai/v1"
            }
        }
        test_data = {"query": "你好"}

        try:
            result = await dev_tool_service.validate_and_test_config(db, config, test_data, user)

            def serialize(obj):
                if isinstance(obj, dict):
                    return {k: serialize(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [serialize(x) for x in obj]
                import datetime as dt
                if isinstance(obj, (dt.datetime, dt.date)):
                    return obj.isoformat()
                return obj

            print(json.dumps(serialize(result), ensure_ascii=False, indent=2))

            # 判断连通性成功：success=True 且有result数据
            if result.get("success") and result.get("result"):
                print("\n✅ Dify API连通性测试通过！")
                print(f"应用类型：{result['result'].get('mode', 'unknown')}")
                result_value = True
            else:
                print("\n❌ Dify API连通性测试失败")
                result_value = False
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            result_value = False
        finally:
            break

    return result_value


async def create_dify_tool():
    """创建Dify工具"""
    print("\n" + "=" * 60)
    print("步骤2: 创建Dify工具")
    print("=" * 60)

    result_value = False
    async for db in get_async_db_session():
        user = await get_admin_user(db)
        service = DeveloperToolService()

        tool_data = DeveloperToolCreate(
            name="Dify智能助手",
            type="http",
            description="通用Dify平台智能对话工具，支持多轮对话、信息查询、内容生成等功能。适用于回答问题、查询信息、内容创作等各类场景。",
            endpoint={
                "platform": "dify",
                "api_key": "app-zU3COjz5BhktlvqqoyaEgiBz",
                "base_url": "https://api.dify.ai/v1"
            },
            request_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "要查询的新闻网站或关键词"
                    }
                },
                "required": []
            }
        )

        try:
            response = await service.create_tool(db, tool_data, user)

            print(f"\n✅ 工具创建成功！")
            print(f"工具ID: {response.tool_id}")
            print(f"工具名称: {response.name}")
            print(f"工具状态: {response.status}")

            # 测试工具
            print("\n" + "=" * 60)
            print("步骤3: 测试Dify工具")
            print("=" * 60)

            test_params = {"query": "你好，请介绍一下你自己"}
            test_result = await service.test_tool(db, response.tool_id, test_params, user)

            def serialize(obj):
                if isinstance(obj, dict):
                    return {k: serialize(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [serialize(x) for x in obj]
                import datetime as dt
                if isinstance(obj, (dt.datetime, dt.date)):
                    return obj.isoformat()
                return obj

            print(f"\n测试结果:")
            print(json.dumps(serialize(test_result), ensure_ascii=False, indent=2))

            result_value = True
        except Exception as e:
            print(f"\n❌ 创建工具失败: {e}")
            import traceback
            traceback.print_exc()
            result_value = False
        finally:
            break

    return result_value


async def main():
    # 1. 测试Dify连通性
    connectivity_ok = await test_dify_connectivity()

    if not connectivity_ok:
        print("\n⚠️  Dify API连通性测试失败，无法继续")
        return

    # 2. 创建Dify工具
    await create_dify_tool()


if __name__ == "__main__":
    asyncio.run(main())
