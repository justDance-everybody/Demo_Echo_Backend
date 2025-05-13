// TestRunner.js - 语音交互测试运行器
import MockSpeech from './MockSpeech';
import Logger from './Logger';
import axios from 'axios';

class TestRunner {
  constructor() {
    this.testCases = [];
    this.currentTest = null;
    this.results = [];
    this.startTime = null;
    this.apiMocks = {};
    this.originalFetch = null;
    this.originalXHR = null;
    this.config = {
      verbose: true,              // 详细日志
      autoInstallMocks: true,     // 自动安装语音模拟
      interceptNetwork: true,     // 拦截网络请求
      waitTimeBetweenSteps: 500,  // 步骤间等待时间(ms)
      defaultTimeout: 5000,       // 默认超时时间(ms)
      autoScroll: true            // 自动滚动到活动区域
    };
    
    Logger.debug('TestRunner', '测试运行器已创建');
  }

  // 设置配置项
  configure(options = {}) {
    this.config = { ...this.config, ...options };
    return this;
  }

  // 添加测试用例
  addTest(name, steps = []) {
    const testCase = {
      id: this.testCases.length + 1,
      name,
      steps,
      status: 'pending',
      startTime: null,
      endTime: null,
      duration: null,
      results: [],
      logs: []
    };
    
    this.testCases.push(testCase);
    Logger.debug('TestRunner', '添加测试用例', { id: testCase.id, name });
    return this;
  }

  // 从模块中加载测试用例
  async loadTests(testModules) {
    for (const module of testModules) {
      try {
        const testModule = typeof module === 'function' ? module() : module;
        
        if (Array.isArray(testModule)) {
          // 如果模块导出的是测试数组
          for (const test of testModule) {
            this.addTest(test.name, test.steps);
          }
        } else if (testModule && testModule.name && testModule.steps) {
          // 如果模块导出的是单个测试对象
          this.addTest(testModule.name, testModule.steps);
        } else if (testModule && typeof testModule === 'object') {
          // 如果模块导出的是包含多个测试的对象
          for (const [name, steps] of Object.entries(testModule)) {
            if (Array.isArray(steps)) {
              this.addTest(name, steps);
            }
          }
        }
      } catch (error) {
        Logger.error('TestRunner', '加载测试用例失败', { error: error.message });
      }
    }
    
    Logger.info('TestRunner', '加载测试用例完成', { count: this.testCases.length });
    return this;
  }

  // 运行所有测试
  async runAllTests() {
    if (this.testCases.length === 0) {
      Logger.warn('TestRunner', '没有测试用例可运行');
      return [];
    }
    
    Logger.info('TestRunner', '开始运行所有测试', { count: this.testCases.length });
    this.startTime = Date.now();
    this.results = [];
    
    // 安装语音模拟和网络拦截
    if (this.config.autoInstallMocks) {
      this._installMocks();
    }
    
    for (const testCase of this.testCases) {
      const result = await this.runTest(testCase.id);
      this.results.push(result);
    }
    
    // 卸载语音模拟和网络拦截
    if (this.config.autoInstallMocks) {
      this._uninstallMocks();
    }
    
    const summary = this._generateSummary();
    Logger.info('TestRunner', '所有测试完成', summary);
    
    return summary;
  }

  // 运行单个测试
  async runTest(testId) {
    const testCase = this.testCases.find(test => test.id === testId);
    if (!testCase) {
      Logger.error('TestRunner', '找不到测试用例', { testId });
      return null;
    }
    
    Logger.info('TestRunner', `开始执行测试: ${testCase.name}`, { testId });
    this.currentTest = testCase;
    testCase.startTime = Date.now();
    testCase.status = 'running';
    testCase.logs = [];
    testCase.results = [];
    
    // 将日志存储到测试用例
    const logSubscription = (log) => {
      if (this.currentTest && this.currentTest.id === testId) {
        this.currentTest.logs.push(log);
      }
    };
    
    // 添加日志观察者
    // (此实现是简化的，实际需要修改Logger实现订阅机制)
    
    try {
      // 安装语音模拟和网络拦截
      const needToInstallMocks = !this.config.autoInstallMocks;
      if (needToInstallMocks) {
        this._installMocks();
      }
      
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        const stepResult = await this._executeStep(step, i, testCase);
        testCase.results.push(stepResult);
        
        if (stepResult.status === 'failed') {
          testCase.status = 'failed';
          break;
        }
        
        // 步骤间等待
        if (i < testCase.steps.length - 1 && this.config.waitTimeBetweenSteps > 0) {
          await this._wait(this.config.waitTimeBetweenSteps);
        }
      }
      
      if (testCase.status !== 'failed') {
        testCase.status = 'passed';
      }
      
      // 卸载语音模拟和网络拦截
      if (needToInstallMocks) {
        this._uninstallMocks();
      }
    } catch (error) {
      testCase.status = 'error';
      Logger.error('TestRunner', `测试执行错误: ${error.message}`, { 
        testId, 
        error: error.message,
        stack: error.stack
      });
    } finally {
      // 移除日志观察者
      // (此实现是简化的，实际需要修改Logger实现订阅机制)
      
      testCase.endTime = Date.now();
      testCase.duration = testCase.endTime - testCase.startTime;
      this.currentTest = null;
      
      Logger.info('TestRunner', `测试执行完成: ${testCase.name}`, { 
        testId, 
        status: testCase.status,
        duration: testCase.duration
      });
    }
    
    return {
      id: testCase.id,
      name: testCase.name,
      status: testCase.status,
      duration: testCase.duration,
      stepResults: testCase.results
    };
  }

  // 执行测试步骤
  async _executeStep(step, index, testCase) {
    const stepNumber = index + 1;
    const stepName = step.name || `步骤${stepNumber}`;
    const timeout = step.timeout || this.config.defaultTimeout;
    
    Logger.info('TestRunner', `执行步骤: ${stepName}`, { step, stepNumber });
    
    const startTime = Date.now();
    const result = {
      stepNumber,
      name: stepName,
      status: 'running',
      startTime,
      endTime: null,
      duration: null,
      error: null
    };
    
    try {
      // 检查步骤类型，处理不同的操作
      if (step.action && typeof step.action === 'function') {
        // 执行自定义函数
        await Promise.race([
          step.action(this),
          new Promise((_, reject) => setTimeout(() => reject(new Error('步骤执行超时')), timeout))
        ]);
      } else if (step.speak) {
        // 模拟用户说话
        const success = MockSpeech.speak(step.speak, step.confidence || 0.9);
        if (!success) {
          throw new Error('语音模拟失败，可能麦克风未激活');
        }
      } else if (step.confirm) {
        // 模拟用户确认
        const success = MockSpeech.speakConfirmation();
        if (!success) {
          throw new Error('确认模拟失败，可能麦克风未激活');
        }
      } else if (step.reject) {
        // 模拟用户拒绝
        const success = MockSpeech.speakRejection();
        if (!success) {
          throw new Error('拒绝模拟失败，可能麦克风未激活');
        }
      } else if (step.click) {
        // 模拟点击元素
        const selector = step.click;
        const element = document.querySelector(selector);
        if (!element) {
          throw new Error(`找不到元素: ${selector}`);
        }
        
        if (this.config.autoScroll && element.scrollIntoView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await this._wait(300); // 等待滚动
        }
        
        element.click();
      } else if (step.wait) {
        // 等待指定时间
        await this._wait(typeof step.wait === 'number' ? step.wait : 1000);
      } else if (step.waitFor) {
        // 等待元素出现
        const selector = step.waitFor;
        await this._waitForElement(selector, timeout);
      } else if (step.assert) {
        // 断言
        const assertion = step.assert;
        const result = await this._executeAssertion(assertion);
        if (!result.success) {
          throw new Error(`断言失败: ${result.message}`);
        }
      } else if (step.mockApi) {
        // 模拟API响应
        this._mockApiResponse(step.mockApi.url, step.mockApi.method, step.mockApi.response, step.mockApi.status);
      } else {
        Logger.warn('TestRunner', '未知步骤类型', { step });
      }
      
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      Logger.error('TestRunner', `步骤执行失败: ${error.message}`, { 
        stepName, 
        error: error.message,
        stack: error.stack
      });
    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;
      
      Logger.info('TestRunner', `步骤执行${result.status === 'passed' ? '成功' : '失败'}: ${stepName}`, { 
        stepNumber,
        status: result.status,
        duration: result.duration
      });
    }
    
    return result;
  }

  // 执行断言
  async _executeAssertion(assertion) {
    if (typeof assertion === 'function') {
      try {
        const result = await assertion();
        return { success: Boolean(result), message: result === true ? 'OK' : '断言返回false' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
    
    if (assertion.text) {
      // 检查元素文本
      const element = document.querySelector(assertion.selector);
      if (!element) {
        return { success: false, message: `找不到元素: ${assertion.selector}` };
      }
      
      const text = element.textContent || '';
      
      if (assertion.contains) {
        return { 
          success: text.includes(assertion.text), 
          message: `元素文本不包含"${assertion.text}"` 
        };
      } else if (assertion.equals) {
        return { 
          success: text === assertion.text, 
          message: `元素文本不等于"${assertion.text}"` 
        };
      }
    }
    
    if (assertion.visible) {
      // 检查元素可见性
      const element = document.querySelector(assertion.visible);
      if (!element) {
        return { success: false, message: `找不到元素: ${assertion.visible}` };
      }
      
      const isVisible = element.offsetParent !== null;
      return { 
        success: isVisible, 
        message: `元素${isVisible ? '可见' : '不可见'}: ${assertion.visible}` 
      };
    }
    
    return { success: false, message: '未知断言类型' };
  }

  // 等待元素出现
  async _waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      
      await this._wait(100);
    }
    
    throw new Error(`等待元素超时: ${selector}`);
  }

  // 等待指定时间
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 安装语音模拟和网络拦截
  _installMocks() {
    // 安装语音模拟
    MockSpeech.install();
    
    // 安装网络拦截
    if (this.config.interceptNetwork) {
      this._installNetworkInterceptors();
    }
    
    Logger.info('TestRunner', '已安装模拟功能');
  }

  // 卸载语音模拟和网络拦截
  _uninstallMocks() {
    // 卸载语音模拟
    MockSpeech.uninstall();
    
    // 卸载网络拦截
    if (this.config.interceptNetwork) {
      this._uninstallNetworkInterceptors();
    }
    
    Logger.info('TestRunner', '已卸载模拟功能');
  }

  // 安装网络拦截器
  _installNetworkInterceptors() {
    // 保存原始的fetch和XMLHttpRequest
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest;
    
    // 拦截fetch
    window.fetch = async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const urlString = url.toString();
      
      // 检查是否有模拟响应
      const mockKey = `${method}:${urlString}`;
      const mock = this.apiMocks[mockKey];
      
      if (mock) {
        Logger.info('TestRunner', '使用模拟的fetch响应', { url: urlString, method });
        
        // 延迟模拟网络延迟
        await this._wait(mock.delay || 100);
        
        return {
          ok: mock.status >= 200 && mock.status < 300,
          status: mock.status,
          statusText: mock.statusText || '',
          json: () => Promise.resolve(mock.data),
          text: () => Promise.resolve(JSON.stringify(mock.data)),
          headers: new Headers(mock.headers || {})
        };
      }
      
      // 没有模拟，使用原始fetch
      Logger.info('TestRunner', 'fetch请求', { url: urlString, method });
      
      try {
        const response = await this.originalFetch(url, options);
        
        Logger.info('TestRunner', 'fetch响应', { 
          url: urlString, 
          method, 
          status: response.status 
        });
        
        return response;
      } catch (error) {
        Logger.error('TestRunner', 'fetch错误', { 
          url: urlString, 
          method, 
          error: error.message 
        });
        
        throw error;
      }
    };
    
    // 拦截XMLHttpRequest
    // 这里简化处理，实际可能需要更复杂的模拟
    
    Logger.debug('TestRunner', '已安装网络拦截器');
  }

  // 卸载网络拦截器
  _uninstallNetworkInterceptors() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    
    if (this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR;
      this.originalXHR = null;
    }
    
    this.apiMocks = {};
    
    Logger.debug('TestRunner', '已卸载网络拦截器');
  }

  // 模拟API响应
  _mockApiResponse(url, method = 'GET', data, status = 200, headers = {}, delay = 100) {
    const mockKey = `${method.toUpperCase()}:${url}`;
    
    this.apiMocks[mockKey] = {
      data,
      status,
      headers,
      delay
    };
    
    Logger.info('TestRunner', '已添加API模拟', { url, method });
    return this;
  }

  // 生成测试摘要
  _generateSummary() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    
    const summary = {
      total,
      passed,
      failed,
      errors,
      duration: totalDuration,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      results: this.results
    };
    
    return summary;
  }
}

export default new TestRunner(); 