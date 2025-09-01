#!/usr/bin/env python3
"""
简化的工具同步脚本
避免复杂的异步MCP连接，直接从配置创建工具记录
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.tool import Tool
from app.config import settings

def sync_amap_tools():
    """同步高德地图工具"""
    # 高德地图工具定义
    amap_tools = [
        {
            'tool_id': 'maps_weather',
            'name': '天气查询',
            'description': '根据城市名称查询天气信息',
            'request_schema': {
                'type': 'object',
                'properties': {
                    'city': {'type': 'string', 'description': '城市名称或adcode'}
                },
                'required': ['city']
            }
        },
        {
            'tool_id': 'maps_geo',
            'name': '地址转坐标',
            'description': '将详细地址转换为经纬度坐标',
            'request_schema': {
                'type': 'object',
                'properties': {
                    'address': {'type': 'string', 'description': '待解析的结构化地址信息'},
                    'city': {'type': 'string', 'description': '指定查询的城市'}
                },
                'required': ['address']
            }
        },
        {
            'tool_id': 'maps_distance',
            'name': '距离测量',
            'description': '测量两个经纬度坐标之间的距离',
            'request_schema': {
                'type': 'object',
                'properties': {
                    'origins': {'type': 'string', 'description': '起点经度，纬度'},
                    'destination': {'type': 'string', 'description': '终点经度，纬度'},
                    'type': {'type': 'string', 'description': '距离测量类型,1驾车,0直线,3步行'}
                },
                'required': ['origins', 'destination']
            }
        },
        {
            'tool_id': 'maps_text_search',
            'name': '关键词搜索',
            'description': '根据关键词搜索相关POI',
            'request_schema': {
                'type': 'object',
                'properties': {
                    'keywords': {'type': 'string', 'description': '搜索关键词'},
                    'city': {'type': 'string', 'description': '查询城市'}
                },
                'required': ['keywords']
            }
        }
    ]
    
    # 数据库操作
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        added_count = 0
        updated_count = 0
        
        for tool_def in amap_tools:
            existing = db.query(Tool).filter(
                Tool.tool_id == tool_def['tool_id'],
                Tool.server_name == 'amap-maps'
            ).first()
            
            if existing:
                # 更新现有工具
                existing.name = tool_def['name']
                existing.description = tool_def['description']
                existing.request_schema = tool_def['request_schema']
                existing.status = 'active'
                updated_count += 1
                print(f"更新工具: {tool_def['name']}")
            else:
                # 创建新工具
                tool = Tool(
                    tool_id=tool_def['tool_id'],
                    name=tool_def['name'],
                    type='mcp',
                    description=tool_def['description'],
                    endpoint={
                        'mcp_tool_name': tool_def['tool_id']
                    },
                    request_schema=tool_def['request_schema'],
                    response_schema=None,
                    server_name='amap-maps',
                    is_public=True,
                    status='active',
                    version='1.0.0',
                    tags=['地图', '天气', '工具'],
                    download_count=0
                )
                
                db.add(tool)
                added_count += 1
                print(f"添加工具: {tool_def['name']}")
        
        db.commit()
        print(f"\n同步完成: 新增 {added_count} 个，更新 {updated_count} 个工具")
        
        # 验证结果
        total_tools = db.query(Tool).count()
        print(f"数据库中总计: {total_tools} 个工具")
        
        return True
        
    except Exception as e:
        print(f"同步失败: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("开始同步MCP工具...")
    if sync_amap_tools():
        print("✅ 同步成功!")
    else:
        print("❌ 同步失败!")