// voiceFlow.test.js - 语音流程测试场景

import MockSpeech from '../MockSpeech';
import Logger from '../Logger';

// 基础语音识别测试场景
export const basicVoiceFlowTest = {
  name: "基础语音识别测试",
  description: "测试基本的语音识别和处理流程",
  steps: [
    {
      name: "初始化麦克风",
      action: () => {
        Logger.info('Test', '初始化麦克风');
        return MockSpeech.install();
      }
    },
    {
      name: "模拟用户说话",
      action: () => {
        Logger.info('Test', '用户说: "北京今天天气怎么样"');
        return MockSpeech.speak("北京今天天气怎么样");
      }
    },
    {
      name: "模拟用户确认",
      action: () => {
        Logger.info('Test', '用户进行确认');
        return MockSpeech.speakConfirmation();
      }
    },
    {
      name: "清理测试环境",
      action: () => {
        Logger.info('Test', '清理测试环境');
        return MockSpeech.uninstall();
      }
    }
  ]
};

// 错误处理测试场景
export const errorHandlingTest = {
  name: "错误处理测试",
  description: "测试麦克风错误和识别错误的处理",
  steps: [
    {
      name: "初始化麦克风",
      action: () => MockSpeech.install()
    },
    {
      name: "模拟麦克风错误",
      action: () => MockSpeech.recognition.simulateError('not-allowed')
    },
    {
      name: "清理测试环境",
      action: () => MockSpeech.uninstall()
    }
  ]
};

// 用户确认取消测试
export const confirmationCancelTest = {
  name: "用户确认取消测试",
  description: "测试用户取消确认场景",
  steps: [
    {
      name: "初始化麦克风",
      action: () => MockSpeech.install()
    },
    {
      name: "模拟用户说话",
      action: () => MockSpeech.speak("转账1000元给张三")
    },
    {
      name: "模拟用户拒绝确认",
      action: () => MockSpeech.speakRejection()
    },
    {
      name: "清理测试环境",
      action: () => MockSpeech.uninstall()
    }
  ]
};

// 麦克风权限测试
export const microphonePermissionTest = {
  name: "麦克风权限测试",
  description: "测试麦克风权限错误处理",
  steps: [
    {
      name: "初始化麦克风",
      action: () => MockSpeech.install()
    },
    {
      name: "模拟权限错误",
      action: () => MockSpeech.recognition.simulateError('not-allowed')
    },
    {
      name: "清理测试环境",
      action: () => MockSpeech.uninstall()
    }
  ]
};

// 导出所有测试
export const allTests = [
  basicVoiceFlowTest,
  errorHandlingTest,
  confirmationCancelTest,
  microphonePermissionTest
];

export default basicVoiceFlowTest; 