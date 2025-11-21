import json
import pytest
import httpx

from app.services.execute_service import ExecuteService


class _PatchedAsyncClient:
    def __init__(self, response_factory):
        self._response_factory = response_factory
        self._client = None

    async def __aenter__(self):
        self._client = self
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers=None, json=None):
        return self._response_factory(url, headers or {}, json or {})


def _success_response(url, headers, payload, body=None):
    data = body or {"ok": True, "echo": payload}
    return httpx.Response(200, request=httpx.Request("POST", url), content=json.dumps(data).encode("utf-8"))


def _error_response(url, headers, payload, status_code=400, body_json=None):
    body = body_json or {"code": "not_chat_app", "message": "not chat app"}
    return httpx.Response(status_code, request=httpx.Request("POST", url), content=json.dumps(body).encode("utf-8"))


@pytest.mark.parametrize("app_type,endpoint_path", [
    ("chat", "/chat-messages"),
    ("workflow", "/workflows/run"),
    ("agent", "/agent/chat"),
    ("completion", "/completion-messages"),
])
def test_execute_http_in_memory_dify_success(monkeypatch, app_type, endpoint_path):
    svc = ExecuteService()

    def factory(url, headers, payload):
        assert endpoint_path in url
        return _success_response(url, headers, payload)

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: _PatchedAsyncClient(factory))

    endpoint_config = {
        "platform": "dify",
        "api_key": "app-xxxx",
        "base_url": "https://api.dify.ai/v1",
        "app_type": app_type,
    }
    test_data = {"query": "hi", "inputs": {}}

    result = pytest.run(async_fn=lambda: svc._execute_http_in_memory(endpoint_config, test_data))
    # Fallback if pytest.run not available: use asyncio
    if result is None:
        import asyncio
        result = asyncio.run(svc._execute_http_in_memory(endpoint_config, test_data))

    assert result["success"] is True
    assert isinstance(result.get("result"), dict)


def test_execute_http_in_memory_dify_error_details(monkeypatch):
    svc = ExecuteService()

    def factory(url, headers, payload):
        return _error_response(url, headers, payload, 400, {"code": "not_chat_app", "message": "not chat app"})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: _PatchedAsyncClient(factory))

    endpoint_config = {
        "platform": "dify",
        "api_key": "app-xxxx",
        "base_url": "https://api.dify.ai/v1",
        "app_type": "chat",
    }
    test_data = {"query": "hi", "inputs": {}}

    import asyncio
    result = asyncio.run(svc._execute_http_in_memory(endpoint_config, test_data))

    assert result["success"] is False
    assert "error" in result and "Dify" in result["error"]
    details = result.get("details") or {}
    assert details.get("platform") == "dify"
    assert details.get("status") == 400
    assert "/chat-messages" in details.get("endpoint", "")
    assert details.get("hint")


def test_execute_http_in_memory_specific_tool_id(monkeypatch):
    svc = ExecuteService()

    def factory(url, headers, payload):
        return _success_response(url, headers, payload, body={"tool_id": "dify_1763278917_ade7323f", "ok": True})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: _PatchedAsyncClient(factory))

    endpoint_config = {
        "platform": "dify",
        "api_key": "app-xxxx",
        "base_url": "https://api.dify.ai/v1",
        "app_type": "chat",
    }
    test_data = {"query": "hi", "inputs": {}}

    import asyncio
    result = asyncio.run(svc._execute_http_in_memory(endpoint_config, test_data))

    assert result["success"] is True
    assert result["result"].get("tool_id") == "dify_1763278917_ade7323f"