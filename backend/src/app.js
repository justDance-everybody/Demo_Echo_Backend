/**
 * Echo后端API服务入口文件
 * 
 * 提供统一API架构和MCP网关功能
 */

// 导入依赖
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入模块
const apiRoutes = require('./routes/apiRoutes');
const testServiceRoutes = require('./routes/testServiceRoutes');
const logger = require('./utils/logger');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件设置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, '../logs/access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// 路由设置
app.use('/api/v1', apiRoutes);
app.use('/api/test-service', testServiceRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Echo API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`全局错误处理: ${err.message}`);
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || '服务器内部错误',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `不存在的路由: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
  console.log(`服务器运行在 http://localhost:${PORT}`);
  
  // 打印环境变量
  logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
  logger.info(`MCP_CLIENT_PATH: ${process.env.MCP_CLIENT_PATH}`);
  logger.info(`MCP_CONFIG_PATH: ${process.env.MCP_CONFIG_PATH}`);
  logger.info(`MCP_PYTHON_PATH: ${process.env.MCP_PYTHON_PATH}`);
  logger.info(`USE_MOCK_RESPONSES: ${process.env.USE_MOCK_RESPONSES}`);
});

// 优雅退出
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，优雅退出');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，优雅退出');
  process.exit(0);
});

module.exports = app; 