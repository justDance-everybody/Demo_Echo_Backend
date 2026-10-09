# Trojan-Go 代理客户端

本目录包含 Trojan-Go 客户端，用于连接远程 Trojan 服务器并提供本地 SOCKS5 代理服务。

## 目录结构

```
proxy/
├── trojan-go              # Trojan-Go 可执行文件
├── config/
│   └── client.json        # 客户端配置文件
├── logs/                  # 日志目录
│   ├── trojan-go.log     # 运行日志
│   └── trojan-go.pid     # 进程 PID
├── geoip.dat             # IP 地理位置数据库
├── geosite.dat           # 网站分类数据库
├── start.sh              # 启动脚本
├── stop.sh               # 停止脚本
├── status.sh             # 状态查看脚本
└── README.md             # 本文件
```

## 快速开始

### 1. 配置服务器信息

编辑 `config/client.json`，填入您的 Trojan 服务器信息：

```json
{
    "remote_addr": "your_server_ip_or_domain",  // 服务器地址
    "remote_port": 443,                         // 服务器端口
    "password": ["your_password_here"],         // 服务器密码
    "ssl": {
        "sni": "your-domain-name.com"           // SNI 域名
    }
}
```

**必须修改的字段：**
- `remote_addr`: 远程服务器的 IP 地址或域名
- `password`: 服务器设置的密码（数组格式）
- `ssl.sni`: 服务器的域名（用于 TLS 握手）

### 2. 启动服务

```bash
cd /home/devbox/project/proxy
./start.sh
```

启动成功后，本地将在 `127.0.0.1:1080` 监听 SOCKS5 代理。

### 3. 查看状态

```bash
./status.sh
```

### 4. 停止服务

```bash
./stop.sh
```

## 使用代理

### 命令行使用

使用 curl 测试：
```bash
# HTTP/HTTPS 请求
curl --socks5 127.0.0.1:1080 https://www.google.com

# 查看 IP 地址
curl --socks5 127.0.0.1:1080 https://api.ipify.org
```

### 环境变量设置

```bash
export http_proxy="socks5://127.0.0.1:1080"
export https_proxy="socks5://127.0.0.1:1080"
export all_proxy="socks5://127.0.0.1:1080"
```

### Git 代理设置

```bash
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080
```

### Docker 代理设置

编辑 `/etc/docker/daemon.json`：
```json
{
  "proxies": {
    "default": {
      "httpProxy": "socks5://127.0.0.1:1080",
      "httpsProxy": "socks5://127.0.0.1:1080"
    }
  }
}
```

### APT 代理设置（Debian/Ubuntu）

编辑 `/etc/apt/apt.conf.d/proxy.conf`：
```
Acquire::http::Proxy "socks5h://127.0.0.1:1080";
Acquire::https::Proxy "socks5h://127.0.0.1:1080";
```

### 浏览器代理设置

- **Firefox**: 设置 → 网络设置 → 手动代理配置
  - SOCKS 主机: `127.0.0.1`
  - 端口: `1080`
  - 选择 SOCKS v5

- **Chrome/Edge**: 使用 SwitchyOmega 插件配置 SOCKS5 代理

## 配置说明

### 本地代理端口

默认监听 `127.0.0.1:1080`，可以修改 `local_port` 字段：
```json
{
    "local_addr": "127.0.0.1",
    "local_port": 1080
}
```

### 路由规则

配置文件包含智能路由规则：

- **直连 (bypass)**: 中国大陆 IP 和网站直连，不走代理
- **代理 (proxy)**: 国外网站走代理
- **屏蔽 (block)**: 广告网站被屏蔽

可以根据需要修改 `router` 部分。

### 多路复用 (Mux)

已启用 Mux 功能，可以提高连接性能：
```json
{
    "mux": {
        "enabled": true,
        "concurrency": 8
    }
}
```

## 日志查看

实时查看日志：
```bash
tail -f logs/trojan-go.log
```

日志级别说明（log_level）：
- 0: All
- 1: Info
- 2: Warn
- 3: Error
- 4: Fatal

## 故障排查

### 1. 启动失败

检查配置文件是否正确：
```bash
./trojan-go -config config/client.json -test
```

查看详细日志：
```bash
cat logs/trojan-go.log
```

### 2. 连接失败

- 检查服务器地址、端口、密码是否正确
- 检查服务器是否正常运行
- 检查网络连接是否正常
- 尝试禁用 SSL 验证（不推荐，仅用于测试）

### 3. 代理不工作

测试本地代理端口：
```bash
curl --socks5 127.0.0.1:1080 https://www.google.com -v
```

检查端口是否监听：
```bash
ss -tlnp | grep 1080
# 或
netstat -tlnp | grep 1080
```

## 性能优化

### 调整 Mux 并发数

增加并发连接数可以提高性能：
```json
{
    "mux": {
        "enabled": true,
        "concurrency": 16
    }
}
```

### 禁用路由规则

如果不需要智能分流，可以禁用路由：
```json
{
    "router": {
        "enabled": false
    }
}
```

## 开机自启动

如需开机自启动，可以创建 systemd 服务：

```bash
sudo cp example/trojan-go.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trojan-go
sudo systemctl start trojan-go
```

注意：需要修改 service 文件中的路径。

## 安全建议

1. 不要使用简单密码
2. 建议启用 SSL 验证
3. 定期更新 Trojan-Go 版本
4. 不要将配置文件提交到版本控制系统
5. 定期检查日志，确保没有异常连接

## 更多信息

- Trojan-Go 官方文档: https://p4gefau1t.github.io/trojan-go/
- GitHub 仓库: https://github.com/p4gefau1t/trojan-go
