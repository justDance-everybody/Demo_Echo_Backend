# MCP连接逻辑修复计划

## 问题分析

基于代码分析，发现了MCP客户端连接逻辑的三个核心问题：

### 1. 连接逻辑缺陷
- **问题**：客户端无法连接到已运行的服务器实例，总是依赖重新启动
- **位置**：`backend/app/utils/mcp_client.py` 中的 `_get_or_create_client` 方法
- **原因**：`_intelligent_server_recovery` 方法总是调用 `_ensure_server_via_manager`，而该方法会触发 `mcp_manager.ensure_server_running`，后者在冷却期内会拒绝启动

### 2. 冷却期机制问题
- **问题**：冷却期机制无法区分"启动新服务器"和"连接现有服务器"的场景
- **位置**：`backend/app/services/mcp_manager.py` 中的 `start_server` 和 `ensure_server_running` 方法
- **原因**：即使服务器已在运行，客户端请求连接时仍会触发冷却期检查

### 3. 错误报告不准确
- **问题**：将"冷却期跳过"误报为"服务器启动失败"
- **位置**：错误分类和用户消息生成逻辑
- **原因**：缺乏对冷却期状态的精确识别和报告

## 解决方案

### 任务1：修复连接逻辑
**目标**：客户端能够连接到已运行的服务器，而不总是尝试重新启动

**修改文件**：`backend/app/utils/mcp_client.py`
- 在 `_get_or_create_client` 中增加"直接连接"逻辑
- 修改 `_intelligent_server_recovery` 方法，优先尝试连接现有进程
- 新增 `_try_connect_existing_server` 方法

### 任务2：优化冷却期机制
**目标**：区分"启动新服务器"和"连接现有服务器"的场景

**修改文件**：`backend/app/services/mcp_manager.py`
- 修改 `ensure_server_running` 方法，当服务器已运行时跳过冷却期检查
- 新增 `connect_to_running_server` 方法，专门处理连接现有服务器的场景
- 优化冷却期逻辑，仅在实际需要启动时应用

### 任务3：改进错误报告
**目标**：准确区分不同错误类型，提供清晰的错误信息

**修改文件**：`backend/app/utils/mcp_client.py`
- 新增 `COOLDOWN_ACTIVE` 错误类型
- 改进错误分类器，准确识别冷却期状态
- 优化用户友好的错误消息

## 实施步骤

1. **步骤1**：修复连接逻辑（任务1）
2. **步骤2**：优化冷却期机制（任务2）
3. **步骤3**：改进错误报告（任务3）
4. **步骤4**：测试验证修复效果

## 预期效果

修复后，MCP客户端将能够：
- 成功连接到已运行的服务器实例
- 避免不必要的服务器重启
- 提供准确的错误信息和状态报告
- 支持武汉到宜昌等地理距离查询功能