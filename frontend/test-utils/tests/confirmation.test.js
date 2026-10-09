// confirmation.test.js - 确认阶段专门测试用例

/**
 * 确认阶段测试用例集合
 * 重点测试确认模态框中的语音识别功能，包括:
 * 1. 确认模态框显示后是否正确激活麦克风
 * 2. 用户说话是否正确识别并显示
 * 3. 确认/取消/重试不同意图是否正确处理
 * 4. 错误处理和超时重试
 */

export default {
  name: '确认阶段麦克风测试',
  steps: [
    // 测试准备：打开麦克风并进入确认阶段
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '查询明天深圳的天气',
      wait: 1000
    },
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '验证确认模态框内容',
      assert: {
        selector: '.confirmation-text',
        text: '天气',
        contains: true
      }
    },
    
    // 核心测试：确认模态框中的麦克风和语音识别
    {
      name: '等待TTS播报完成，确认麦克风自动激活',
      waitFor: '.microphone-active',
      timeout: 5000
    },
    {
      name: '验证麦克风已激活',
      assert: {
        selector: '.microphone-status',
        text: '听取确认中',
        contains: true
      }
    },
    {
      name: '模拟用户确认("确认")',
      speak: '确认',
      wait: 500
    },
    {
      name: '验证识别文本正确显示',
      assert: {
        selector: '.confirmation-recognized-text',
        text: '确认',
        contains: true
      },
      wait: 1000
    },
    {
      name: '等待执行结果',
      waitFor: '.result-container',
      timeout: 8000
    }
  ]
};

// 测试用户说"重试"的场景
export const retryConfirmationTest = {
  name: '确认阶段-重试测试',
  steps: [
    // 准备阶段
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '查询明天深圳的天气',
      wait: 1000
    },
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    
    // 核心测试：用户说"重试"
    {
      name: '模拟用户说"重试"',
      speak: '重试',
      wait: 1000
    },
    {
      name: '验证识别文本显示"重试"',
      assert: {
        selector: '.confirmation-recognized-text',
        text: '重试',
        contains: true
      },
      wait: 500
    },
    {
      name: '验证重新进入语音识别状态',
      waitFor: '.status-text',
      assert: {
        selector: '.status-text',
        text: '请说出您的指令',
        contains: true
      },
      timeout: 3000
    }
  ]
};

// 测试麦克风无法激活的场景
export const microphoneFailureInConfirmationTest = {
  name: '确认阶段-麦克风故障测试',
  steps: [
    // 准备阶段
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '查询明天深圳的天气',
      wait: 1000
    },
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    
    // 核心测试：模拟确认阶段麦克风故障
    {
      name: '模拟确认阶段麦克风错误',
      action: (runner) => {
        const mockSpeech = window.mockSpeech;
        if (mockSpeech && mockSpeech.recognition) {
          // 强制停止当前识别并模拟错误
          if (mockSpeech.recognition.isRecording()) {
            setTimeout(() => {
              mockSpeech.recognition.simulateError('not-allowed');
            }, 100);
          } else {
            // 如果麦克风未激活，记录错误
            runner.logger.error('测试步骤', '麦克风未处于激活状态，无法模拟错误');
          }
        }
      },
      wait: 500
    },
    {
      name: '等待麦克风错误提示',
      waitFor: '.microphone-error',
      timeout: 3000
    },
    {
      name: '验证错误提示内容',
      assert: {
        selector: '.microphone-error',
        text: '麦克风',
        contains: true
      }
    }
  ]
};

// 测试确认超时的场景
export const confirmationTimeoutTest = {
  name: '确认阶段-超时测试',
  steps: [
    // 准备阶段
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '查询明天深圳的天气',
      wait: 1000
    },
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    
    // 核心测试：模拟确认超时（不说话）
    {
      name: '模拟确认超时（等待10秒)',
      wait: 10000
    },
    {
      name: '验证显示超时提示',
      waitFor: '.timeout-message',
      timeout: 2000
    },
    {
      name: '验证超时提示内容',
      assert: {
        selector: '.timeout-message',
        text: '没有听到您的确认',
        contains: true
      }
    },
    {
      name: '验证状态重置',
      waitFor: '.status-text',
      timeout: 3000,
      assert: {
        selector: '.status-text',
        text: '空闲',
        contains: true
      }
    }
  ]
};

// 测试无法识别用户语音的场景
export const confirmationNoMatchTest = {
  name: '确认阶段-无法识别测试',
  steps: [
    // 准备阶段
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '查询明天深圳的天气',
      wait: 1000
    },
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    
    // 核心测试：模拟语音识别无法匹配
    {
      name: '模拟语音识别无法匹配',
      action: (runner) => {
        const mockSpeech = window.mockSpeech;
        if (mockSpeech && mockSpeech.recognition) {
          if (mockSpeech.recognition.isRecording()) {
            setTimeout(() => {
              mockSpeech.recognition.simulateNoMatch();
            }, 100);
          }
        }
      },
      wait: 500
    },
    {
      name: '等待无法识别提示',
      waitFor: '.no-match-message',
      timeout: 3000
    },
    {
      name: '验证提示内容',
      assert: {
        selector: '.no-match-message',
        text: '无法识别',
        contains: true
      }
    },
    {
      name: '验证麦克风重新激活',
      waitFor: '.microphone-active',
      timeout: 3000
    }
  ]
};

// 导出所有确认相关测试
export const allConfirmationTests = [
  {
    name: '确认阶段麦克风测试',
    steps: [
      // 详见主测试用例...
    ]
  },
  retryConfirmationTest,
  microphoneFailureInConfirmationTest,
  confirmationTimeoutTest,
  confirmationNoMatchTest
]; 