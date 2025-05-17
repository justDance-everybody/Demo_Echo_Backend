// index.js - 语音交互测试工具集主入口

import Logger from './Logger';
import MockSpeech from './MockSpeech';
// 预先导入所有测试集
import allComprehensiveTests from './tests/comprehensive.test';
import allServiceTests from './tests/service.test';
// 导入端到端测试
import allServiceViewTests from './e2e/ServiceViewModeTest';

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

/**
 * 运行单个测试
 * @param {Object} test 测试配置对象
 * @returns {Promise<boolean>} 测试结果
 */
export async function runTest(test) {
  Logger.info('TestRunner', `开始运行测试: ${test.name}`);
  Logger.info('TestRunner', test.description);
  
  let success = true;
  let currentStep = 0;
  
  try {
    // 按顺序执行每个测试步骤
    for (const step of test.steps) {
      currentStep++;
      Logger.info('TestRunner', `步骤 ${currentStep}/${test.steps.length}: ${step.name}`);
      
      try {
        await step.action();
        Logger.success('TestRunner', `步骤 ${currentStep} 通过: ${step.name}`);
      } catch (error) {
        Logger.error('TestRunner', `步骤 ${currentStep} 失败: ${step.name}`, error);
        success = false;
        break;
      }
    }
    
    if (success) {
      Logger.success('TestRunner', `测试通过: ${test.name}`);
    } else {
      Logger.error('TestRunner', `测试失败: ${test.name} (在步骤 ${currentStep}/${test.steps.length})`);
    }
  } catch (error) {
    Logger.error('TestRunner', `测试执行中断: ${test.name}`, error);
    success = false;
  }
  
  return success;
}

/**
 * 运行一组测试
 * @param {Array} tests 测试数组
 * @returns {Promise<Object>} 测试结果统计
 */
export async function runTestSuite(tests) {
  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    details: []
  };
  
  Logger.info('TestRunner', `开始运行测试套件，共 ${tests.length} 个测试`);
  
  for (const test of tests) {
    const success = await runTest(test);
    
    results.details.push({
      name: test.name,
      success
    });
    
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  Logger.info('TestRunner', `测试套件运行完成。通过: ${results.passed}，失败: ${results.failed}`);
  return results;
}

/**
 * 获取所有可用的测试集合
 * @returns {Object} 所有测试集合
 */
export function getAllTests() {
  return {
    comprehensive: allComprehensiveTests,
    services: allServiceTests,
    serviceView: allServiceViewTests
  };
}

// 导出测试工具
const exports = {
  Logger,
  MockSpeech
};

// 支持CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
}

// 支持ESM
export { Logger, MockSpeech };
export default exports; 