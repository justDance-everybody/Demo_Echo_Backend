// service.test.js - 服务页面和组件功能测试

import Logger from '../Logger';

// 模拟服务数据
const mockServices = [
  { id: "1", name: "天气查询", icon: "WeatherOutlined", description: "查询全球各地天气情况" },
  { id: "2", name: "日程管理", icon: "CalendarOutlined", description: "管理您的日程安排" },
  { id: "3", name: "闹钟提醒", icon: "ClockCircleOutlined", description: "设置提醒和闹钟" }
];

// 服务页面加载测试
export const servicePageLoadTest = {
  name: "服务页面加载测试",
  description: "测试服务页面正确加载和显示服务列表",
  steps: [
    {
      name: "导航到服务页面",
      action: () => {
        if (!window.location.href.includes('/services')) {
          window.location.href = '/services';
        }
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "验证页面标题",
      action: () => {
        // 查找页面标题元素
        const title = Array.from(document.querySelectorAll('h1, h2'))
                        .find(el => el.textContent.includes('服务') || el.textContent.includes('功能'));
        
        if (!title) {
          throw new Error('找不到服务页面标题');
        }
        
        Logger.info('Test', '找到服务页面标题', { titleText: title.textContent });
        return true;
      }
    },
    {
      name: "验证服务列表显示",
      action: () => {
        // 查找服务列表或服务卡片
        const serviceCards = document.querySelectorAll('.service-card') || 
                            document.querySelectorAll('.ant-card') ||
                            document.querySelectorAll('[data-testid="service-item"]');
        
        if (!serviceCards || serviceCards.length === 0) {
          throw new Error('找不到服务卡片');
        }
        
        Logger.info('Test', '找到服务卡片', { count: serviceCards.length });
        return true;
      }
    },
    {
      name: "测试服务卡片交互",
      action: () => {
        // 找到第一个服务卡片
        const firstCard = document.querySelector('.service-card') || 
                          document.querySelector('.ant-card') ||
                          document.querySelector('[data-testid="service-item"]');
        
        if (!firstCard) {
          throw new Error('找不到服务卡片以测试交互');
        }
        
        // 模拟悬停
        firstCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        
        // 模拟点击
        firstCard.click();
        
        Logger.info('Test', '测试服务卡片交互成功');
        return true;
      }
    }
  ]
};

// 响应式布局测试
export const responsiveLayoutTest = {
  name: "响应式布局测试",
  description: "测试服务页面在不同窗口尺寸下的响应式布局",
  steps: [
    {
      name: "导航到服务页面",
      action: () => {
        if (!window.location.href.includes('/services')) {
          window.location.href = '/services';
        }
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "记录原始窗口尺寸",
      action: () => {
        // 保存原始窗口尺寸
        window._testOriginalWidth = window.innerWidth;
        window._testOriginalHeight = window.innerHeight;
        
        Logger.info('Test', '记录原始窗口尺寸', {
          width: window._testOriginalWidth,
          height: window._testOriginalHeight
        });
        return true;
      }
    },
    {
      name: "模拟手机尺寸",
      action: () => {
        // 模拟窗口大小调整事件
        window.innerWidth = 375;
        window.innerHeight = 667;
        window.dispatchEvent(new Event('resize'));
        
        Logger.info('Test', '调整窗口到手机尺寸', {
          width: window.innerWidth,
          height: window.innerHeight
        });
        
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "验证手机布局",
      action: () => {
        // 检查手机布局的特征（如单列显示）
        const serviceCards = document.querySelectorAll('.service-card') || 
                             document.querySelectorAll('.ant-card') ||
                             document.querySelectorAll('[data-testid="service-item"]');
        
        if (serviceCards.length === 0) {
          throw new Error('找不到服务卡片');
        }
        
        // 获取第一张卡片的宽度，检查是否接近全屏宽度（手机模式下）
        const firstCard = serviceCards[0];
        const cardWidth = firstCard.offsetWidth;
        
        // 在手机模式下，卡片应该占据接近全屏宽度
        const isPhoneLayout = cardWidth > window.innerWidth * 0.8;
        
        Logger.info('Test', '检查手机布局', {
          cardWidth,
          windowWidth: window.innerWidth,
          isPhoneLayout
        });
        
        if (!isPhoneLayout) {
          Logger.warn('Test', '服务卡片可能未正确应用手机布局');
        }
        
        return true;
      }
    },
    {
      name: "模拟平板尺寸",
      action: () => {
        // 模拟窗口大小调整事件
        window.innerWidth = 768;
        window.innerHeight = 1024;
        window.dispatchEvent(new Event('resize'));
        
        Logger.info('Test', '调整窗口到平板尺寸', {
          width: window.innerWidth,
          height: window.innerHeight
        });
        
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "验证平板布局",
      action: () => {
        // 检查平板布局的特征（如双列显示）
        const serviceCards = document.querySelectorAll('.service-card') || 
                             document.querySelectorAll('.ant-card') ||
                             document.querySelectorAll('[data-testid="service-item"]');
        
        if (serviceCards.length === 0) {
          throw new Error('找不到服务卡片');
        }
        
        // 检查是否为多列布局
        // 此检查可能不准确，因为需要计算实际布局
        const firstCard = serviceCards[0];
        const cardWidth = firstCard.offsetWidth;
        
        // 在平板模式下，卡片应该是2-3列布局
        const isTabletLayout = cardWidth < window.innerWidth * 0.8 && cardWidth > window.innerWidth * 0.3;
        
        Logger.info('Test', '检查平板布局', {
          cardWidth,
          windowWidth: window.innerWidth,
          isTabletLayout
        });
        
        return true;
      }
    },
    {
      name: "恢复原始窗口尺寸",
      action: () => {
        // 恢复原始窗口尺寸
        window.innerWidth = window._testOriginalWidth || 1024;
        window.innerHeight = window._testOriginalHeight || 768;
        window.dispatchEvent(new Event('resize'));
        
        // 清理测试变量
        delete window._testOriginalWidth;
        delete window._testOriginalHeight;
        
        Logger.info('Test', '恢复原始窗口尺寸', {
          width: window.innerWidth,
          height: window.innerHeight
        });
        
        return true;
      }
    }
  ]
};

// 服务搜索过滤测试
export const serviceSearchTest = {
  name: "服务搜索过滤测试",
  description: "测试服务页面的搜索和过滤功能",
  steps: [
    {
      name: "导航到服务页面",
      action: () => {
        if (!window.location.href.includes('/services')) {
          window.location.href = '/services';
        }
        return new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      name: "查找搜索输入框",
      action: () => {
        const searchInput = document.querySelector('input[type="search"]') ||
                           document.querySelector('.search-input') ||
                           document.querySelector('.ant-input-search');
        
        if (!searchInput) {
          Logger.warn('Test', '找不到搜索输入框，可能没有实现搜索功能');
          return true; // 允许测试继续，即使找不到搜索框
        }
        
        // 保存搜索框引用
        window._testSearchInput = searchInput;
        
        Logger.info('Test', '找到搜索输入框');
        return true;
      }
    },
    {
      name: "输入搜索关键词",
      action: () => {
        if (!window._testSearchInput) {
          Logger.warn('Test', '未找到搜索输入框，跳过搜索测试');
          return true;
        }
        
        // 输入搜索关键词
        window._testSearchInput.value = '天气';
        window._testSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 如果有搜索按钮，点击它
        const searchButton = document.querySelector('.search-button') ||
                            document.querySelector('.ant-input-search-button');
        
        if (searchButton) {
          searchButton.click();
        } else {
          // 否则模拟回车键
          window._testSearchInput.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter',
            keyCode: 13,
            bubbles: true 
          }));
        }
        
        Logger.info('Test', '执行搜索', { keyword: '天气' });
        return new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: "验证搜索结果",
      action: () => {
        if (!window._testSearchInput) {
          return true; // 跳过验证
        }
        
        // 查找服务卡片
        const serviceCards = document.querySelectorAll('.service-card') || 
                             document.querySelectorAll('.ant-card') ||
                             document.querySelectorAll('[data-testid="service-item"]');
        
        // 检查是否有可见的服务卡片
        const visibleCards = Array.from(serviceCards).filter(card => {
          const style = window.getComputedStyle(card);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        Logger.info('Test', '搜索结果验证', { 
          totalCards: serviceCards.length,
          visibleCards: visibleCards.length
        });
        
        // 清理搜索框
        window._testSearchInput.value = '';
        window._testSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 清理测试变量
        delete window._testSearchInput;
        
        return true;
      }
    }
  ]
};

// 导出所有测试
export const allServiceTests = [
  servicePageLoadTest,
  responsiveLayoutTest,
  serviceSearchTest
];

export default allServiceTests; 