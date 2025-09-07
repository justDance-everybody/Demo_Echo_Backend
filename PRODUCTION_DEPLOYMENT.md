# EchoAI 生产环境部署指南

## 概述

本文档提供了 EchoAI 后端服务在生产环境中的完整部署指南，包括环境准备、配置、部署和维护等各个方面。

## 目录

- [系统要求](#系统要求)
- [部署前准备](#部署前准备)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [安全配置](#安全配置)
- [监控和日志](#监控和日志)
- [备份和恢复](#备份和恢复)
- [故障排除](#故障排除)
- [维护指南](#维护指南)

## 系统要求

### 硬件要求

- **CPU**: 最少 2 核，推荐 4 核或更多
- **内存**: 最少 4GB，推荐 8GB 或更多
- **存储**: 最少 20GB 可用空间，推荐 SSD
- **网络**: 稳定的互联网连接

### 软件要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Git**: 2.25+
- **curl**: 用于健康检查
- **openssl**: 用于生成证书和密钥

## 部署前准备

### 1. 环境检查

```bash
# 检查系统信息
uname -a
df -h
free -h

# 检查 Docker 安装
docker --version
docker-compose --version

# 检查网络连接
curl -I https://api.openai.com
```

### 2. 获取代码

```bash
# 克隆仓库
git clone <repository-url>
cd echoai-backend

# 切换到生产分支（如果有）
git checkout production
```

### 3. 生成安全配置

```bash
# 运行安全配置生成脚本
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

### 4. 配置环境变量

编辑 `backend/.env.production` 文件，确保所有配置项都已正确设置：

```bash
# 编辑生产环境配置
nano backend/.env.production

# 检查配置
grep -v '^#' backend/.env.production | grep -v '^$'
```

**重要配置项检查清单：**

- [ ] `APP_ENV=production`
- [ ] `DEBUG=false`
- [ ] `JWT_SECRET_KEY` 已设置强密钥
- [ ] `DATABASE_PASSWORD` 已设置强密码
- [ ] `CORS_ORIGINS` 已限制为实际域名
- [ ] `OPENAI_API_KEY` 已配置
- [ ] `LOG_LEVEL=INFO`

## 快速部署

### 使用部署脚本（推荐）

```bash
# 赋予执行权限
chmod +x scripts/deploy.sh

# 完整部署
./scripts/deploy.sh deploy

# 查看部署状态
./scripts/deploy.sh status

# 查看服务日志
./scripts/deploy.sh logs
```

### 手动部署

```bash
# 1. 构建镜像
docker build -t echoai-backend:latest .

# 2. 启动服务
docker-compose up -d

# 3. 检查服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

## 详细配置

### Docker Compose 配置

主要服务组件：

1. **应用服务** (`app`)
   - 端口: 3000
   - 健康检查: `/health`
   - 自动重启策略

2. **数据库服务** (`db`)
   - MySQL 8.0
   - 数据持久化
   - 性能优化配置

3. **缓存服务** (`redis`)
   - Redis 7.0
   - 内存优化配置

4. **反向代理** (`nginx`) - 可选
   - SSL 终止
   - 负载均衡
   - 静态文件服务

### 网络配置

```yaml
# 自定义网络配置
networks:
  echoai-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 数据卷配置

```yaml
# 持久化存储
volumes:
  db_data:          # 数据库数据
  redis_data:       # Redis 数据
  app_logs:         # 应用日志
  ssl_certs:        # SSL 证书
```

## 安全配置

### 1. SSL/TLS 配置

```bash
# 生成自签名证书（开发环境）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt

# 或使用 Let's Encrypt（生产环境）
certbot certonly --standalone -d your-domain.com
```

### 2. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. 容器安全

- 使用非 root 用户运行容器
- 限制容器资源使用
- 定期更新基础镜像
- 扫描镜像漏洞

```bash
# 扫描镜像安全漏洞
docker scan echoai-backend:latest
```

### 4. 数据库安全

- 使用强密码
- 限制网络访问
- 启用审计日志
- 定期备份

## 监控和日志

### 1. 应用监控

```bash
# 查看服务状态
./scripts/deploy.sh status

# 健康检查
./scripts/deploy.sh health

# 查看资源使用
docker stats
```

### 2. 日志管理

```bash
# 查看应用日志
./scripts/deploy.sh logs app

# 查看数据库日志
./scripts/deploy.sh logs db

# 查看所有日志
./scripts/deploy.sh logs
```

### 3. 日志轮转配置

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 4. 监控指标

关键监控指标：

- **应用指标**
  - 响应时间
  - 错误率
  - 请求量
  - 内存使用
  - CPU 使用

- **数据库指标**
  - 连接数
  - 查询性能
  - 锁等待
  - 存储使用

- **系统指标**
  - 磁盘使用
  - 网络流量
  - 负载均衡

## 备份和恢复

### 1. 自动备份

```bash
# 创建备份
./scripts/deploy.sh backup

# 设置定时备份（crontab）
0 2 * * * /path/to/scripts/deploy.sh backup
```

### 2. 手动备份

```bash
# 备份数据库
docker exec echoai-db mysqldump -u root -p echoai > backup_$(date +%Y%m%d).sql

# 备份应用数据
docker run --rm -v echoai_app_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/app_data_$(date +%Y%m%d).tar.gz -C /data .
```

### 3. 数据恢复

```bash
# 恢复数据库
docker exec -i echoai-db mysql -u root -p echoai < backup_20231201.sql

# 恢复应用数据
./scripts/deploy.sh restore backups/backup_20231201.tar.gz
```

## 故障排除

### 常见问题

#### 1. 服务启动失败

```bash
# 检查容器状态
docker-compose ps

# 查看错误日志
docker-compose logs app

# 检查配置文件
docker-compose config
```

#### 2. 数据库连接失败

```bash
# 检查数据库状态
docker-compose exec db mysql -u root -p -e "SELECT 1"

# 检查网络连接
docker-compose exec app ping db

# 验证环境变量
docker-compose exec app env | grep DATABASE
```

#### 3. 内存不足

```bash
# 检查内存使用
free -h
docker stats

# 调整容器内存限制
# 在 docker-compose.yml 中添加:
# mem_limit: 1g
# memswap_limit: 1g
```

#### 4. 磁盘空间不足

```bash
# 检查磁盘使用
df -h
docker system df

# 清理 Docker 资源
./scripts/deploy.sh cleanup
docker system prune -a
```

### 调试技巧

```bash
# 进入容器调试
docker-compose exec app bash

# 查看容器详细信息
docker inspect echoai-app

# 实时监控日志
docker-compose logs -f --tail=100

# 检查端口占用
netstat -tlnp | grep :3000
```

## 维护指南

### 1. 定期维护任务

#### 每日任务
- 检查服务状态
- 查看错误日志
- 监控资源使用

#### 每周任务
- 清理日志文件
- 检查备份完整性
- 更新安全补丁

#### 每月任务
- 更新依赖包
- 性能优化
- 安全审计

### 2. 更新流程

```bash
# 1. 备份当前版本
./scripts/deploy.sh backup

# 2. 拉取最新代码
git pull origin production

# 3. 更新服务
./scripts/deploy.sh update

# 4. 验证更新
./scripts/deploy.sh health
```

### 3. 性能优化

#### 应用层优化
- 启用缓存
- 优化数据库查询
- 使用连接池
- 启用压缩

#### 系统层优化
- 调整内核参数
- 优化文件系统
- 配置 swap
- 网络调优

### 4. 扩容策略

#### 垂直扩容
```bash
# 增加容器资源限制
# 在 docker-compose.yml 中修改:
cpus: '2.0'
mem_limit: 4g
```

#### 水平扩容
```bash
# 启动多个应用实例
docker-compose up -d --scale app=3

# 配置负载均衡器
# 更新 nginx 配置
```

## 安全检查清单

- [ ] 所有默认密码已更改
- [ ] SSL/TLS 已正确配置
- [ ] 防火墙规则已设置
- [ ] 容器以非 root 用户运行
- [ ] 敏感数据已加密存储
- [ ] 访问日志已启用
- [ ] 定期安全扫描已配置
- [ ] 备份策略已实施
- [ ] 监控告警已设置
- [ ] 应急响应计划已制定

## 联系信息

如果在部署过程中遇到问题，请联系：

- **技术支持**: support@echoai.com
- **紧急联系**: emergency@echoai.com
- **文档更新**: docs@echoai.com

## 版本历史

| 版本 | 日期 | 更改内容 |
|------|------|----------|
| 1.0.0 | 2023-12-01 | 初始版本 |
| 1.1.0 | 2023-12-15 | 添加监控配置 |
| 1.2.0 | 2024-01-01 | 安全增强 |

---

**注意**: 本文档会定期更新，请确保使用最新版本。