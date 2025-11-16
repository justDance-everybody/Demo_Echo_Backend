import sys
import asyncio
import json

sys.path.insert(0, '/home/devbox/project/Backend/backend')

from sqlalchemy.future import select
from app.utils.db import get_async_db_session
from app.services.dev_tool_service import DeveloperToolService
from app.schemas.dev_tools import DeveloperToolCreate
from app.models.user import User
from app.utils.security import get_password_hash


async def ensure_user(db, username: str) -> User:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        username=username,
        password_hash=get_password_hash('Password123!'),
        role='developer',
        is_active=1,
        is_superuser=0,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def main():
    async for db in get_async_db_session():
        user = await ensure_user(db, 'apitester_dev')
        service = DeveloperToolService()

        tool_data = DeveloperToolCreate(
            name="Dify集成测试工具",
            type="http",
            description="用于测试Dify应用提交与自适应类型的端到端工作",
            endpoint={
                "platform": "dify",
                "api_key": "app-zU3COjz5BhktlvqqoyaEgiBz",
                "base_url": "https://api.dify.ai/v1"
            }
        )

        response = await service.create_tool(db, tool_data, user)
        def ser(obj):
            if isinstance(obj, dict):
                return {k: ser(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [ser(x) for x in obj]
            import datetime as dt
            if isinstance(obj, (dt.datetime, dt.date)):
                return obj.isoformat()
            return obj
        print(json.dumps(ser({
            "created_tool": {
                "tool_id": response.tool_id,
                "name": response.name,
                "type": response.type,
                "endpoint": response.endpoint,
                "status": response.status,
                "request_schema": response.request_schema,
                "developer_id": response.developer_id,
                "created_at": response.created_at,
                "updated_at": response.updated_at
            }
        }), ensure_ascii=False, indent=2))

        test_result = await service.test_tool(db, response.tool_id, {"query": "你好"}, user)
        print(json.dumps(ser({
            "test_result": test_result
        }), ensure_ascii=False, indent=2))
        break


if __name__ == "__main__":
    asyncio.run(main())