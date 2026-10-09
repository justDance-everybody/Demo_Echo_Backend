/**
 * Web Speech API Mock 方案
 * 用于在测试环境中模拟语音识别和语音合成功能
 * 解决Playwright/Cypress自动化测试环境中的Web Speech API权限问题
 */

// 全局Mock状态管理
let mockSpeechState = {
  shouldReturnResult: false,
  mockResult: '你好',
  shouldSimulateError: false,
  mockError: 'not-allowed',
  autoStopTimeout: null,
  synthesisEnabled: true,
  synthesisVoices: [
    { name: 'Chinese Female', lang: 'zh-CN', voiceURI: 'zh-CN-Female', localService: true },
    { name: 'Chinese Male', lang: 'zh-CN', voiceURI: 'zh-CN-Male', localService: true }
  ]
};

/**
 * Mock SpeechRecognition 类
 */
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.lang = 'zh-CN';
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._isStarted = false;
    this._timeoutId = null;
    
    // 保存实例供测试使用
    if (typeof window !== 'undefined') {
      window.mockRecognitionInstance = this;
    }
  }

  start() {
    if (this._isStarted) {
      const error = new Error('recognition already started');
      error.name = 'InvalidStateError';
      throw error;
    }

    this._isStarted = true;
    console.log('🎤 Mock SpeechRecognition: Starting...');

    // 模拟启动延迟
    setTimeout(() => {
      if (this.onstart) {
        this.onstart();
        console.log('🎤 Mock SpeechRecognition: Started');
      }
    }, 100);

    // 如果启用了自动停止，设置超时
    if (mockSpeechState.autoStopTimeout) {
      this._timeoutId = setTimeout(() => {
        if (this._isStarted) {
          this.stop();
        }
      }, mockSpeechState.autoStopTimeout);
    }

    // 模拟错误情况
    if (mockSpeechState.shouldSimulateError) {
      setTimeout(() => {
        if (this._isStarted && this.onerror) {
          this.onerror({ error: mockSpeechState.mockError });
          console.log('🎤 Mock SpeechRecognition: Error -', mockSpeechState.mockError);
        }
      }, 200);
    }
  }

  stop() {
    if (!this._isStarted) return;

    this._isStarted = false;
    console.log('🎤 Mock SpeechRecognition: Stopping...');

    // 清除超时
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }

    // 如果设置了返回结果，在停止时触发result事件
    if (mockSpeechState.shouldReturnResult && this.onresult) {
      setTimeout(() => {
        const event = {
          results: [{
            0: { transcript: mockSpeechState.mockResult },
            isFinal: true
          }],
          resultIndex: 0
        };
        this.onresult(event);
        console.log('🎤 Mock SpeechRecognition: Result -', mockSpeechState.mockResult);
      }, 50);
    }

    // 触发结束事件
    setTimeout(() => {
      if (this.onend) {
        this.onend();
        console.log('🎤 Mock SpeechRecognition: Ended');
      }
    }, 100);
  }

  abort() {
    this._isStarted = false;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this.onend) {
      this.onend();
    }
  }

  // 手动触发结果（用于测试）
  simulateResult(transcript) {
    if (this._isStarted && this.onresult) {
      const event = {
        results: [{
          0: { transcript: transcript },
          isFinal: true
        }],
        resultIndex: 0
      };
      this.onresult(event);
      console.log('🎤 Mock SpeechRecognition: Manual Result -', transcript);
    }
  }

  // 手动触发错误（用于测试）
  simulateError(error) {
    if (this._isStarted && this.onerror) {
      this.onerror({ error: error });
      console.log('🎤 Mock SpeechRecognition: Manual Error -', error);
    }
  }
}

/**
 * Mock SpeechSynthesis 类
 */
class MockSpeechSynthesis {
  constructor() {
    this.pending = false;
    this.speaking = false;
    this.paused = false;
    this.onvoiceschanged = null;
    this._voices = mockSpeechState.synthesisVoices;
  }

  speak(utterance) {
    if (!mockSpeechState.synthesisEnabled) {
      console.log('🔊 Mock SpeechSynthesis: Disabled');
      return;
    }

    console.log('🔊 Mock SpeechSynthesis: Speaking -', utterance.text);
    this.speaking = true;
    this.pending = true;

    // 模拟开始事件
    setTimeout(() => {
      if (utterance.onstart) {
        utterance.onstart();
      }
    }, 50);

    // 模拟结束事件
    setTimeout(() => {
      this.speaking = false;
      this.pending = false;
      if (utterance.onend) {
        utterance.onend();
      }
    }, 1000 + utterance.text.length * 50); // 模拟说话时间
  }

  cancel() {
    this.speaking = false;
    this.pending = false;
    console.log('🔊 Mock SpeechSynthesis: Cancelled');
  }

  pause() {
    this.paused = true;
    console.log('🔊 Mock SpeechSynthesis: Paused');
  }

  resume() {
    this.paused = false;
    console.log('🔊 Mock SpeechSynthesis: Resumed');
  }

  getVoices() {
    return this._voices;
  }
}

/**
 * Mock SpeechSynthesisUtterance 类
 */
class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text || '';
    this.lang = 'zh-CN';
    this.voice = null;
    this.volume = 1;
    this.rate = 1;
    this.pitch = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onpause = null;
    this.onresume = null;
    this.onmark = null;
    this.onboundary = null;
  }
}

/**
 * 安装Mock到全局window对象
 */
export function installMockWebSpeechAPI() {
  if (typeof window === 'undefined') {
    console.warn('Mock Web Speech API: window对象不存在，跳过安装');
    return;
  }

  // 检查是否已经安装
  if (window.mockWebSpeechAPIInstalled) {
    console.log('Mock Web Speech API: 已安装，跳过重复安装');
    return;
  }

  console.log('🎯 Installing Mock Web Speech API...');

  // 安装Speech Recognition Mock
  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;

  // 安装Speech Synthesis Mock
  window.speechSynthesis = new MockSpeechSynthesis();
  window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

  // 标记已安装
  window.mockWebSpeechAPIInstalled = true;

  console.log('✅ Mock Web Speech API installed successfully!');
}

/**
 * 卸载Mock，恢复原始API
 */
export function uninstallMockWebSpeechAPI() {
  if (typeof window === 'undefined') return;

  console.log('🔄 Uninstalling Mock Web Speech API...');

  // 删除Mock标记
  delete window.mockWebSpeechAPIInstalled;

  // 恢复原始API（如果存在）
  if (window.originalSpeechRecognition) {
    window.SpeechRecognition = window.originalSpeechRecognition;
    delete window.originalSpeechRecognition;
  }
  if (window.originalWebkitSpeechRecognition) {
    window.webkitSpeechRecognition = window.originalWebkitSpeechRecognition;
    delete window.originalWebkitSpeechRecognition;
  }
  if (window.originalSpeechSynthesis) {
    window.speechSynthesis = window.originalSpeechSynthesis;
    delete window.originalSpeechSynthesis;
  }
  if (window.originalSpeechSynthesisUtterance) {
    window.SpeechSynthesisUtterance = window.originalSpeechSynthesisUtterance;
    delete window.originalSpeechSynthesisUtterance;
  }

  console.log('✅ Mock Web Speech API uninstalled successfully!');
}

/**
 * 配置Mock行为的工具函数
 */
export const mockWebSpeechConfig = {
  // 设置语音识别是否返回结果
  setShouldReturnResult: (should, result = '你好') => {
    mockSpeechState.shouldReturnResult = should;
    mockSpeechState.mockResult = result;
    console.log(`🎯 Mock配置: 返回结果 = ${should}, 结果 = "${result}"`);
  },

  // 设置语音识别是否模拟错误
  setShouldSimulateError: (should, error = 'not-allowed') => {
    mockSpeechState.shouldSimulateError = should;
    mockSpeechState.mockError = error;
    console.log(`🎯 Mock配置: 模拟错误 = ${should}, 错误 = "${error}"`);
  },

  // 设置自动停止超时
  setAutoStopTimeout: (timeout) => {
    mockSpeechState.autoStopTimeout = timeout;
    console.log(`🎯 Mock配置: 自动停止超时 = ${timeout}ms`);
  },

  // 设置语音合成是否启用
  setSynthesisEnabled: (enabled) => {
    mockSpeechState.synthesisEnabled = enabled;
    console.log(`🎯 Mock配置: 语音合成 = ${enabled}`);
  },

  // 获取当前Mock状态
  getState: () => ({ ...mockSpeechState }),

  // 重置Mock状态
  reset: () => {
    mockSpeechState = {
      shouldReturnResult: false,
      mockResult: '你好',
      shouldSimulateError: false,
      mockError: 'not-allowed',
      autoStopTimeout: null,
      synthesisEnabled: true,
      synthesisVoices: [
        { name: 'Chinese Female', lang: 'zh-CN', voiceURI: 'zh-CN-Female', localService: true },
        { name: 'Chinese Male', lang: 'zh-CN', voiceURI: 'zh-CN-Male', localService: true }
      ]
    };
    console.log('🎯 Mock配置: 已重置');
  }
};

/**
 * 自动安装Mock（如果在测试环境中）
 */
if (typeof window !== 'undefined' && 
    (window.Cypress || window.playwright || process.env.NODE_ENV === 'test')) {
  installMockWebSpeechAPI();
}

export default {
  installMockWebSpeechAPI,
  uninstallMockWebSpeechAPI,
  mockWebSpeechConfig,
  MockSpeechRecognition,
  MockSpeechSynthesis,
  MockSpeechSynthesisUtterance
}; 