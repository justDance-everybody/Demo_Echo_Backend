"""用官方 SDK 起一个本地 Streamable HTTP MCP 服务，验证远程工具的加载、放行和调用。"""

import socket
import subprocess
import sys
import textwrap
import time

import pytest

from echo_agent.mcp_remote import load_mcp_tools
from echo_agent.tools import _expand_env

SERVER = textwrap.dedent(
    """
    import sys
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("demo", port=int(sys.argv[1]), log_level="WARNING")

    @mcp.tool()
    def add(a: int, b: int) -> int:
        "两数相加"
        return a + b

    @mcp.tool()
    def wipe_disk() -> str:
        "不该被放行的工具"
        return "wiped"

    mcp.run(transport="streamable-http")
    """
)


@pytest.fixture(scope="module")
def mcp_url(tmp_path_factory):
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    script = tmp_path_factory.mktemp("mcp") / "server.py"
    script.write_text(SERVER)
    proc = subprocess.Popen([sys.executable, str(script), str(port)])
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            break
        except OSError:
            time.sleep(0.1)
    yield f"http://127.0.0.1:{port}/mcp"
    proc.terminate()
    proc.wait(5)


async def test_allowlist_and_call(mcp_url, monkeypatch):
    monkeypatch.setenv("DEMO_URL", mcp_url)
    tools = await load_mcp_tools(
        {"name": "demo", "url": "${DEMO_URL}", "prefix": "demo_", "allow": ["add"]}, _expand_env
    )
    assert [t.name for t in tools] == ["demo_add"]
    assert tools[0].source == "mcp:demo" and "a" in tools[0].parameters["properties"]
    result = await tools[0].call({"a": 2, "b": 3})
    assert result in (5, {"result": 5})


async def test_allow_list_required(mcp_url):
    with pytest.raises(ValueError, match="allow"):
        await load_mcp_tools({"name": "demo", "url": mcp_url}, _expand_env)
    with pytest.raises(ValueError, match="没有这些工具"):
        await load_mcp_tools({"name": "demo", "url": mcp_url, "allow": ["nope"]}, _expand_env)


def test_missing_env_var_fails_loudly():
    with pytest.raises(KeyError):
        _expand_env("https://x/${DEFINITELY_NOT_SET_123}")
