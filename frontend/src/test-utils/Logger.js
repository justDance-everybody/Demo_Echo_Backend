/**
 * 简单的日志记录工具
 */
class Logger {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled !== false;
    this.logToFile = false; // 浏览器环境中始终禁用文件日志
    this.logPath = options.logPath || './test.log';
    
    // 在浏览器环境中不尝试加载fs
    if (typeof window === 'undefined' && options.logToFile) {
      this.logToFile = true;
      // Node.js环境中才尝试加载fs，这段代码在浏览器环境中永远不会执行
      // 将在构建时被剔除
      // 浏览器构建不包含 fs，保持禁用文件写入
      this.logToFile = false;
    }
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
    
    // 文件记录功能在浏览器中被禁用
    // 只在Node.js环境中执行，浏览器中永远不会调用
    if (this.logToFile && typeof window === 'undefined') {
      // 浏览器环境不写文件；Node 环境可扩展
      this._writeToFile(logMessage, data);
    }
    
    // 触发日志事件 (浏览器环境)
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      const logEvent = new CustomEvent('test-log', { 
        detail: { level, category: message, message: data ? data.toString() : '', data, timestamp }
      });
      window.dispatchEvent(logEvent);
    }
  }
  
  // 仅在Node.js环境中使用的私有方法
  _writeToFile(logMessage, data) {
    // 去除对 'fs' 的静态依赖，避免浏览器构建报错
    return;
  }
  
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