from typing import Dict, List, Any
from loguru import logger
from app.utils.openai_client import openai_client
from app.utils.mcp_client import mcp_client

class IntentService:
    """意图服务"""
    
    async def process_intent(self, query: str) -> Dict[str, Any]:
        """
        处理用户意图
        
        Args:
            query: 用户查询
            
        Returns:
            处理结果，包含意图和推荐工具
        """
        try:
            # 调用OpenAI API分析意图
            logger.info(f"开始处理意图: {query}")
            intent_data = await openai_client.extract_intent(query)
            
            # 记录结果
            logger.info(f"意图分析结果: {intent_data}")
            
            # 获取推荐工具列表
            recommended_tools = intent_data.get("required_tools", [])
            
            # 检查是否需要调用MCP
            if any(tool.startswith("mcp_") for tool in recommended_tools):
                # 调用MCP API获取额外信息
                try:
                    mcp_response = await mcp_client.get_tool_info(intent_data.get("intent"), query)
                    # 合并MCP响应中的工具信息
                    if mcp_response and "tools" in mcp_response:
                        for tool in mcp_response["tools"]:
                            if tool not in recommended_tools:
                                recommended_tools.append(tool)
                except Exception as e:
                    logger.error(f"调用MCP API失败: {e}")
            
            # 构建结果
            result = {
                "intent": intent_data,
                "tools": recommended_tools
            }
            
            return result
            
        except Exception as e:
            logger.error(f"处理意图失败: {e}")
            # 返回默认结果
            return {
                "intent": {
                    "intent": "unknown",
                    "confidence": 0.0,
                    "entities": [],
                    "query_paraphrase": query,
                    "required_tools": [],
                    "analysis": f"意图处理失败: {str(e)}"
                },
                "tools": []
            }
    
    async def get_tool_executions(self, intent_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        获取意图对应的工具执行计划
        
        Args:
            intent_data: 意图数据
            
        Returns:
            工具执行计划列表
        """
        # 根据意图类型和实体获取工具执行计划
        intent_type = intent_data.get("intent")
        entities = intent_data.get("entities", [])
        
        # 这里可以添加具体的业务逻辑，根据不同意图类型返回不同的工具执行计划
        # 目前简单返回推荐工具列表中的第一个工具
        tools = intent_data.get("required_tools", [])
        if tools:
            return [{
                "tool_id": tools[0],
                "params": {
                    "intent_type": intent_type,
                    "entities": entities
                }
            }]
        
        return []

# 创建全局意图服务实例
intent_service = IntentService() 