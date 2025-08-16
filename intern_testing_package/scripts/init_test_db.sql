-- 测试数据库初始化脚本
-- 创建测试用户和基础数据

USE ai_assistant_test;

-- 创建测试用户表数据
INSERT INTO users (username, email, password_hash, role, contacts, wallets, created_at) VALUES
('testuser', 'test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'user', '{}', '{}', NOW()),
('developer', 'dev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'developer', '{}', '{}', NOW()),
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'admin', '{}', '{}', NOW());

-- 创建测试工具数据
INSERT INTO tools (tool_id, name, type, description, server_name, endpoint, request_schema, response_schema, created_at) VALUES
('weather_tool', '天气查询工具', 'mcp', '查询指定城市的天气信息', 'weather_server', '{"method": "get_weather", "url": "/weather"}', '{"type": "object", "properties": {"city": {"type": "string"}}}', '{"type": "object", "properties": {"temperature": {"type": "number"}, "description": {"type": "string"}}}', NOW()),
('calculator_tool', '计算器工具', 'mcp', '执行基本数学计算', 'calc_server', '{"method": "calculate", "url": "/calc"}', '{"type": "object", "properties": {"expression": {"type": "string"}}}', '{"type": "object", "properties": {"result": {"type": "number"}}}', NOW()),
('http_api_tool', 'HTTP API工具', 'http', '调用外部HTTP API', NULL, '{"method": "POST", "url": "https://api.example.com/test", "headers": {"Content-Type": "application/json"}}', '{"type": "object", "properties": {"data": {"type": "object"}}}', '{"type": "object", "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}}}', NOW()),
('text_processor', '文本处理工具', 'mcp', '处理和分析文本内容', 'text_server', '{"method": "process_text", "url": "/process"}', '{"type": "object", "properties": {"text": {"type": "string"}, "operation": {"type": "string"}}}', '{"type": "object", "properties": {"processed_text": {"type": "string"}, "metadata": {"type": "object"}}}', NOW());

-- 创建测试会话数据
INSERT INTO sessions (session_id, user_id, status, created_at, updated_at) VALUES
('test-session-001', 1, 'done', NOW(), NOW()),
('test-session-002', 2, 'done', NOW(), NOW()),
('test-session-003', 1, 'interpreting', NOW(), NOW());

-- 创建测试日志数据
INSERT INTO logs (session_id, user_id, action, details, created_at) VALUES
('test-session-001', 1, 'intent_interpret', '{"input": "查询北京天气", "intent": "weather_query", "parameters": {"city": "北京"}}', NOW()),
('test-session-001', 1, 'tool_execute', '{"tool_id": "weather_tool", "result": {"temperature": 25, "description": "晴天"}}', NOW()),
('test-session-002', 2, 'tool_upload', '{"tool_name": "custom_tool", "status": "success"}', NOW());

-- 创建开发者工具测试数据
INSERT INTO dev_tools (tool_id, developer_id, name, description, config, status, created_at) VALUES
('dev_tool_001', 2, '自定义计算工具', '开发者上传的计算工具', '{"type": "dify", "api_endpoint": "https://api.dify.ai/v1/workflows/run", "api_key": "test-key"}', 'active', NOW()),
('dev_tool_002', 2, 'Coze聊天工具', '基于Coze平台的聊天工具', '{"type": "coze", "bot_id": "test-bot-123", "api_key": "test-coze-key"}', 'active', NOW());

-- 创建MCP服务器配置测试数据
INSERT INTO mcp_servers (server_name, config, status, last_check, created_at) VALUES
('weather_server', '{"command": "python", "args": ["/path/to/weather_server.py"], "env": {"API_KEY": "test-weather-key"}}', 'running', NOW(), NOW()),
('calc_server', '{"command": "node", "args": ["/path/to/calc_server.js"], "env": {}}', 'running', NOW(), NOW()),
('text_server', '{"command": "python", "args": ["/path/to/text_server.py"], "env": {}}', 'stopped', NOW(), NOW());

-- 创建测试用的应用数据
INSERT INTO applications (app_id, developer_id, name, description, config, status, created_at) VALUES
('app_001', 2, '天气助手应用', '基于天气API的智能助手', '{"tools": ["weather_tool"], "ui_config": {"theme": "light"}}', 'published', NOW()),
('app_002', 2, '计算器应用', '智能计算器应用', '{"tools": ["calculator_tool"], "ui_config": {"theme": "dark"}}', 'draft', NOW());

-- 创建权限测试数据
INSERT INTO permissions (user_id, resource, action, granted, created_at) VALUES
(1, 'tools', 'read', true, NOW()),
(1, 'tools', 'execute', true, NOW()),
(2, 'tools', 'read', true, NOW()),
(2, 'tools', 'execute', true, NOW()),
(2, 'tools', 'create', true, NOW()),
(2, 'tools', 'update', true, NOW()),
(3, '*', '*', true, NOW());

-- 创建API使用统计测试数据
INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time, created_at) VALUES
(1, '/api/v1/intent/interpret', 'POST', 200, 150, NOW()),
(1, '/api/v1/execute', 'POST', 200, 300, NOW()),
(2, '/api/v1/dev/tools', 'GET', 200, 50, NOW()),
(2, '/api/v1/dev/tools', 'POST', 201, 200, NOW()),
(1, '/api/v1/tools', 'GET', 200, 80, NOW());

COMMIT;