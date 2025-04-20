// MCP Client主入口文件

/**
 * MCP客户端主入口文件
 * 负责初始化Express服务器并设置路由
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('config');
const logger = require('./utils/logger');
const mcpClient = require('./mcp_client');
const mcpRoutes = require('./routes/mcp_routes');
const taskRoutes = require('./routes/task_routes');
const voiceRoutes = require('./routes/voice_routes');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || config.get('server.port') || 3000;

// 中间件设置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志记录
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 路由设置
app.use('/api/mcp', mcpRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/voice', voiceRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`MCP Client server running on port ${PORT}`);
  logger.info(`MCP Server URL: ${config.get('mcp.serverUrl')}`);
  
  // 初始化MCP客户端
  mcpClient.init()
    .then(() => {
      logger.info('MCP Client initialized successfully');
    })
    .catch(err => {
      logger.error(`Failed to initialize MCP Client: ${err.message}`);
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
