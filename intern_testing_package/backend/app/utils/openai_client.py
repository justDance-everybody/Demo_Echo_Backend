import os
import json
from typing import Dict, List, Any, Optional, Union
import asyncio
from openai import AsyncOpenAI
from loguru import logger
from app.config import settings
from app.schemas.intent import IntentData, Entity

class OpenAIClientError(Exception):
    """与LLM交互的客户端错误"""
    pass

class OpenAIClient:
    """与LLM交互的客户端 (兼容OpenAI SDK)"""
    
    # @stable(tested=basic_connectivity, date=2025-04-30)
    def __init__(self):
        """初始化LLM客户端"""
        api_key = settings.LLM_API_KEY or os.getenv("LLM_API_KEY")
        api_base = settings.LLM_API_BASE or os.getenv("LLM_API_BASE")
        
        if not api_key:
            raise OpenAIClientError("未配置LLM_API_KEY环境变量")
            
        config = {
            "api_key": api_key,
            "timeout": float(settings.LLM_TIMEOUT),  # 使用配置的超时时间
        }
        
        if api_base:
            config["base_url"] = api_base
            
        self.client = AsyncOpenAI(**config)
        self.model = settings.LLM_MODEL
        logger.info(f"LLM客户端初始化成功，使用模型: {self.model}")
                
        # 定义各种系统提示模板
        self.tool_confirmation_prompt = """
        基于用户的原始请求，生成一个简洁明了的确认文本，用于向用户确认你已正确理解他们的意图。确认文本应该：
        1. 简明扼要地复述用户的原始请求
        2. 包含用户提到的关键信息（如地点、时间、操作类型等）
        3. 使用"您想要..."或"您需要..."等用户视角的表述
        4. 不要提及任何工具名称或技术细节
        5. 不要暗示你将如何处理请求或使用什么工具
        6. 是一个简短的单句话问句，以问号结尾
        
        例如：
        - 用户请求："帮我查一下明天上海的天气"
        - 好的确认文本："您想要查询明天上海的天气情况吗？"
        - 不好的确认文本："我将调用天气API为您查询明天上海的天气。"
        """
                
        self.intent_system_prompt = """
        你是一个高级意图识别和分析系统。你需要从用户的自然语言输入中提取意图和实体，并给出详细的分析。
        输出格式必须是JSON，包含以下字段：
        - intent: 意图类型（字符串）
        - confidence: 置信度（0-1之间的浮点数）
        - entities: 识别到的实体列表（每个实体包含type, value, start, end字段）
        - query_paraphrase: 查询的改写形式（字符串）
        - required_tools: 所需工具列表（字符串数组）
        - analysis: 分析解释（字符串）

        可能的意图类型包括但不限于：
        - 查询天气
        - 查询路线
        - 搜索信息
        - 设置提醒
        - 日程安排

        可能的实体类型包括但不限于：
        - 地点
        - 时间
        - 人物
        - 事件
        - 数量
        """
    
    async def extract_intent(self, query: str) -> Dict[str, Any]:
        """
        从用户查询中提取意图
        
        Args:
            query: 用户查询
            
        Returns:
            意图分析结果
        """
        try:
            # 创建对话消息
            messages = [
                {"role": "system", "content": self.intent_system_prompt},
                {"role": "user", "content": query}
            ]
            
            # 调用LLM API
            logger.info(f"调用LLM API分析意图: {query}")
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                timeout=float(settings.LLM_TIMEOUT)  # 设置单次请求的超时
            )
            
            # 解析响应
            response_content = response.choices[0].message.content
            
            # 处理响应内容，确保它符合我们的IntentData模型
            intent_data = json.loads(response_content)
            
            # 验证响应包含所需字段
            required_fields = ["intent", "confidence", "entities", "query_paraphrase", "required_tools", "analysis"]
            for field in required_fields:
                if field not in intent_data:
                    intent_data[field] = "" if field != "entities" and field != "required_tools" else []
                    if field == "confidence":
                        intent_data[field] = 0.0
            
            # 验证并转换实体格式
            entities = []
            for entity in intent_data.get("entities", []):
                if all(k in entity for k in ["type", "value", "start", "end"]):
                    entities.append(entity)
            intent_data["entities"] = entities
            
            # 日志记录
            logger.info(f"意图分析结果: {intent_data}")
            
            return intent_data
            
        except Exception as e:
            logger.error(f"调用LLM API失败: {e}")
            # 返回默认意图数据
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "entities": [],
                "query_paraphrase": query,
                "required_tools": [],
                "analysis": f"意图分析失败: {str(e)}"
            }

# 创建全局LLM客户端实例
openai_client = OpenAIClient() 