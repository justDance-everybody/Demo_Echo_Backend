/**
 * 简单的日志记录工具
 */
class Logger {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled !== false;
    // 浏览器环境中不支持文件日志
    this.logToFile = false;
    this.logPath = options.logPath || './test.log';
  }
  
  /**
   * 写入日志信息
   * @param {string} level - 日志级别（info, warn, error等）
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据（可选）
   */
  log(level, message, data = null) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const logMessage = `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
    
    // 控制台输出
    switch (level.toLowerCase()) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'success':
        console.log(`%c${logMessage}`, 'color: green', data || '');
        break;
      case 'info':
      default:
        console.log(logMessage, data || '');
        break;
    }
    
    // 浏览器环境中不支持文件日志记录
    
    // 触发日志事件 (浏览器环境)
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      const logEvent = new CustomEvent('test-log', { 
        detail: { level, category: message, message: data ? data.toString() : '', data, timestamp }
      });
      window.dispatchEvent(logEvent);
    }
  }
  
  // 浏览器环境中不需要文件写入功能
  
  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据
   */
  info(message, data) {
    this.log('info', message, data);
  }
  
  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据
   */
  warn(message, data) {
    this.log('warn', message, data);
  }
  
  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据
   */
  error(message, data) {
    this.log('error', message, data);
  }
  
  /**
   * 记录成功级别日志
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据
   */
  success(message, data) {
    this.log('success', message, data);
  }
  
  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} [data] - 附加数据
   */
  debug(message, data) {
    this.log('debug', message, data);
  }
  
  /**
   * 下载日志
   * @param {string} filename - 下载文件名
   */
  downloadLogs(filename = 'logs.json') {
    console.log('尝试下载日志', filename);
    return true;
  }
}

// 创建一个浏览器环境中使用的Logger实例
const browserLogger = new Logger({
  prefix: 'Web',
  enabled: true
});

// 导出Logger实例而不是类
export default browserLogger;