// index.js - 语音交互测试工具集主入口

import Logger from './Logger';
import MockSpeech from './MockSpeech';

// TestUtils类 - 方便应用中使用
class TestUtils {
  constructor() {
    this.logger = Logger;
    this.mockSpeech = MockSpeech;
  }

  // 初始化测试环境
  init() {
    this.logger.info('TestUtils', '初始化测试环境');
    this.mockSpeech.install();
    return this;
  }

  // 清理测试环境
  cleanup() {
    this.logger.info('TestUtils', '清理测试环境');
    this.mockSpeech.uninstall();
    return this;
  }

  // 下载当前日志
  downloadLogs() {
    const filename = `voice-test-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
    return this.logger.downloadLogs(filename);
  }

  // 手动测试语音输入
  testSpeech(text) {
    if (!text) return false;
    
    this.logger.info('TestUtils', '模拟语音输入', { text });
    return this.mockSpeech.speak(text);
  }
  
  // 模拟用户确认
  speakConfirmation() {
    this.logger.info('TestUtils', '模拟用户确认');
    return this.mockSpeech.speakConfirmation();
  }
  
  // 模拟用户拒绝
  speakRejection() {
    this.logger.info('TestUtils', '模拟用户拒绝');
    return this.mockSpeech.speakRejection();
  }
}

// 创建单例
const testUtils = new TestUtils();

// 添加全局访问对象
if (typeof window !== 'undefined') {
  window.testUtils = testUtils;
  console.log('语音交互测试工具已加载。使用 window.testUtils 访问');
}

// 导出测试工具和各个组件
export { Logger, MockSpeech };
export default testUtils; 