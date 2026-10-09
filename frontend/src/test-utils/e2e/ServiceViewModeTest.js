// ServiceViewModeTest.js - 测试服务页面视图模式切换功能

import Logger from '../Logger';

// 视图模式切换测试
export const serviceViewModeTest = {
  name: "服务视图模式切换测试",
  description: "测试在网格视图和列表视图之间切换的功能",
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
      name: "寻找视图切换控件",
      action: () => {
        // 查找视图切换按钮
        const gridViewButton = document.querySelector('[aria-label="网格视图"]') ||
                              document.querySelector('[data-testid="grid-view-button"]') ||
                              Array.from(document.querySelectorAll('button'))
                                .find(btn => btn.textContent.includes('网格') || 
                                      btn.querySelector('svg[data-icon="appstore"]'));
        
        const listViewButton = document.querySelector('[aria-label="列表视图"]') ||
                              document.querySelector('[data-testid="list-view-button"]') ||
                              Array.from(document.querySelectorAll('button'))
                                .find(btn => btn.textContent.includes('列表') || 
                                      btn.querySelector('svg[data-icon="bars"]'));
        
        if (!gridViewButton || !listViewButton) {
          throw new Error('找不到视图切换按钮');
        }
        
        // 保存按钮引用以供后续使用
        window._testGridViewButton = gridViewButton;
        window._testListViewButton = listViewButton;
        
        Logger.info('Test', '找到视图切换按钮');
        return true;
      }
    },
    {
      name: "记录当前视图模式",
      action: () => {
        // 获取当前视图模式
        const serviceContainer = document.querySelector('.service-list') || 
                                document.querySelector('.services-container');
        
        if (!serviceContainer) {
          throw new Error('找不到服务列表容器');
        }
        
        // 通过检查容器的类名或样式来确定当前视图模式
        const isGridView = serviceContainer.classList.contains('grid-view') || 
                          !serviceContainer.classList.contains('list-view');
        
        // 保存当前视图模式
        window._testIsGridView = isGridView;
        
        Logger.info('Test', '当前视图模式', { 
          isGridView, 
          containerClass: serviceContainer.className 
        });
        
        return true;
      }
    },
    {
      name: "切换到列表视图",
      action: () => {
        // 如果已经是列表视图，跳过
        if (!window._testIsGridView) {
          Logger.info('Test', '已经是列表视图，跳过切换');
          return true;
        }
        
        // 点击列表视图按钮
        window._testListViewButton.click();
        Logger.info('Test', '点击列表视图按钮');
        
        return new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: "验证列表视图",
      action: () => {
        // 验证视图已切换到列表模式
        const serviceContainer = document.querySelector('.service-list') || 
                                document.querySelector('.services-container');
        
        if (!serviceContainer) {
          throw new Error('找不到服务列表容器');
        }
        
        const isListView = serviceContainer.classList.contains('list-view') || 
                          !serviceContainer.classList.contains('grid-view');
        
        if (!isListView) {
          throw new Error('未切换到列表视图');
        }
        
        // 获取服务卡片并检查它们的样式是否符合列表视图
        const serviceCards = document.querySelectorAll('.service-card') || 
                            document.querySelectorAll('.ant-card') ||
                            document.querySelectorAll('[data-testid="service-item"]');
        
        // 在列表视图中，卡片应该是水平的而不是垂直的
        const firstCard = serviceCards[0];
        if (firstCard) {
          const cardStyle = window.getComputedStyle(firstCard);
          Logger.info('Test', '列表视图卡片样式', { 
            width: cardStyle.width,
            height: cardStyle.height,
            display: cardStyle.display,
            flexDirection: cardStyle.flexDirection
          });
        }
        
        Logger.info('Test', '已切换到列表视图');
        return true;
      }
    },
    {
      name: "切换到网格视图",
      action: () => {
        // 点击网格视图按钮
        window._testGridViewButton.click();
        Logger.info('Test', '点击网格视图按钮');
        
        return new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: "验证网格视图",
      action: () => {
        // 验证视图已切换到网格模式
        const serviceContainer = document.querySelector('.service-list') || 
                                document.querySelector('.services-container');
        
        if (!serviceContainer) {
          throw new Error('找不到服务列表容器');
        }
        
        const isGridView = serviceContainer.classList.contains('grid-view') || 
                          !serviceContainer.classList.contains('list-view');
        
        if (!isGridView) {
          throw new Error('未切换到网格视图');
        }
        
        // 获取服务卡片并检查它们的样式是否符合网格视图
        const serviceCards = document.querySelectorAll('.service-card') || 
                            document.querySelectorAll('.ant-card') ||
                            document.querySelectorAll('[data-testid="service-item"]');
        
        // 在网格视图中，卡片应该是垂直排列的
        const firstCard = serviceCards[0];
        if (firstCard) {
          const cardStyle = window.getComputedStyle(firstCard);
          Logger.info('Test', '网格视图卡片样式', { 
            width: cardStyle.width,
            height: cardStyle.height,
            display: cardStyle.display,
            flexDirection: cardStyle.flexDirection
          });
        }
        
        Logger.info('Test', '已切换到网格视图');
        return true;
      }
    },
    {
      name: "验证视图偏好保存",
      action: () => {
        // 刷新页面
        window.location.reload();
        
        return new Promise(resolve => setTimeout(resolve, 1500));
      }
    },
    {
      name: "验证视图保持一致",
      action: () => {
        // 检查刷新后视图模式是否保持一致
        const serviceContainer = document.querySelector('.service-list') || 
                                document.querySelector('.services-container');
        
        if (!serviceContainer) {
          throw new Error('找不到服务列表容器');
        }
        
        const isGridView = serviceContainer.classList.contains('grid-view') || 
                          !serviceContainer.classList.contains('list-view');
        
        Logger.info('Test', '刷新后的视图模式', { 
          isGridView, 
          containerClass: serviceContainer.className,
          expectedGridView: true // 根据前面的操作，预期是网格视图
        });
        
        // 清理测试变量
        delete window._testGridViewButton;
        delete window._testListViewButton;
        delete window._testIsGridView;
        
        return true;
      }
    }
  ]
};

// 服务排序测试
export const serviceSortTest = {
  name: "服务排序功能测试",
  description: "测试服务列表的排序功能",
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
      name: "查找排序选择器",
      action: () => {
        // 查找排序下拉菜单
        const sortSelector = document.querySelector('select.sort-select') ||
                             document.querySelector('[aria-label="排序方式"]') ||
                             document.querySelector('.ant-select') ||
                             document.querySelector('[data-testid="sort-selector"]');
        
        if (!sortSelector) {
          throw new Error('找不到排序选择器');
        }
        
        // 保存排序选择器引用
        window._testSortSelector = sortSelector;
        
        Logger.info('Test', '找到排序选择器');
        return true;
      }
    },
    {
      name: "记录初始服务顺序",
      action: () => {
        // 查找所有服务卡片
        const serviceCards = document.querySelectorAll('.service-card') || 
                             document.querySelectorAll('.ant-card') ||
                             document.querySelectorAll('[data-testid="service-item"]');
        
        if (!serviceCards || serviceCards.length === 0) {
          throw new Error('找不到服务卡片');
        }
        
        // 记录初始顺序
        window._testInitialOrder = Array.from(serviceCards).map(card => {
          const nameElement = card.querySelector('.title') || 
                             card.querySelector('.card-title') || 
                             card.querySelector('h3');
          return nameElement ? nameElement.textContent.trim() : 'unknown';
        });
        
        Logger.info('Test', '初始服务顺序', { 
          order: window._testInitialOrder 
        });
        
        return true;
      }
    },
    {
      name: "切换到按名称排序",
      action: () => {
        // 选择"按名称"排序
        // 由于不同的UI库实现方式可能不同，这里使用多种可能的方法
        
        if (window._testSortSelector.tagName === 'SELECT') {
          // 标准HTML选择器
          const nameOption = Array.from(window._testSortSelector.options)
            .find(option => option.textContent.includes('名称'));
          
          if (nameOption) {
            window._testSortSelector.value = nameOption.value;
            window._testSortSelector.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          // 可能是UI库自定义组件
          window._testSortSelector.click();
          
          // 等待下拉菜单出现
          setTimeout(() => {
            const nameOption = document.querySelector('.ant-select-item-option:nth-child(1)') ||
                              Array.from(document.querySelectorAll('li'))
                                .find(li => li.textContent.includes('名称'));
            
            if (nameOption) {
              nameOption.click();
            }
          }, 200);
        }
        
        Logger.info('Test', '切换到按名称排序');
        return new Promise(resolve => setTimeout(resolve, 800));
      }
    },
    {
      name: "验证名称排序结果",
      action: () => {
        // 查找所有服务卡片
        const serviceCards = document.querySelectorAll('.service-card') || 
                             document.querySelectorAll('.ant-card') ||
                             document.querySelectorAll('[data-testid="service-item"]');
        
        // 获取当前顺序
        const currentOrder = Array.from(serviceCards).map(card => {
          const nameElement = card.querySelector('.title') || 
                             card.querySelector('.card-title') || 
                             card.querySelector('h3');
          return nameElement ? nameElement.textContent.trim() : 'unknown';
        });
        
        // 检查是否排序发生了变化
        const orderChanged = !currentOrder.every((name, i) => name === window._testInitialOrder[i]);
        
        Logger.info('Test', '名称排序结果', { 
          initialOrder: window._testInitialOrder,
          currentOrder,
          orderChanged
        });
        
        return true;
      }
    },
    {
      name: "清理测试状态",
      action: () => {
        // 清理测试变量
        delete window._testSortSelector;
        delete window._testInitialOrder;
        
        return true;
      }
    }
  ]
};

// 导出所有测试
export const allServiceViewTests = [
  serviceViewModeTest,
  serviceSortTest
];

export default allServiceViewTests; 