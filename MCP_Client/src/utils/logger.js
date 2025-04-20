/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */

const winston = require('winston');
const config = require('config');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: config.get('logging.level'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 记录所有日志到 combined.log
    new winston.transports.File({ 
      filename: config.get('logging.file'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 记录错误日志到 error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  // 不退出应用程序的异常处理
  exitOnError: false
});

// 开发环境下的额外配置
if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

module.exports = logger; 