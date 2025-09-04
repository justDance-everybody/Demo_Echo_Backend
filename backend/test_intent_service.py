#!/usr/bin/env python3
"""
意图处理服务测试脚本
用于调试意图处理函数中的错误
"""

import sys
import os
import asyncio
from typing import Dict, List, Any, Optional

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.services.intent_service import IntentService
from app.services.execute_service import ExecuteService
from app.config import settings
from loguru import logger

class IntentServiceTester:
    """意图服务测试器"""
    
    def __init__(self):
        self.db_engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.db_engine)
        
        # 创建异步引擎 - 使用aiosqlite驱动
        async_db_url = settings.DATABASE_URL.replace('sqlite:///', 'sqlite+aiosqlite:///')
        self.async_db_engine = create_async_engine(async_db_url)
        
    async def test_openai_connection(self):
        """测试OpenAI连接"""
        logger.info("测试OpenAI连接...")
        
        try:
            from app.utils.openai_client import openai_client
            
            # 测试基本连接
            test_response = await openai_client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            logger.info(f"OpenAI连接成功！响应: {test_response}")
            logger.info(f"响应类型: {type(test_response)}")
            logger.info(f"响应属性: {dir(test_response)}")
            
            if hasattr(test_response, 'choices'):
                logger.info(f"choices长度: {len(test_response.choices)}")
                if test_response.choices:
                    logger.info(f"第一个choice: {test_response.choices[0]}")
                    logger.info(f"第一个choice类型: {type(test_response.choices[0])}")
                    logger.info(f"第一个choice属性: {dir(test_response.choices[0])}")
                    
                    if hasattr(test_response.choices[0], 'message'):
                        logger.info(f"message: {test_response.choices[0].message}")
                        logger.info(f"message类型: {type(test_response.choices[0].message)}")
                        logger.info(f"message属性: {dir(test_response.choices[0].message)}")
            
            return True
            
        except Exception as e:
            logger.error(f"OpenAI连接测试失败: {e}")
            logger.exception("详细错误信息:")
            return False
    
    async def test_get_available_tools(self):
        """测试获取可用工具"""
        logger.info("测试获取可用工具...")
        
        try:
            # 创建异步会话
            async with AsyncSession(self.async_db_engine) as db:
                intent_service = IntentService()
                tools = await intent_service._get_available_tools(db)
                
                logger.info(f"获取到 {len(tools)} 个工具")
                for i, tool in enumerate(tools[:5]):  # 只显示前5个
                    logger.info(f"工具 {i+1}: {tool}")
                
                return tools
                
        except Exception as e:
            logger.error(f"获取工具测试失败: {e}")
            logger.exception("详细错误信息:")
            return []
    
    async def test_process_intent_simple(self):
        """测试简单意图处理"""
        logger.info("测试简单意图处理...")
        
        try:
            async with AsyncSession(self.async_db_engine) as db:
                intent_service = IntentService()
                
                # 测试简单查询
                test_query = "你好"
                logger.info(f"测试查询: {test_query}")
                
                result = await intent_service.process_intent(
                    query=test_query,
                    db=db,
                    session_id="test_session_001",
                    user_id=1
                )
                
                logger.info(f"意图处理结果: {result}")
                return result
                
        except Exception as e:
            logger.error(f"意图处理测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_process_intent_with_tools(self):
        """测试需要工具调用的意图处理"""
        logger.info("测试需要工具调用的意图处理...")
        
        try:
            async with AsyncSession(self.async_db_engine) as db:
                intent_service = IntentService()
                
                # 测试需要工具调用的查询
                test_query = "查询当前时间"
                logger.info(f"测试查询: {test_query}")
                
                result = await intent_service.process_intent(
                    query=test_query,
                    db=db,
                    session_id="test_session_002",
                    user_id=1
                )
                
                logger.info(f"意图处理结果: {result}")
                return result
                
        except Exception as e:
            logger.error(f"意图处理测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_solana_account_query(self):
        """测试Solana账户查询意图处理和执行"""
        logger.info("测试Solana账户查询意图处理和执行...")
        
        try:
            async with AsyncSession(self.async_db_engine) as db:
                intent_service = IntentService()
                execute_service = ExecuteService()
                
                # 测试查询Solana账户信息的意图 - 使用有效的Solana地址
                test_query = "查询sol链上这个地址的账户信息：7Ts3yn7mUbaR1YFDkLgPAXQVXB7NSMV1fNFbrnZskayf"
                logger.info(f"测试查询: {test_query}")
                
                # 1. 意图识别
                intent_result = await intent_service.process_intent(
                    query=test_query,
                    db=db,
                    session_id="test_solana_session",
                    user_id=1
                )
                
                logger.info(f"Solana账户查询意图处理结果: {intent_result}")
                
                # 2. 检查意图识别结果
                if intent_result and isinstance(intent_result, dict):
                    logger.info("✅ Solana账户查询意图处理成功")
                    
                    # 检查是否识别出正确的工具
                    if 'tool_calls' in intent_result and intent_result['tool_calls']:
                        logger.info(f"识别出的工具数量: {len(intent_result['tool_calls'])}")
                        
                        # 3. 执行识别出的工具
                        execution_results = []
                        for tool_call in intent_result['tool_calls']:
                            tool_name = tool_call.get('tool_id')
                            tool_args = tool_call.get('parameters', {})
                            
                            logger.info(f"执行Solana查询工具: {tool_name} 参数: {tool_args}")
                            
                            try:
                                # 实际执行工具
                                result = await execute_service.execute_tool(
                                    tool_id=tool_name,
                                    params=tool_args,
                                    db=db,
                                    session_id="test_solana_session",
                                    user_id=1
                                )
                                
                                logger.info(f"✅ 工具 {tool_name} 执行成功")
                                logger.info(f"执行结果: {result}")
                                
                                # 详细分析执行结果
                                logger.info("🔍 详细数据内容:")
                                logger.info(f"  数据类型: {type(result)}")
                                logger.info(f"  数据属性: {dir(result)}")
                                
                                if hasattr(result, 'data') and result.data:
                                    logger.info(f"  数据字段: {result.data}")
                                    # 如果是字典，逐个显示字段
                                    if isinstance(result.data, dict):
                                        for key, value in result.data.items():
                                            logger.info(f"    {key}: {value}")
                                
                                if hasattr(result, 'error') and result.error:
                                    logger.warning(f"⚠️ 执行过程中有错误: {result.error}")
                                
                                execution_results.append({
                                    "tool": tool_name,
                                    "result": result,
                                    "status": "success"
                                })
                                
                            except Exception as e:
                                logger.error(f"❌ 工具 {tool_name} 执行失败: {e}")
                                execution_results.append({
                                    "tool": tool_name,
                                    "error": str(e),
                                    "status": "failed"
                                })
                        
                        # 4. 汇总执行结果
                        logger.info("=" * 50)
                        logger.info("Solana账户查询执行结果汇总:")
                        for result in execution_results:
                            if result["status"] == "success":
                                logger.info(f"✅ {result['tool']}: 执行成功")
                                logger.info(f"   结果类型: {type(result['result'])}")
                                logger.info(f"   结果内容: {result['result']}")
                                
                                # 显示结果的详细信息
                                if hasattr(result['result'], 'data') and result['result'].data:
                                    logger.info(f"   数据内容: {result['result'].data}")
                                if hasattr(result['result'], 'error') and result['result'].error:
                                    logger.warning(f"   错误信息: {result['result'].error}")
                            else:
                                logger.error(f"❌ {result['tool']}: 执行失败 - {result['error']}")
                        
                        return {
                            "intent": intent_result,
                            "execution": execution_results
                        }
                        
                    else:
                        logger.info("⚠️ 未识别出需要调用的工具")
                        return intent_result
                        
                else:
                    logger.warning("❌ Solana账户查询意图处理失败")
                    return intent_result
                
        except Exception as e:
            logger.error(f"Solana账户查询测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_tool_execution(self):
        """测试工具执行"""
        logger.info("测试工具执行...")
        
        try:
            async with AsyncSession(self.async_db_engine) as db:
                execute_service = ExecuteService()
                
                # 测试时间工具执行
                logger.info("测试时间工具执行...")
                time_result = await execute_service.execute_tool(
                    tool_id="current_time",
                    params={},
                    db=db,
                    session_id="test_execution_session",
                    user_id=1
                )
                logger.info(f"时间工具执行结果: {time_result}")
                
                # 测试fetch工具执行
                logger.info("测试fetch工具执行...")
                fetch_result = await execute_service.execute_tool(
                    tool_id="fetch",
                    params={"url": "https://httpbin.org/json"},
                    db=db,
                    session_id="test_execution_session",
                    user_id=1
                )
                logger.info(f"Fetch工具执行结果: {fetch_result}")
                
                return {
                    "time": time_result,
                    "fetch": fetch_result
                }
                
        except Exception as e:
            logger.error(f"工具执行测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_full_workflow(self):
        """测试完整工作流程：意图识别 -> 工具执行 -> 结果汇总"""
        logger.info("测试完整工作流程...")
        
        try:
            async with AsyncSession(self.async_db_engine) as db:
                intent_service = IntentService()
                execute_service = ExecuteService()
                
                # 1. 意图识别
                test_query = "查询当前时间并获取一个网页内容"
                logger.info(f"完整流程测试查询: {test_query}")
                
                intent_result = await intent_service.process_intent(
                    query=test_query,
                    db=db,
                    session_id="test_full_workflow",
                    user_id=1
                )
                
                logger.info(f"意图识别结果: {intent_result}")
                
                # 2. 工具执行
                if intent_result and 'tool_calls' in intent_result:
                    execution_results = []
                    for tool_call in intent_result['tool_calls']:
                        tool_name = tool_call.get('tool_id')
                        tool_args = tool_call.get('parameters', {})
                        
                        logger.info(f"执行工具: {tool_name} 参数: {tool_args}")
                        
                        try:
                            result = await execute_service.execute_tool(
                                tool_id=tool_name,
                                params=tool_args,
                                db=db,
                                session_id="test_full_workflow",
                                user_id=1
                            )
                            execution_results.append({
                                "tool": tool_name,
                                "result": result
                            })
                            logger.info(f"工具 {tool_name} 执行成功")
                        except Exception as e:
                            logger.error(f"工具 {tool_name} 执行失败: {e}")
                            execution_results.append({
                                "tool": tool_name,
                                "error": str(e)
                            })
                    
                    # 3. 结果汇总
                    logger.info("完整工作流程执行结果:")
                    for result in execution_results:
                        if "error" in result:
                            logger.error(f"工具 {result['tool']}: 执行失败 - {result['error']}")
                        else:
                            logger.info(f"工具 {result['tool']}: 执行成功 - {result['result']}")
                    
                    return {
                        "intent": intent_result,
                        "execution": execution_results
                    }
                else:
                    logger.warning("未识别出需要执行的工具")
                    return None
                
        except Exception as e:
            logger.error(f"完整工作流程测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_direct_mcprouter_call(self):
        """直接测试MCPRouter调用 - 对比IntentService调用"""
        logger.info("直接测试MCPRouter调用...")
        
        try:
            import httpx
            
            solana_address = "7Ts3yn7mUbaR1YFDkLgPAXQVXB7NSMV1fNFbrnZskayf"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": "Bearer web3-rpc",
                    "Content-Type": "application/json"
                }
                
                # 直接调用MCPRouter API
                logger.info(f"直接查询Solana地址: {solana_address}")
                response = await client.post(
                    "http://localhost:8028/v1/call-tool",
                    headers=headers,
                    json={
                        "server": "web3-rpc",
                        "Name": "getAccountInfo",
                        "arguments": {
                            "address": solana_address
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ 直接MCPRouter调用成功 (HTTP {response.status_code})")
                    logger.info(f"原始结果: {result}")
                    
                    # 分析结果结构
                    if "data" in result:
                        logger.info(f"数据字段: {result['data']}")
                    if "error" in result:
                        logger.warning(f"错误信息: {result['error']}")
                    
                    return result
                else:
                    logger.error(f"❌ 直接MCPRouter调用失败 (HTTP {response.status_code})")
                    logger.error(f"响应: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"直接MCPRouter调用测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def test_openai_response_structure(self):
        """测试OpenAI响应结构"""
        logger.info("测试OpenAI响应结构...")
        
        try:
            from app.utils.openai_client import openai_client
            
            # 测试带工具的调用
            test_response = await openai_client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": "查询当前时间"}],
                tools=[{
                    "type": "function",
                    "function": {
                        "name": "current_time",
                        "description": "Get the current date and time",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "format": {
                                    "type": "string",
                                    "description": "Time format"
                                }
                            }
                        }
                    }
                }],
                tool_choice="auto",
                max_tokens=100
            )
            
            logger.info(f"OpenAI响应: {test_response}")
            logger.info(f"响应类型: {type(test_response)}")
            
            # 详细检查响应结构
            if hasattr(test_response, 'choices'):
                logger.info(f"choices存在，长度: {len(test_response.choices)}")
                
                for i, choice in enumerate(test_response.choices):
                    logger.info(f"Choice {i}: {choice}")
                    logger.info(f"Choice {i} 类型: {type(choice)}")
                    
                    if hasattr(choice, 'message'):
                        message = choice.message
                        logger.info(f"Message {i}: {message}")
                        logger.info(f"Message {i} 类型: {type(message)}")
                        logger.info(f"Message {i} 属性: {dir(message)}")
                        
                        if hasattr(message, 'content'):
                            logger.info(f"Message {i} content: {message.content}")
                        
                        if hasattr(message, 'tool_calls'):
                            logger.info(f"Message {i} tool_calls: {message.tool_calls}")
            else:
                logger.warning("响应中没有choices属性")
            
            return test_response
            
        except Exception as e:
            logger.error(f"OpenAI响应结构测试失败: {e}")
            logger.exception("详细错误信息:")
            return None
    
    async def run_all_tests(self):
        """运行所有测试"""
        logger.info("开始运行意图服务测试...")
        
        # 测试1: OpenAI连接
        logger.info("=" * 50)
        logger.info("测试1: OpenAI连接")
        openai_ok = await self.test_openai_connection()
        
        if not openai_ok:
            logger.error("OpenAI连接失败，跳过后续测试")
            return
        
        # 测试2: 获取可用工具
        logger.info("=" * 50)
        logger.info("测试2: 获取可用工具")
        tools = await self.test_get_available_tools()
        
        # 测试3: OpenAI响应结构
        logger.info("=" * 50)
        logger.info("测试3: OpenAI响应结构")
        await self.test_openai_response_structure()
        
        # 测试4: 简单意图处理
        logger.info("=" * 50)
        logger.info("测试4: 简单意图处理")
        await self.test_process_intent_simple()
        
        # 测试5: 需要工具的意图处理
        logger.info("=" * 50)
        logger.info("测试5: 需要工具的意图处理")
        await self.test_process_intent_with_tools()
        
        # 测试6: 直接MCPRouter调用 (对比测试)
        logger.info("=" * 50)
        logger.info("测试6: 直接MCPRouter调用 (对比测试)")
        await self.test_direct_mcprouter_call()
        
        # 测试7: Solana账户查询
        logger.info("=" * 50)
        logger.info("测试7: Solana账户查询")
        await self.test_solana_account_query()
        
        # 测试8: 工具执行
        logger.info("=" * 50)
        logger.info("测试8: 工具执行")
        await self.test_tool_execution()
        
        # 测试9: 完整工作流程
        logger.info("=" * 50)
        logger.info("测试9: 完整工作流程")
        await self.test_full_workflow()
        
        logger.info("=" * 50)
        logger.info("所有测试完成！")

async def main():
    """主函数"""
    try:
        tester = IntentServiceTester()
        await tester.run_all_tests()
        print("✅ 测试完成！")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        logger.exception("测试过程中发生错误:")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
