const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');

// 导入路由
const testServiceRoutes = require('./routes/testServiceRoutes');

// 创建Express应用
const app = express();

// 创建logs目录（如果不存在）
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 设置详细的CORS配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use(morgan('dev'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 测试端点
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: '后端API连接正常!' });
});

// API路由
app.use('/api/test-service', testServiceRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: '未找到请求的资源' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err.message}`, { error: err });
  
  res.status(err.status || 500).json({
    status: 'error',
    message: config.nodeEnv === 'production' ? '服务器内部错误' : err.message
  });
});

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}, 环境: ${config.nodeEnv}`);
});

module.exports = app; 