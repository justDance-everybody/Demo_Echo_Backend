// comprehensive.test.js - 综合功能测试场景

import MockSpeech from '../MockSpeech';
import Logger from '../Logger';

// 模拟API响应
const mockAPIResponses = {
  // 模拟用户登录响应
  loginSuccess: {
    success: true,
    token: "mock-jwt-token-12345",
    user: {
      id: "user123",
      username: "testuser",
      email: "test@example.com"
    }
  },
  
  // 模拟语音意图识别响应
  interpretWeather: {
    type: "confirm",
    action: "weatherQuery",
    params: { location: "上海", date: "明天" },
    confirmText: "您是想查询上海明天的天气吗？"
  },
  
  // 模拟语音意图执行响应
  executeWeather: {
    success: true,
    data: {
      result: "上海明天多云，气温22-29度，有短时阵雨，建议带伞。"
    }
  },
  
  // 模拟服务列表响应
  servicesListSuccess: {
    success: true,
    data: [
      { id: "1", name: "天气查询", icon: "WeatherOutlined", description: "查询全球各地天气情况" },
      { id: "2", name: "日程管理", icon: "CalendarOutlined", description: "管理您的日程安排" },
      { id: "3", name: "闹钟提醒", icon: "ClockCircleOutlined", description: "设置提醒和闹钟" }
    ]
  }
};

// 完整语音对话测试
export const fullVoiceDialogueTest = {
  name: "完整语音对话流程测试",
  description: "测试从语音输入到确认再到结果显示的完整流程",
  steps: [
    {
      name: "初始化麦克风",
      action: () => {
        Logger.info('Test', '初始化麦克风和模拟API');
        return MockSpeech.install();
      }
    },
    {
      name: "模拟用户语音输入",
      action: () => {
        Logger.info('Test', '用户说: "上海明天天气怎么样"');
        return MockSpeech.speak("上海明天天气怎么样");
      }
    },
    {
      name: "等待确认提示",
      action: () => new Promise(resolve => setTimeout(resolve, 1000))
    },
    {
      name: "模拟用户确认",
      action: () => {
        Logger.info('Test', '用户确认: "是的"');
        return MockSpeech.speakConfirmation();
      }
    },
    {
      name: "等待结果显示",
      action: () => new Promise(resolve => setTimeout(resolve, 1500))
    },
    {
      name: "验证结果显示",
      action: () => {
        const resultElement = document.querySelector('.result-display') || 
                             document.querySelector('.speech-result') ||
                             document.querySelector('.response-area');
        
        if (!resultElement) {
          throw new Error('找不到结果显示元素');
        }
        
        Logger.info('Test', '检查结果显示', { 
          elementFound: true, 
          content: resultElement.textContent 
        });
        
        return true;
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

// 认证流程测试
export const authenticationTest = {
  name: "用户认证流程测试",
  description: "测试登录表单和认证逻辑",
  steps: [
    {
      name: "导航到登录页",
      action: () => {
        // 如果当前不在登录页，则导航到登录页
        if (!window.location.href.includes('/auth')) {
          window.location.href = '/auth';
        }
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "填写登录表单",
      action: () => {
        const usernameInput = document.querySelector('input[name="username"]');
        const passwordInput = document.querySelector('input[name="password"]');
        
        if (!usernameInput || !passwordInput) {
          throw new Error('找不到登录表单字段');
        }
        
        // 模拟用户输入
        usernameInput.value = 'testuser';
        passwordInput.value = 'password123';
        
        // 触发input事件
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        Logger.info('Test', '填写登录表单', { 
          username: 'testuser',
          password: '******'
        });
        
        return true;
      }
    },
    {
      name: "提交登录表单",
      action: () => {
        const loginButton = document.querySelector('button[type="submit"]') || 
                           document.querySelector('.login-button') ||
                           Array.from(document.querySelectorAll('button'))
                              .find(btn => btn.textContent.includes('登录'));
        
        if (!loginButton) {
          throw new Error('找不到登录按钮');
        }
        
        // 点击登录按钮
        loginButton.click();
        Logger.info('Test', '点击登录按钮');
        
        return new Promise(resolve => setTimeout(resolve, 1500));
      }
    },
    {
      name: "验证重定向到首页",
      action: () => {
        if (!window.location.href.includes('/user') && 
            !window.location.href.includes('/')) {
          throw new Error('登录后未重定向到用户页面');
        }
        
        Logger.info('Test', '验证登录成功', { 
          currentPath: window.location.pathname 
        });
        
        return true;
      }
    }
  ]
};

// 主题切换测试
export const themeToggleTest = {
  name: "主题切换测试",
  description: "测试深色模式和浅色模式切换",
  steps: [
    {
      name: "查找主题切换按钮",
      action: () => {
        const themeToggle = document.querySelector('.theme-toggle') ||
                           document.querySelector('[aria-label="切换主题"]') ||
                           Array.from(document.querySelectorAll('button'))
                              .find(btn => btn.textContent.includes('主题') || 
                                   btn.querySelector('svg[data-icon="moon"]') ||
                                   btn.querySelector('svg[data-icon="sun"]'));
        
        if (!themeToggle) {
          throw new Error('找不到主题切换按钮');
        }
        
        // 存储全局变量以便后续步骤使用
        window._testThemeToggle = themeToggle;
        
        Logger.info('Test', '找到主题切换按钮');
        return true;
      }
    },
    {
      name: "记录当前主题",
      action: () => {
        // 获取当前主题
        const currentTheme = document.body.getAttribute('data-theme') || 
                            document.documentElement.getAttribute('data-theme') ||
                            (window.getComputedStyle(document.body).backgroundColor.includes('rgb(255') ? 'light' : 'dark');
        
        // 存储原始主题以便后面恢复
        window._testOriginalTheme = currentTheme;
        
        Logger.info('Test', '记录当前主题', { theme: currentTheme });
        return true;
      }
    },
    {
      name: "切换主题",
      action: () => {
        if (!window._testThemeToggle) {
          throw new Error('主题切换按钮未找到');
        }
        
        // 点击主题切换按钮
        window._testThemeToggle.click();
        Logger.info('Test', '点击主题切换按钮');
        
        return new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: "验证主题已切换",
      action: () => {
        const newTheme = document.body.getAttribute('data-theme') || 
                        document.documentElement.getAttribute('data-theme') ||
                        (window.getComputedStyle(document.body).backgroundColor.includes('rgb(255') ? 'light' : 'dark');
        
        if (newTheme === window._testOriginalTheme) {
          throw new Error('主题未发生变化');
        }
        
        Logger.info('Test', '验证主题已切换', { 
          originalTheme: window._testOriginalTheme,
          newTheme
        });
        
        return true;
      }
    },
    {
      name: "恢复原始主题",
      action: () => {
        // 如果与原主题不同，再次点击切换回去
        const currentTheme = document.body.getAttribute('data-theme') || 
                            document.documentElement.getAttribute('data-theme') ||
                            (window.getComputedStyle(document.body).backgroundColor.includes('rgb(255') ? 'light' : 'dark');
        
        if (currentTheme !== window._testOriginalTheme) {
          window._testThemeToggle.click();
          Logger.info('Test', '恢复原始主题');
        }
        
        // 清理测试变量
        delete window._testThemeToggle;
        delete window._testOriginalTheme;
        
        return true;
      }
    }
  ]
};

// 导出所有测试
export const allComprehensiveTests = [
  fullVoiceDialogueTest,
  authenticationTest,
  themeToggleTest
];

export default allComprehensiveTests; 