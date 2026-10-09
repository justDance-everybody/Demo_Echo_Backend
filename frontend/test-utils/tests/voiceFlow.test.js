// voiceFlow.test.js - 语音交互流程测试用例

// 导出测试用例集合
export default {
  name: '语音交互流程测试',
  steps: [
    // 步骤1: 打开麦克风并说话
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button', // 假设麦克风按钮的CSS选择器
      wait: 500 // 等待500ms
    },
    {
      name: '模拟用户说话',
      speak: '帮我查询深圳明天的天气',
      wait: 1000
    },
    {
      name: '等待界面显示识别结果',
      waitFor: '.recognized-text',
      timeout: 3000
    },
    {
      name: '验证识别文本正确显示',
      assert: {
        selector: '.recognized-text',
        text: '帮我查询深圳明天的天气',
        contains: true
      }
    },
    
    // 步骤2: 系统解析意图并显示确认弹窗
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    {
      name: '验证确认模态框内容包含正确工具',
      assert: {
        selector: '.confirmation-text',
        text: '天气',
        contains: true
      }
    },
    
    // 步骤3: 用户确认操作
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    {
      name: '模拟用户确认',
      confirm: true,
      wait: 1000
    },
    
    // 步骤4: 等待执行结果
    {
      name: '等待结果显示',
      waitFor: '.result-container',
      timeout: 8000
    },
    {
      name: '验证结果中包含天气信息',
      assert: {
        selector: '.result-text',
        text: '天气',
        contains: true
      }
    },
    
    // 步骤5: 测试重置功能
    {
      name: '等待界面自动重置',
      wait: 5000
    },
    {
      name: '验证界面已重置到初始状态',
      assert: {
        selector: '.status-text',
        text: '空闲',
        contains: true
      }
    }
  ]
};

// 导出其他测试场景
export const confirmationCancelTest = {
  name: '用户取消确认测试',
  steps: [
    // 步骤1: 打开麦克风并说话
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '帮我查询深圳明天的天气',
      wait: 1000
    },
    {
      name: '等待界面显示识别结果',
      waitFor: '.recognized-text',
      timeout: 3000
    },
    
    // 步骤2: 系统解析意图并显示确认弹窗
    {
      name: '等待确认模态框出现',
      waitFor: '.confirmation-modal',
      timeout: 5000
    },
    
    // 步骤3: 用户取消操作
    {
      name: '等待TTS播报完成',
      wait: 2000
    },
    {
      name: '模拟用户取消',
      reject: true,
      wait: 1000
    },
    
    // 步骤4: 验证界面已重置
    {
      name: '验证界面已重置到初始状态',
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

export const errorHandlingTest = {
  name: '错误处理测试',
  steps: [
    // 模拟API错误情况
    {
      name: '设置API模拟响应 - 错误',
      mockApi: {
        url: '/api/v1/interpret',
        method: 'POST',
        response: {
          error: {
            code: 'SERVER_ERROR',
            message: '服务器处理请求时发生错误'
          }
        },
        status: 500
      }
    },
    {
      name: '点击麦克风按钮并说话',
      click: '.voice-recorder-button',
      wait: 500
    },
    {
      name: '模拟用户说话',
      speak: '帮我查询深圳明天的天气',
      wait: 1000
    },
    {
      name: '等待错误提示出现',
      waitFor: '.error-message',
      timeout: 5000
    },
    {
      name: '验证错误提示内容正确',
      assert: {
        selector: '.error-message',
        text: '错误',
        contains: true
      }
    }
  ]
};

export const microphonePermissionTest = {
  name: '麦克风权限测试',
  steps: [
    // 模拟麦克风权限拒绝
    {
      name: '模拟麦克风权限拒绝',
      action: (runner) => {
        // 获取MockSpeech实例
        const mockSpeech = window.mockSpeech;
        if (mockSpeech) {
          // 点击后立即模拟错误
          setTimeout(() => {
            // 模拟失败要在开始之后，所以使用自定义函数
            mockSpeech.recognition.simulateError('not-allowed');
          }, 100);
        }
      }
    },
    {
      name: '点击麦克风按钮',
      click: '.voice-recorder-button',
      wait: 1500
    },
    {
      name: '等待权限错误提示出现',
      waitFor: '.permission-error',
      timeout: 5000
    },
    {
      name: '验证权限错误提示内容正确',
      assert: {
        selector: '.permission-error',
        text: '麦克风',
        contains: true
      }
    }
  ]
};

// 导出测试集合
export const allTests = [
  {
    name: '语音交互流程测试',
    steps: [
      // 标准流程测试步骤...
    ]
  },
  confirmationCancelTest,
  errorHandlingTest,
  microphonePermissionTest
]; 