// AutomatedTest.js - 语音AI前端自动化测试场景

/**
 * 语音AI前端自动化测试场景定义
 * 
 * 本文件定义了多种测试场景：
 * 1. 基础语音识别测试 - 测试基本的语音识别和处理流程
 * 2. 错误处理测试 - 测试各种错误情况的处理
 * 3. 直接回复测试 - 测试无需确认的直接回复场景
 * 4. 用户确认/取消测试 - 测试用户确认或取消操作的场景
 * 5. 认证流程测试 - 测试用户登录和注册流程
 * 6. 主题切换测试 - 测试深色/浅色主题切换
 * 7. 服务页面测试 - 测试服务列表和功能
 * 8. 响应式布局测试 - 测试不同设备尺寸下的布局
 */

import MockSpeech from '../test-utils/MockSpeech';
import Logger from '../test-utils/Logger';
import { fullVoiceDialogueTest, authenticationTest, themeToggleTest } from '../test-utils/tests/comprehensive.test.js';
import { servicePageLoadTest, responsiveLayoutTest } from '../test-utils/tests/service.test.js';

// 模拟API响应
const mockAPIResponses = {
  // 模拟interpret API的响应 - 确认场景
  interpretConfirm: {
    type: "confirm",
    action: "weatherQuery",
    params: { location: "北京", date: "今天" },
    confirmText: "您是想查询北京今天的天气吗？"
  },
  
  // 模拟interpret API的响应 - 直接回复场景
  interpretDirect: {
    type: "direct_reply",
    replyText: "现在是北京时间14:30，星期三。"
  },
  
  // 模拟interpret API的响应 - 错误场景
  interpretError: {
    type: "error",
    error: {
      code: "INVALID_QUERY",
      message: "无法理解您的请求，请重新表述。"
    }
  },
  
  // 模拟execute API的响应
  executeSuccess: {
    success: true,
    data: {
      result: "北京今天多云转晴，气温20-28度，空气质量良好。"
    }
  },
  
  // 模拟execute API的错误响应
  executeError: {
    success: false,
    error: {
      code: "EXEC_FAIL",
      message: "服务暂时不可用，请稍后再试。"
    }
  }
};

// 基础语音识别测试场景
export const basicSpeechTest = {
  name: "基础语音识别测试",
  description: "测试基本的语音识别和处理流程，包含语音输入、确认和结果显示",
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
  description: "测试各种错误情况的处理，包括语音识别错误、API错误等",
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

// 直接回复测试场景
export const directReplyTest = {
  name: "直接回复测试",
  description: "测试不需要用户确认的直接回复场景",
  steps: [
    {
      name: "初始化麦克风",
      action: () => MockSpeech.install()
    },
    {
      name: "模拟用户说话",
      action: () => MockSpeech.speak("现在几点了")
    },
    {
      name: "清理测试环境",
      action: () => MockSpeech.uninstall()
    }
  ]
};

// 用户确认/取消测试场景
export const userConfirmationTest = {
  name: "用户确认/取消测试",
  description: "测试用户确认或取消操作的场景",
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
      name: "模拟用户取消",
      action: () => MockSpeech.speakRejection()
    },
    {
      name: "清理测试环境",
      action: () => MockSpeech.uninstall()
    }
  ]
};

// TTS功能测试场景
export const ttsTest = {
  name: "语音合成(TTS)测试",
  description: "测试文本转语音功能，包括播放、暂停和取消",
  steps: [
    {
      name: "初始化语音合成",
      action: () => {
        return MockSpeech.install();
      }
    },
    {
      name: "测试语音播报",
      action: () => {
        // 创建一个测试语音实例
        const utterance = new window.SpeechSynthesisUtterance("这是一条测试语音消息，用于验证TTS功能是否正常工作。");
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // 添加事件处理
        utterance.onstart = () => {
          Logger.info('Test', 'TTS播放开始');
        };
        
        utterance.onend = () => {
          Logger.info('Test', 'TTS播放结束');
        };
        
        window.speechSynthesis.speak(utterance);
        Logger.info('Test', '已发送TTS播放请求');
        
        return true;
      }
    },
    {
      name: "测试TTS暂停和恢复",
      action: () => {
        // 暂停播放
        window.speechSynthesis.pause();
        Logger.info('Test', 'TTS已暂停');
        
        // 等待一会后恢复
        setTimeout(() => {
          window.speechSynthesis.resume();
          Logger.info('Test', 'TTS已恢复');
        }, 500);
        
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "测试TTS取消",
      action: () => {
        window.speechSynthesis.cancel();
        Logger.info('Test', 'TTS已取消');
        return true;
      }
    },
    {
      name: "清理测试环境",
      action: () => {
        return MockSpeech.uninstall();
      }
    }
  ]
};

// 导出所有测试场景
export default [
  basicSpeechTest,
  errorHandlingTest,
  directReplyTest,
  userConfirmationTest,
  ttsTest,
  fullVoiceDialogueTest,
  authenticationTest,
  themeToggleTest,
  servicePageLoadTest,
  responsiveLayoutTest
]; 