import sys
import asyncio
import json

sys.path.insert(0, '/home/devbox/project/Backend/backend')

from app.utils.db import get_async_db_session
from app.services.dev_tool_service import dev_tool_service
from app.models.user import User


async def main():
    async for db in get_async_db_session():
        current_user = User(id=999999, username='testdev', role='developer')
        config = {
            "name": "Dify测试工具",
            "type": "http",
            "description": "用于测试Dify应用连通性与多类型自适应验证",
            "endpoint": {
                "platform": "dify",
                "api_key": "app-zU3COjz5BhktlvqqoyaEgiBz",
                "base_url": "https://api.dify.ai/v1"
            }
        }
        test_data = {"query": "你好"}
        result = await dev_tool_service.validate_and_test_config(db, config, test_data, current_user)
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
        break


if __name__ == "__main__":
    asyncio.run(main())