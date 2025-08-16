from typing import Dict, Any, Optional, List
import json
import zipfile
import tarfile
import tempfile
import os
from pathlib import Path
import logging
from datetime import datetime

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import Tool
from app.models.user import User
from app.schemas.dev_tools import DeveloperToolCreate
from app.services.dev_tool_service import DeveloperToolService

logger = logging.getLogger(__name__)

class PackageParserService:
    """工具包解析服务"""
    
    def __init__(self):
        self.dev_tool_service = DeveloperToolService()
        self.supported_formats = ['.zip', '.tar', '.tar.gz', '.tgz']
        self.required_manifest_fields = ['name', 'version', 'description', 'type']
    
    async def parse_and_create_tools(
        self,
        file: UploadFile,
        db: AsyncSession,
        current_user: User
    ) -> Dict[str, Any]:
        """
        解析工具包并创建工具记录
        
        Args:
            file: 上传的文件
            db: 数据库会话
            current_user: 当前用户
            
        Returns:
            解析结果
        """
        try:
            # 验证文件格式
            if not self._is_supported_format(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的文件格式。支持的格式: {', '.join(self.supported_formats)}"
                )
            
            # 创建临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                # 保存上传的文件
                file_path = Path(temp_dir) / file.filename
                with open(file_path, 'wb') as f:
                    content = await file.read()
                    f.write(content)
                
                # 解压文件
                extract_dir = Path(temp_dir) / 'extracted'
                extract_dir.mkdir()
                
                if file.filename.endswith('.zip'):
                    self._extract_zip(file_path, extract_dir)
                elif any(file.filename.endswith(ext) for ext in ['.tar', '.tar.gz', '.tgz']):
                    self._extract_tar(file_path, extract_dir)
                
                # 查找并解析manifest.json
                manifest_path = self._find_manifest(extract_dir)
                if not manifest_path:
                    raise HTTPException(
                        status_code=400,
                        detail="工具包中未找到manifest.json文件"
                    )
                
                manifest_data = self._parse_manifest(manifest_path)
                
                # 验证manifest格式
                self._validate_manifest(manifest_data)
                
                # 创建工具记录
                tools_created = []
                
                # 如果manifest包含多个工具
                if 'tools' in manifest_data:
                    for tool_data in manifest_data['tools']:
                        tool = await self._create_tool_from_manifest(
                            tool_data, db, current_user, extract_dir
                        )
                        tools_created.append(tool)
                else:
                    # 单个工具
                    tool = await self._create_tool_from_manifest(
                        manifest_data, db, current_user, extract_dir
                    )
                    tools_created.append(tool)
                
                logger.info(f"成功解析工具包，创建了 {len(tools_created)} 个工具")
                
                return {
                    "success": True,
                    "tools_created": len(tools_created),
                    "tools": [{
                        "tool_id": tool.tool_id,
                        "name": tool.name,
                        "version": tool.version
                    } for tool in tools_created],
                    "message": f"成功解析工具包，创建了 {len(tools_created)} 个工具"
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"解析工具包时发生错误: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"解析工具包时发生错误: {str(e)}"
            )
    
    async def validate_package(
        self,
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        验证工具包格式
        
        Args:
            file: 上传的文件
            
        Returns:
            验证结果
        """
        try:
            warnings = []
            
            # 验证文件格式
            if not self._is_supported_format(file.filename):
                return {
                    "valid": False,
                    "message": f"不支持的文件格式。支持的格式: {', '.join(self.supported_formats)}",
                    "tools_found": 0,
                    "warnings": warnings
                }
            
            # 创建临时目录进行验证
            with tempfile.TemporaryDirectory() as temp_dir:
                # 保存上传的文件
                file_path = Path(temp_dir) / file.filename
                with open(file_path, 'wb') as f:
                    content = await file.read()
                    f.write(content)
                
                # 解压文件
                extract_dir = Path(temp_dir) / 'extracted'
                extract_dir.mkdir()
                
                try:
                    if file.filename.endswith('.zip'):
                        self._extract_zip(file_path, extract_dir)
                    elif any(file.filename.endswith(ext) for ext in ['.tar', '.tar.gz', '.tgz']):
                        self._extract_tar(file_path, extract_dir)
                except Exception as e:
                    return {
                        "valid": False,
                        "message": f"无法解压文件: {str(e)}",
                        "tools_found": 0,
                        "warnings": warnings
                    }
                
                # 查找manifest.json
                manifest_path = self._find_manifest(extract_dir)
                if not manifest_path:
                    return {
                        "valid": False,
                        "message": "工具包中未找到manifest.json文件",
                        "tools_found": 0,
                        "warnings": warnings
                    }
                
                # 解析manifest
                try:
                    manifest_data = self._parse_manifest(manifest_path)
                except Exception as e:
                    return {
                        "valid": False,
                        "message": f"manifest.json格式错误: {str(e)}",
                        "tools_found": 0,
                        "warnings": warnings
                    }
                
                # 验证manifest格式
                try:
                    self._validate_manifest(manifest_data)
                except Exception as e:
                    warnings.append(str(e))
                
                # 计算工具数量
                tools_found = 1
                if 'tools' in manifest_data:
                    tools_found = len(manifest_data['tools'])
                
                # 检查其他可能的问题
                if tools_found == 0:
                    warnings.append("未找到有效的工具定义")
                
                return {
                    "valid": True,
                    "message": "工具包格式验证通过",
                    "tools_found": tools_found,
                    "warnings": warnings
                }
                
        except Exception as e:
            logger.error(f"验证工具包时发生错误: {str(e)}")
            return {
                "valid": False,
                "message": f"验证工具包时发生错误: {str(e)}",
                "tools_found": 0,
                "warnings": []
            }
    
    def _is_supported_format(self, filename: str) -> bool:
        """检查文件格式是否支持"""
        if not filename:
            return False
        return any(filename.lower().endswith(ext) for ext in self.supported_formats)
    
    def _extract_zip(self, file_path: Path, extract_dir: Path):
        """解压ZIP文件"""
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    
    def _extract_tar(self, file_path: Path, extract_dir: Path):
        """解压TAR文件"""
        with tarfile.open(file_path, 'r:*') as tar_ref:
            tar_ref.extractall(extract_dir)
    
    def _find_manifest(self, extract_dir: Path) -> Optional[Path]:
        """查找manifest.json文件"""
        # 在根目录查找
        manifest_path = extract_dir / 'manifest.json'
        if manifest_path.exists():
            return manifest_path
        
        # 递归查找
        for root, dirs, files in os.walk(extract_dir):
            if 'manifest.json' in files:
                return Path(root) / 'manifest.json'
        
        return None
    
    def _parse_manifest(self, manifest_path: Path) -> Dict[str, Any]:
        """解析manifest.json文件"""
        with open(manifest_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _validate_manifest(self, manifest_data: Dict[str, Any]):
        """验证manifest格式"""
        # 检查必需字段
        if 'tools' in manifest_data:
            # 多工具格式
            for i, tool in enumerate(manifest_data['tools']):
                for field in self.required_manifest_fields:
                    if field not in tool:
                        raise ValueError(f"工具 {i+1} 缺少必需字段: {field}")
        else:
            # 单工具格式
            for field in self.required_manifest_fields:
                if field not in manifest_data:
                    raise ValueError(f"manifest缺少必需字段: {field}")
    
    async def _create_tool_from_manifest(
        self,
        tool_data: Dict[str, Any],
        db: AsyncSession,
        current_user: User,
        extract_dir: Path
    ) -> Tool:
        """从manifest数据创建工具记录"""
        import uuid
        
        # 生成唯一的tool_id
        tool_id = f"{tool_data['name'].lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
        
        # 构建默认的endpoint配置
        default_endpoint = {
            "url": tool_data.get('endpoint_url', ''),
            "method": tool_data.get('method', 'POST'),
            "headers": tool_data.get('headers', {}),
            "timeout": tool_data.get('timeout', 30)
        }
        
        # 构建工具创建数据
        create_data = DeveloperToolCreate(
            tool_id=tool_id,
            name=tool_data['name'],
            description=tool_data['description'],
            type=tool_data['type'],
            version=tool_data.get('version', '1.0.0'),
            tags=tool_data.get('tags', []),
            endpoint=tool_data.get('endpoint', default_endpoint),
            request_schema=tool_data.get('request_schema', {}),
            response_schema=tool_data.get('response_schema', {}),
            server_name=tool_data.get('server_name', ''),
            is_public=tool_data.get('is_public', True)
        )
        
        # 使用开发者工具服务创建工具
        return await self.dev_tool_service.create_tool(
            db=db,
            tool_data=create_data,
            current_user=current_user
        )

# 创建全局实例
package_parser_service = PackageParserService()