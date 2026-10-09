// index.js - 语音交互测试工具集主入口

import Logger from './Logger';
import MockSpeech from './MockSpeech';
import TestRunner from './TestRunner';
import TestReporter from './TestReporter';

// 导入测试用例
import VoiceFlowTest, { 
  confirmationCancelTest, 
  errorHandlingTest, 
  microphonePermissionTest,
  allTests as allVoiceFlowTests 
} from './tests/voiceFlow.test';

import ConfirmationTest, {
  retryConfirmationTest,
  microphoneFailureInConfirmationTest,
  confirmationTimeoutTest,
  confirmationNoMatchTest,
  allConfirmationTests
} from './tests/confirmation.test';

// TestUtils类 - 方便应用中使用
class TestUtils {
  constructor() {
    this.logger = Logger;
    this.mockSpeech = MockSpeech;
    this.runner = TestRunner;
    this.reporter = TestReporter;
    
    // 测试用例集合
    this.tests = {
      // 语音流程测试
      voiceFlow: VoiceFlowTest,
      confirmationCancel: confirmationCancelTest,
      errorHandling: errorHandlingTest,
      microphonePermission: microphonePermissionTest,
      allVoiceFlowTests,
      
      // 确认阶段测试
      confirmation: ConfirmationTest,
      retryConfirmation: retryConfirmationTest,
      microphoneFailureInConfirmation: microphoneFailureInConfirmationTest,
      confirmationTimeout: confirmationTimeoutTest,
      confirmationNoMatch: confirmationNoMatchTest,
      allConfirmationTests
    };
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

  // 运行指定测试
  async runTest(testName) {
    if (!testName || !this.tests[testName]) {
      this.logger.error('TestUtils', '无效的测试名称', { testName });
      return null;
    }
    
    const test = this.tests[testName];
    this.runner.addTest(test.name, test.steps);
    const result = await this.runner.runTest(1);
    this.reporter.showTestResult(result);
    return result;
  }

  // 运行所有测试
  async runAllTests() {
    // 清空现有测试
    this.runner.testCases = [];
    
    // 添加所有测试
    const allTests = [
      ...allVoiceFlowTests,
      ...allConfirmationTests
    ];
    
    this.logger.info('TestUtils', '加载所有测试', { count: allTests.length });
    
    // 逐个添加测试
    allTests.forEach(test => {
      this.runner.addTest(test.name, test.steps);
    });
    
    // 运行测试并显示报告
    const results = await this.runner.runAllTests();
    this.reporter.showReport(results);
    return results;
  }

  // 显示测试调试面板
  showDebugPanel() {
    const container = document.createElement('div');
    container.className = 'test-debug-panel';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 10px;
      width: 250px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    const title = document.createElement('h3');
    title.textContent = '语音交互测试面板';
    title.style.margin = '0 0 10px 0';
    container.appendChild(title);
    
    // 添加测试选择器
    const testSelect = document.createElement('select');
    testSelect.style.width = '100%';
    testSelect.style.marginBottom = '10px';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- 选择测试 --';
    testSelect.appendChild(defaultOption);
    
    // 添加测试选项
    Object.entries(this.tests).forEach(([key, test]) => {
      if (Array.isArray(test)) return; // 跳过数组类型
      
      const option = document.createElement('option');
      option.value = key;
      option.textContent = test.name || key;
      testSelect.appendChild(option);
    });
    
    container.appendChild(testSelect);
    
    // 添加按钮
    const runBtn = document.createElement('button');
    runBtn.textContent = '运行选中测试';
    runBtn.style.marginRight = '5px';
    runBtn.onclick = () => {
      const selectedTest = testSelect.value;
      if (selectedTest) {
        this.runTest(selectedTest);
      }
    };
    
    const runAllBtn = document.createElement('button');
    runAllBtn.textContent = '运行所有测试';
    runAllBtn.onclick = () => this.runAllTests();
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.marginBottom = '10px';
    buttonContainer.appendChild(runBtn);
    buttonContainer.appendChild(runAllBtn);
    container.appendChild(buttonContainer);
    
    // 添加工具按钮
    const toolsContainer = document.createElement('div');
    toolsContainer.style.display = 'flex';
    toolsContainer.style.justifyContent = 'space-between';
    
    const showLogsBtn = document.createElement('button');
    showLogsBtn.textContent = '显示日志';
    showLogsBtn.onclick = () => this.reporter.showLogs();
    
    const clearLogsBtn = document.createElement('button');
    clearLogsBtn.textContent = '清除日志';
    clearLogsBtn.onclick = () => this.logger.clear();
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.onclick = () => document.body.removeChild(container);
    
    toolsContainer.appendChild(showLogsBtn);
    toolsContainer.appendChild(clearLogsBtn);
    toolsContainer.appendChild(closeBtn);
    container.appendChild(toolsContainer);
    
    document.body.appendChild(container);
    return container;
  }

  // 下载当前日志
  downloadLogs() {
    const filename = `voice-test-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const data = this.logger.exportLogs();
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

  // 手动测试指定组件
  testComponent(componentName, element) {
    if (!componentName || !element) {
      this.logger.error('TestUtils', '无效的组件测试参数', { componentName });
      return false;
    }
    
    this.logger.info('TestUtils', '开始组件测试', { componentName });
    
    switch (componentName.toLowerCase()) {
      case 'voice':
      case 'voicerecorder':
        // 测试语音录制
        if (typeof element.click === 'function') {
          element.click();
          setTimeout(() => {
            this.mockSpeech.speak('这是一个语音录制组件测试');
          }, 500);
          return true;
        }
        break;
        
      case 'confirmation':
      case 'confirm':
        // 测试确认模态框
        if (element.style) {
          element.style.display = 'block';
          setTimeout(() => {
            this.mockSpeech.speakConfirmation();
          }, 1000);
          return true;
        }
        break;
        
      default:
        this.logger.warn('TestUtils', '未知的组件测试类型', { componentName });
        return false;
    }
    
    return false;
  }
}

// 创建单例
const testUtils = new TestUtils();

// 添加全局访问对象
if (typeof window !== 'undefined') {
  window.testUtils = testUtils;
  console.log('语音交互测试工具已加载。使用 window.testUtils 访问，或 window.testUtils.showDebugPanel() 打开测试面板');
}

// 导出测试工具和各个组件
export { Logger, MockSpeech, TestRunner, TestReporter };
export default testUtils; 