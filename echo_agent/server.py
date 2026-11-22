"""HTTP/WebSocket 入口。

GET  /            网页语音客户端
GET  /health      健康检查
GET  /api/tools   当前启用的工具（需要令牌）
WS   /ws          语音会话（需要令牌）

令牌：设置 ECHO_ACCESS_TOKEN 后，用 ?token=... 或 Authorization: Bearer ... 访问；
没设时只接受本机连接，避免忘配令牌就把模型额度暴露到公网。
"""

from __future__ import annotations

import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from echo_agent.config import ROOT, Settings
from echo_agent.confirm import Executor
from echo_agent.realtime import RealtimeClient
from echo_agent.session import ProviderFactory, VoiceSession
from echo_agent.tools import Registry, load_registry

log = logging.getLogger("echo")
LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}


def _authorized(settings: Settings, host: str | None, headers, query) -> bool:
    if not settings.access_token:
        return host in LOCAL_HOSTS
    got = query.get("token") or headers.get("authorization", "").removeprefix("Bearer ").strip()
    return bool(got) and hmac.compare_digest(got, settings.access_token)


def create_app(settings: Settings | None = None, provider_factory: ProviderFactory | None = None,
               registry: Registry | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    def default_factory():
        if not settings.provider_url or not settings.provider_api_key:
            raise RuntimeError("未配置 ECHO_PROVIDER_URL / ECHO_PROVIDER_API_KEY")
        return RealtimeClient(settings.provider_url, settings.provider_api_key, settings.dialect,
                              settings.model, settings.voice)

    factory = provider_factory or default_factory

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.registry = registry or await load_registry(settings.tools_file, settings.data_dir)
        log.info("已启用工具：%s", [t["name"] for t in app.state.registry.public_list()])
        yield

    app = FastAPI(title="Echo v2", version="2.0.0", lifespan=lifespan)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/")
    async def index():
        return FileResponse(ROOT / "web" / "index.html")

    @app.get("/api/tools")
    async def tools(request: Request):
        host = request.client.host if request.client else None
        if not _authorized(settings, host, request.headers, request.query_params):
            raise HTTPException(401, "需要访问令牌")
        return {"tools": app.state.registry.public_list()}

    @app.websocket("/ws")
    async def ws(websocket: WebSocket):
        host = websocket.client.host if websocket.client else None
        if not _authorized(settings, host, websocket.headers, websocket.query_params):
            await websocket.close(code=4401)
            return
        await websocket.accept()
        executor = Executor(app.state.registry, settings.confirm_ttl_s, settings.tool_timeout_s,
                            settings.tool_output_max_chars)
        try:
            session = VoiceSession(websocket, factory(), executor, settings.instructions, settings.data_dir)
            await session.run()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            log.exception("会话异常")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
                await websocket.close(code=1011)
            except Exception:
                pass

    return app


def main() -> None:
    import os

    import uvicorn

    logging.basicConfig(level=logging.INFO)
    uvicorn.run(create_app(), host=os.environ.get("ECHO_HOST", "127.0.0.1"),
                port=int(os.environ.get("ECHO_PORT", "8000")))


if __name__ == "__main__":
    main()
