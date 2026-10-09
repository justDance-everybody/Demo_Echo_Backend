// Logger.js - 前端事件和状态日志收集器
import { v4 as uuidv4 } from 'uuid';

class Logger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
    this.testId = uuidv4();
    this.logLevel = 'info'; // debug, info, warn, error
    this.enabled = true;
    
    // 在控制台添加快捷命令
    if (typeof window !== 'undefined') {
      window.voiceTestLogger = this;
      console.log('日志收集器已激活。使用 window.voiceTestLogger.exportLogs() 导出日志');
    }
  }

  // 记录普通信息
  info(component, event, data = {}) {
    this._log('info', component, event, data);
    return this;
  }

  // 记录调试信息
  debug(component, event, data = {}) {
    this._log('debug', component, event, data);
    return this;
  }

  // 记录警告
  warn(component, event, data = {}) {
    this._log('warn', component, event, data);
    return this;
  }

  // 记录错误
  error(component, event, data = {}) {
    this._log('error', component, event, data);
    return this;
  }

  // 记录语音识别事件
  speechEvent(event, transcript = '', confidence = 0, isFinal = false) {
    return this.info('SpeechRecognition', event, {
      transcript,
      confidence,
      isFinal
    });
  }

  // 记录API调用
  apiCall(endpoint, method, requestData = {}, status = 'pending') {
    return this.info('API', `${method} ${endpoint}`, {
      requestData,
      status
    });
  }

  // 记录API响应
  apiResponse(endpoint, method, responseData = {}, status = 'success', error = null) {
    return this.info('API', `${method} ${endpoint} response`, {
      responseData,
      status,
      error
    });
  }

  // 记录组件状态变化
  stateChange(component, prevState, newState) {
    return this.debug(component, 'stateChange', {
      prev: prevState,
      new: newState,
      changed: this._getChangedProps(prevState, newState)
    });
  }

  // 记录麦克风状态
  microphoneStatus(status, details = {}) {
    return this.info('Microphone', status, details);
  }

  // 记录确认流程状态
  confirmationStatus(status, recognizedText = '', intent = '') {
    return this.info('Confirmation', status, {
      recognizedText,
      intent
    });
  }

  // 内部日志记录方法
  _log(level, component, event, data) {
    if (!this.enabled) return this;
    
    // 根据日志级别过滤
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levelPriority[level] < levelPriority[this.logLevel]) return this;
    
    const entry = {
      timestamp: Date.now(),
      timeOffset: Date.now() - this.startTime,
      level,
      component,
      event,
      data
    };
    
    this.logs.push(entry);
    
    // 同时输出到控制台
    const logStyle = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red'
    };
    
    console.log(
      `%c[${level.toUpperCase()}]`,
      logStyle[level],
      `${component} - ${event}`,
      data
    );
    
    return this;
  }

  // 比较两个对象并返回变化的属性
  _getChangedProps(oldObj, newObj) {
    const changes = {};
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
        changes[key] = {
          from: oldObj?.[key],
          to: newObj?.[key]
        };
      }
    });
    
    return changes;
  }

  // 清除日志
  clear() {
    this.logs = [];
    this.startTime = Date.now();
    return this;
  }

  // 导出日志为JSON
  exportLogs() {
    const exportData = {
      testId: this.testId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      logCount: this.logs.length,
      logs: this.logs
    };
    
    return exportData;
  }

  // 导出日志为格式化文本
  exportText() {
    const exportData = this.exportLogs();
    let output = `=== 测试日志 ID: ${exportData.testId} ===\n`;
    output += `开始时间: ${exportData.startTime}\n`;
    output += `结束时间: ${exportData.endTime}\n`;
    output += `持续时间: ${exportData.duration}ms\n`;
    output += `日志数量: ${exportData.logCount}\n\n`;
    
    output += `=== 详细日志 ===\n`;
    exportData.logs.forEach((log, index) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1);
      output += `[${time} +${log.timeOffset}ms] [${log.level.toUpperCase()}] ${log.component} - ${log.event}\n`;
      if (Object.keys(log.data).length > 0) {
        output += `  数据: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n  ')}\n`;
      }
      output += '\n';
    });
    
    return output;
  }

  // 复制日志到剪贴板
  copyToClipboard() {
    if (typeof navigator === 'undefined') return false;
    
    const text = this.exportText();
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => console.log('日志已复制到剪贴板'))
        .catch(err => console.error('复制失败:', err));
      return true;
    }
    
    // 回退方法
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      console.log('日志已复制到剪贴板');
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  // 下载日志为文件
  downloadLogs(filename = 'voice-test-logs.json') {
    if (typeof document === 'undefined') return false;
    
    const data = this.exportLogs();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  }
}

// 单例模式
export default new Logger(); 