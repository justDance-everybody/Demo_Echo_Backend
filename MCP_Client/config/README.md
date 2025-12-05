# MCP服务器配置说明

## 配置文件说明

### `mcp_servers.json.example`
- **用途**: 配置文件模板，包含所有服务器的配置示例
- **状态**: 可以提交到Git，不含敏感信息
- **使用**: 复制为实际配置文件使用

### `mcp_servers.json`
- **用途**: 实际使用的配置文件，包含真实的API密钥
- **状态**: 已在.gitignore中忽略，不会提交到Git
- **安全**: 包含敏感信息，需要保护

## 初始化配置

### 首次设置
```bash
# 1. 复制示例配置文件
cp mcp_servers.json.example mcp_servers.json

# 2. 编辑配置文件，填入真实的API密钥
vim mcp_servers.json
```

### 需要配置的API密钥

1. **MiniMax API密钥**
   ```json
   "MINIMAX_API_KEY": "your_minimax_api_key_here"
   ```
   - 获取地址: https://api.minimax.chat
   - 用途: 文字转语音功能

2. **高德地图API密钥**
   ```json
   "AMAP_MAPS_API_KEY": "your_amap_api_key_here"
   ```
   - 获取地址: https://lbs.amap.com/dev
   - 用途: 地理位置查询功能

## 配置项说明

### 服务器状态
- `"enabled": true` - 启用该服务器
- `"enabled": false` - 禁用该服务器

### 路径配置
- 确保 `MINIMAX_MCP_BASE_PATH` 指向正确的输出目录
- Web3服务器的路径需要根据实际部署位置调整

### 推荐设置
- **Playwright**: 移除 `--headless` 参数可以看到浏览器操作过程
- **MiniMax**: 使用 `"file"` 模式避免OSS权限问题
- **Web3**: 如未实现可设为 `"enabled": false`

## 安全注意事项

⚠️ **重要**: 
- 永远不要将真实的API密钥提交到版本控制系统
- 定期更换API密钥以确保安全
- 使用环境变量进一步保护敏感信息

## 故障排查

如果MCP服务器无法启动，检查：
1. API密钥是否正确配置
2. 路径是否存在并可访问
3. 网络连接是否正常
4. 依赖的npm包是否已安装