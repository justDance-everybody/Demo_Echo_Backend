# MCP_Client 到 MCPRouter 迁移指南

## 概述

本文档详细说明如何将现有的MCP_Client实现替换为mcprouter，以获得更好的性能、稳定性和可维护性。

## 架构对比

### 原有架构 (MCP_Client)
```
后端应用 → MCPClientWrapper → MCP_Client (Python) → MCP服务器
```

### 新架构 (MCPRouter)
```
后端应用 → MCPRouterClient → MCPRouter (Go) → MCP服务器
```

## 优势

1. **性能提升**: Go语言实现的mcprouter比Python实现更高效
2. **连接管理**: 内置连接池和会话管理
3. **稳定性**: 更好的错误处理和恢复机制
4. **可扩展性**: 支持HTTP和stdio两种通信方式
5. **监控**: 内置日志记录和性能监控
6. **资源管理**: 更高效的进程管理和内存使用
7. **并发处理**: 更好的并发请求处理能力

## 迁移步骤

### 1. 安装Go环境

确保系统已安装Go 1.23+：

```bash
# 检查Go版本
go version

# 如果未安装，请参考 https://golang.org/doc/install
```

### 2. 配置MCPRouter

1. 复制配置文件：
```bash
cd mcprouter
cp env.toml.example .env.toml
```

2. 编辑 `.env.toml` 文件，配置MCP服务器：
```toml
[app]
use_db = false
use_cache = false
save_log = false

[proxy_server]
port = 8025
host = "0.0.0.0"

[api_server]
port = 8027
host = "0.0.0.0"

[mcp_server_commands]
# 高德地图服务
amap-maps = "npx -y @amap/amap-maps-mcp-server"

# MiniMax AI服务
minimax-mcp-js = "npx -y minimax-mcp-js"

# Web3区块链服务
web3-rpc = "node /path/to/web3-mcp/build/index.js"

# Playwright浏览器自动化
playwright = "npx @playwright/mcp@latest --headless"

# 自定义Python脚本
custom-python = "python /path/to/custom_mcp_server.py"

[mcp_server_env]
# 高德地图环境变量
amap-maps = { 
    AMAP_MAPS_API_KEY = "your-amap-api-key-here",
    AMAP_MAPS_SECURITY_KEY = "your-security-key"
}

# MiniMax环境变量
minimax-mcp-js = { 
    MINIMAX_API_KEY = "your-minimax-api-key-here",
    MINIMAX_API_HOST = "https://api.minimax.chat",
    MINIMAX_MCP_BASE_PATH = "../MCP_server/minimax-mcp-js/outputs",
    MINIMAX_RESOURCE_MODE = "url"
}

# Web3环境变量
web3-rpc = { 
    SOLANA_RPC_URL = "your-solana-rpc-url-here",
    ETHEREUM_RPC_URL = "your-ethereum-rpc-url-here"
}

# Playwright环境变量
playwright = { 
    PLAYWRIGHT_BROWSER_PATH = "/usr/bin/google-chrome",
    PLAYWRIGHT_HEADLESS = "true"
}
```

### 3. 启动MCPRouter服务

使用提供的启动脚本：
```bash
./start-mcprouter.sh
```

或手动启动：
```bash
# 启动API服务器
cd mcprouter
go run main.go api &

# 启动代理服务器
go run main.go proxy &
```

### 4. 配置后端应用

1. 在 `.env` 文件中添加MCPRouter配置：
```bash
# MCPRouter配置
MCPROUTER_API_URL=http://localhost:8027
MCPROUTER_PROXY_URL=http://localhost:8025
USE_MCPROUTER=true

# 可选：连接池配置
MCPROUTER_TIMEOUT=30.0
MCPROUTER_MAX_CONNECTIONS=20
MCPROUTER_MAX_KEEPALIVE=10
```

2. 重启后端应用：
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 5. 验证迁移

1. 检查MCPRouter服务状态：
```bash
# 检查API服务器
curl http://localhost:8027/v1/list-servers

# 检查代理服务器
curl http://localhost:8025/health

# 检查服务器状态
curl http://localhost:8027/v1/get-server/amap-maps
```

2. 测试工具执行：
```bash
# 通过后端API测试工具执行
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "your-tool-id",
    "params": {"key": "value"}
  }'

# 直接通过MCPRouter API测试
curl -X POST http://localhost:8027/v1/call-tool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer amap-maps" \
  -d '{
    "server": "amap-maps",
    "name": "search_poi",
    "arguments": {"keywords": "餐厅", "city": "北京"}
  }'
```

## 配置说明

### MCPRouter配置选项

| 配置项 | 说明 | 默认值 | 推荐值 |
|--------|------|--------|--------|
| `MCPROUTER_API_URL` | MCPRouter API服务器地址 | `http://localhost:8027` | `http://localhost:8027` |
| `MCPROUTER_PROXY_URL` | MCPRouter代理服务器地址 | `http://localhost:8025` | `http://localhost:8025` |
| `USE_MCPROUTER` | 是否使用MCPRouter | `true` | `true` |
| `MCPROUTER_TIMEOUT` | 请求超时时间(秒) | `30.0` | `60.0` |
| `MCPROUTER_MAX_CONNECTIONS` | 最大连接数 | `20` | `50` |
| `MCPROUTER_MAX_KEEPALIVE` | 保持连接数 | `10` | `20` |

### 环境变量配置

在 `.env.toml` 中配置MCP服务器：

```toml
[mcp_server_commands]
# 服务器名称 = 启动命令
server-name = "command with args"

[mcp_server_env]
# 服务器名称 = 环境变量
server-name = { 
    ENV_VAR1 = "value1",
    ENV_VAR2 = "value2"
}
```

### 服务器配置最佳实践

1. **命名规范**：
   - 使用小写字母和连字符
   - 避免特殊字符和空格
   - 使用描述性名称

2. **命令配置**：
   - 使用绝对路径避免路径问题
   - 为不同环境配置不同的命令
   - 添加必要的启动参数

3. **环境变量**：
   - 敏感信息使用环境变量
   - 为不同服务器设置独立的环境变量
   - 使用有意义的变量名

## API接口

### MCPRouter API接口

1. **获取服务器列表**
```bash
GET /v1/list-servers
Response: {
  "servers": ["amap-maps", "minimax-mcp-js", "web3-rpc"]
}
```

2. **获取服务器详情**
```bash
GET /v1/get-server/{server-name}
Response: {
  "name": "amap-maps",
  "status": "running",
  "pid": 12345,
  "uptime": "2h30m"
}
```

3. **获取工具列表**
```bash
POST /v1/list-tools
Content-Type: application/json
Authorization: Bearer {server-name}

{
  "server": "server-name"
}

Response: {
  "tools": [
    {
      "name": "search_poi",
      "description": "搜索兴趣点",
      "inputSchema": {...}
    }
  ]
}
```

4. **调用工具**
```bash
POST /v1/call-tool
Content-Type: application/json
Authorization: Bearer {server-name}

{
  "server": "server-name",
  "name": "tool-name",
  "arguments": {"key": "value"}
}

Response: {
  "content": [
    {
      "type": "text",
      "text": "工具执行结果"
    }
  ]
}
```

### 代理模式接口

1. **健康检查**
```bash
GET /health
Response: {"status": "healthy"}
```

2. **代理请求**
```bash
POST /proxy
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "tool-name",
    "arguments": {"key": "value"}
  }
}
```

## 实际使用场景

### 场景1：高德地图服务

```python
# 后端调用示例
async def search_nearby_restaurants(location: str):
    result = await mcprouter_client.execute_tool(
        tool_id="search_poi",
        params={
            "keywords": "餐厅",
            "location": location,
            "radius": 1000
        },
        target_server="amap-maps"
    )
    return result
```

### 场景2：AI对话服务

```python
# 后端调用示例
async def chat_with_ai(message: str):
    result = await mcprouter_client.execute_tool(
        tool_id="chat",
        params={
            "message": message,
            "model": "abab5.5-chat"
        },
        target_server="minimax-mcp-js"
    )
    return result
```

### 场景3：区块链交互

```python
# 后端调用示例
async def get_balance(address: str):
    result = await mcprouter_client.execute_tool(
        tool_id="get_balance",
        params={
            "address": address,
            "network": "solana"
        },
        target_server="web3-rpc"
    )
    return result
```

## 故障排除

### 常见问题

1. **MCPRouter启动失败**
   ```bash
   # 检查Go环境
   go version
   
   # 检查端口占用
   netstat -tulpn | grep :8027
   netstat -tulpn | grep :8025
   
   # 检查配置文件语法
   cd mcprouter
   go run main.go api --config .env.toml
   ```

2. **连接超时**
   ```bash
   # 检查服务状态
   curl -v http://localhost:8027/health
   curl -v http://localhost:8025/health
   
   # 检查防火墙设置
   sudo ufw status
   
   # 检查网络连接
   telnet localhost 8027
   telnet localhost 8025
   ```

3. **工具执行失败**
   ```bash
   # 检查MCP服务器状态
   curl http://localhost:8027/v1/get-server/amap-maps
   
   # 检查环境变量
   echo $AMAP_MAPS_API_KEY
   
   # 手动测试MCP服务器
   npx -y @amap/amap-maps-mcp-server
   ```

4. **权限问题**
   ```bash
   # 检查文件权限
   ls -la mcprouter/
   chmod +x mcprouter/main.go
   
   # 检查Node.js权限
   npm config get prefix
   ```

### 日志查看

```bash
# 查看MCPRouter日志
cd mcprouter
go run main.go api 2>&1 | tee mcprouter-api.log
go run main.go proxy 2>&1 | tee mcprouter-proxy.log

# 查看系统日志
journalctl -u mcprouter-api -f
journalctl -u mcprouter-proxy -f

# 查看MCP服务器日志
ps aux | grep mcp
tail -f /var/log/mcp-server.log
```

### 性能诊断

```bash
# 检查系统资源
htop
iostat -x 1
netstat -i

# 检查Go程序性能
go tool pprof http://localhost:8027/debug/pprof/profile
go tool pprof http://localhost:8027/debug/pprof/heap

# 检查网络连接
ss -tulpn | grep :8027
ss -tulpn | grep :8025
```

### 回滚方案

如果需要回滚到原有MCP_Client：

1. 设置环境变量：
```bash
export USE_MCPROUTER=false
```

2. 重启后端应用：
```bash
cd backend
python -m uvicorn app.main:app --reload
```

3. 停止MCPRouter服务：
```bash
pkill -f "go run main.go"
```

## 性能优化

### 连接池配置

在 `mcprouter_client.py` 中可以调整连接池参数：

```python
self._http_client = httpx.AsyncClient(
    timeout=60.0,  # 增加超时时间
    limits=httpx.Limits(
        max_keepalive_connections=20,  # 增加保持连接数
        max_connections=50,            # 增加最大连接数
        keepalive_expiry=30.0          # 保持连接过期时间
    ),
    http2=True  # 启用HTTP/2
)
```

### 超时设置

根据MCP服务器的响应时间调整超时设置：

```python
# 不同服务器的超时配置
SERVER_TIMEOUTS = {
    "amap-maps": 30.0,      # 地图服务较快
    "minimax-mcp-js": 60.0, # AI服务较慢
    "web3-rpc": 45.0,       # 区块链服务中等
    "playwright": 120.0     # 浏览器自动化最慢
}
```

### 缓存策略

```python
# 实现工具结果缓存
import asyncio
from functools import lru_cache

class MCPRouterClient:
    def __init__(self):
        self._cache = {}
        self._cache_ttl = 300  # 5分钟缓存
    
    async def execute_tool_with_cache(self, tool_id: str, params: dict, target_server: str):
        cache_key = f"{target_server}:{tool_id}:{hash(str(params))}"
        
        # 检查缓存
        if cache_key in self._cache:
            cached_result, timestamp = self._cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                return cached_result
        
        # 执行工具
        result = await self.execute_tool(tool_id, params, target_server)
        
        # 缓存结果
        self._cache[cache_key] = (result, time.time())
        return result
```

### 并发优化

```python
# 并发执行多个工具
async def execute_multiple_tools(self, tools: List[dict]):
    tasks = []
    for tool in tools:
        task = self.execute_tool(
            tool_id=tool["tool_id"],
            params=tool["params"],
            target_server=tool["target_server"]
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

## 监控和维护

### 健康检查

定期检查MCPRouter服务状态：

```bash
#!/bin/bash
# health_check.sh

API_URL="http://localhost:8027"
PROXY_URL="http://localhost:8025"

# 检查API服务器
if curl -f -s "$API_URL/health" > /dev/null; then
    echo "✅ API服务器正常"
else
    echo "❌ API服务器异常"
    # 发送告警
    curl -X POST "your-alert-webhook" -d '{"text": "MCPRouter API服务器异常"}'
fi

# 检查代理服务器
if curl -f -s "$PROXY_URL/health" > /dev/null; then
    echo "✅ 代理服务器正常"
else
    echo "❌ 代理服务器异常"
    # 发送告警
    curl -X POST "your-alert-webhook" -d '{"text": "MCPRouter代理服务器异常"}'
fi
```

### 性能监控

监控关键指标：

```python
# 性能监控示例
import time
import psutil
from prometheus_client import Counter, Histogram, Gauge

# 指标定义
request_counter = Counter('mcprouter_requests_total', 'Total requests', ['server', 'tool'])
request_duration = Histogram('mcprouter_request_duration_seconds', 'Request duration', ['server', 'tool'])
active_connections = Gauge('mcprouter_active_connections', 'Active connections')

class MonitoredMCPRouterClient(MCPRouterClient):
    async def execute_tool(self, tool_id: str, params: dict, target_server: str):
        start_time = time.time()
        
        try:
            result = await super().execute_tool(tool_id, params, target_server)
            
            # 记录成功指标
            request_counter.labels(server=target_server, tool=tool_id).inc()
            request_duration.labels(server=target_server, tool=tool_id).observe(
                time.time() - start_time
            )
            
            return result
        except Exception as e:
            # 记录错误指标
            request_counter.labels(server=target_server, tool=tool_id).inc()
            raise
```

### 日志分析

```bash
# 分析访问日志
grep "POST /v1/call-tool" mcprouter-api.log | \
  awk '{print $4}' | \
  sort | uniq -c | \
  sort -nr

# 分析错误日志
grep "ERROR" mcprouter-api.log | \
  awk '{print $NF}' | \
  sort | uniq -c | \
  sort -nr

# 分析响应时间
grep "POST /v1/call-tool" mcprouter-api.log | \
  awk '{print $NF}' | \
  awk -F'=' '{print $2}' | \
  sort -n | \
  awk '{sum+=$1; count++} END {print "平均响应时间:", sum/count, "ms"}'
```

### 自动化维护

```bash
#!/bin/bash
# maintenance.sh

# 每日重启MCPRouter服务
systemctl restart mcprouter-api
systemctl restart mcprouter-proxy

# 清理旧日志
find /var/log/mcprouter -name "*.log" -mtime +7 -delete

# 备份配置文件
cp /etc/mcprouter/.env.toml /backup/mcprouter/.env.toml.$(date +%Y%m%d)

# 检查磁盘空间
df -h | awk '$5 > "80%" {print "磁盘空间不足:", $0}'
```

## 安全考虑

### 访问控制

```toml
# 在.env.toml中添加访问控制
[api_server]
port = 8027
host = "127.0.0.1"  # 只允许本地访问
auth_enabled = true
auth_token = "your-secret-token"
```

### 网络安全

```bash
# 配置防火墙
sudo ufw allow 8027/tcp
sudo ufw allow 8025/tcp

# 使用HTTPS
# 配置SSL证书
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 数据保护

```python
# 敏感数据加密
import base64
from cryptography.fernet import Fernet

class SecureMCPRouterClient(MCPRouterClient):
    def __init__(self, encryption_key: str):
        self.cipher = Fernet(encryption_key.encode())
        super().__init__()
    
    def _encrypt_sensitive_data(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()
    
    def _decrypt_sensitive_data(self, encrypted_data: str) -> str:
        return self.cipher.decrypt(encrypted_data.encode()).decode()
```

## 总结

通过迁移到MCPRouter，您将获得：
- 更好的性能和稳定性
- 更简单的配置管理
- 更强大的监控能力
- 更好的可扩展性
- 更高效的资源使用
- 更好的并发处理能力

建议在生产环境中逐步迁移，先在小规模环境中测试，确认稳定后再全面部署。

### 迁移检查清单

- [ ] Go环境安装完成
- [ ] MCPRouter配置文件创建
- [ ] MCP服务器配置正确
- [ ] 环境变量设置完成
- [ ] MCPRouter服务启动成功
- [ ] 后端配置更新完成
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 监控配置完成
- [ ] 文档更新完成

### 后续优化建议

1. **容器化部署**：使用Docker部署MCPRouter
2. **负载均衡**：配置多个MCPRouter实例
3. **自动扩缩容**：基于负载自动调整实例数量
4. **链路追踪**：集成Jaeger等链路追踪工具
5. **告警系统**：配置Prometheus + Grafana监控告警
