"""内置工具：不依赖第三方密钥、我们自己能保证可靠的几项能力。

每个工具是一个 async 函数，参数即 JSON Schema 里的字段，返回可 JSON 序列化的对象。
"""

from __future__ import annotations

import ast
import json
import operator
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

# ---------- 时间 ----------


async def get_time(timezone: str = "Asia/Shanghai") -> dict:
    now = datetime.now(ZoneInfo(timezone))
    weekdays = "一二三四五六日"
    return {
        "timezone": timezone,
        "datetime": now.strftime("%Y-%m-%d %H:%M"),
        "weekday": "星期" + weekdays[now.weekday()],
    }


# ---------- 计算 ----------

_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("指数太大")
        return _OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    raise ValueError("只支持数字和 + - * / // % ** 括号")


async def calculate(expression: str) -> dict:
    expr = expression.replace("×", "*").replace("÷", "/").replace("^", "**")
    value = _eval(ast.parse(expr, mode="eval"))
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return {"expression": expression, "result": value}


# ---------- 天气（Open-Meteo，免密钥） ----------

_WMO = {
    0: "晴", 1: "大致晴", 2: "多云", 3: "阴", 45: "雾", 48: "雾凇",
    51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
    71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "较强阵雨", 82: "强阵雨",
    95: "雷雨", 96: "雷雨伴冰雹", 99: "强雷雨伴冰雹",
}


async def get_weather(city: str, days: int = 1) -> dict:
    days = max(1, min(int(days), 7))
    async with httpx.AsyncClient(timeout=8) as client:
        geo = (
            await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": city, "count": 1, "language": "zh"},
            )
        ).json()
        if not geo.get("results"):
            return {"error": f"找不到城市：{city}"}
        place = geo["results"][0]
        fc = (
            await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": place["latitude"],
                    "longitude": place["longitude"],
                    "current": "temperature_2m,weather_code,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                    "timezone": "auto",
                    "forecast_days": days,
                },
            )
        ).json()
    cur, d = fc["current"], fc["daily"]
    return {
        "city": place.get("name", city),
        "now": {
            "temperature_c": cur["temperature_2m"],
            "weather": _WMO.get(cur["weather_code"], "未知"),
            "wind_kmh": cur["wind_speed_10m"],
        },
        "daily": [
            {
                "date": d["time"][i],
                "weather": _WMO.get(d["weather_code"][i], "未知"),
                "min_c": d["temperature_2m_min"][i],
                "max_c": d["temperature_2m_max"][i],
                "rain_chance_pct": d["precipitation_probability_max"][i],
            }
            for i in range(len(d["time"]))
        ],
    }


# ---------- 备忘（写操作示例，需确认） ----------


class MemoStore:
    def __init__(self, path: Path):
        self.path = path

    async def save_memo(self, text: str) -> dict:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        item = {"time": datetime.now().isoformat(timespec="seconds"), "text": text}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
        return {"saved": True, **item}

    async def list_memos(self, limit: int = 5) -> dict:
        if not self.path.exists():
            return {"memos": []}
        lines = self.path.read_text(encoding="utf-8").splitlines()
        return {"memos": [json.loads(x) for x in lines[-max(1, int(limit)):]]}
