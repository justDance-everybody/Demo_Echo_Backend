/**
 * 开发者API模拟实现
 */

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟开发者服务数据
const developerServices = [
  {
    id: 'dev-svc-1',
    name: '股票查询服务',
    type: 'http',
    status: 'active',
    created: '2025-04-30',
    usage: 1243,
    description: '提供实时股票价格和市场信息查询',
    endpoint: 'https://api.example.com/stocks',
    authType: 'apikey',
    authKey: 'X-API-Key',
    schema: {
      input: {
        type: 'object',
        properties: {
          symbol: { type: 'string' }
        }
      },
      output: {
        type: 'object',
        properties: {
          price: { type: 'number' },
          change: { type: 'number' }
        }
      }
    }
  },
  {
    id: 'dev-svc-2',
    name: '新闻资讯API',
    type: 'mcp',
    status: 'active',
    created: '2025-05-01',
    usage: 532,
    description: '提供最新新闻和热门话题信息',
    endpoint: 'mcp://news-service',
    authType: 'none',
    schema: {
      input: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          count: { type: 'number' }
        }
      },
      output: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            date: { type: 'string' }
          }
        }
      }
    }
  },
  {
    id: 'dev-svc-3',
    name: '智能翻译工具',
    type: 'http',
    status: 'pending',
    created: '2025-05-10',
    usage: 0,
    description: '多语言文本翻译服务',
    endpoint: 'https://api.example.com/translate',
    authType: 'oauth',
    authKey: 'Authorization',
    schema: {
      input: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' }
        }
      },
      output: {
        type: 'object',
        properties: {
          translated: { type: 'string' }
        }
      }
    }
  }
];

// 模拟开发者应用数据
const developerApplications = [
  {
    id: 'app-1',
    name: '旅游助手',
    appKey: 'app_key_12345',
    status: 'active',
    created: '2025-04-15',
    services: 3
  },
  {
    id: 'app-2',
    name: '学习工具集',
    appKey: 'app_key_67890',
    status: 'active',
    created: '2025-04-29',
    services: 2
  }
];

/**
 * 注册开发者 API Mock
 * @param {Object} api - Mock API 实例
 */
const setupDeveloperApiMocks = (api) => {
  // 获取开发者服务列表 Mock
  api.mockResolvedValue('getDeveloperServices', async () => {
    await delay(800);
    return developerServices;
  });
  
  // 创建开发者服务 Mock
  api.mockResolvedValue('createDeveloperService', async (serviceData) => {
    await delay(1000);
    
    const newService = {
      id: `dev-svc-${Date.now()}`,
      name: serviceData.name,
      type: serviceData.type,
      status: 'pending',
      created: new Date().toISOString().split('T')[0],
      usage: 0,
      description: serviceData.description,
      endpoint: serviceData.endpoint,
      authType: serviceData.authType,
      authKey: serviceData.authKey,
      schema: {
        input: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        },
        output: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      }
    };
    
    developerServices.push(newService);
    
    return newService;
  });
  
  // 获取开发者服务详情 Mock
  api.mockResolvedValue('getDeveloperServiceById', async (serviceId) => {
    await delay(600);
    
    const service = developerServices.find(s => s.id === serviceId);
    
    if (!service) {
      throw new Error('服务不存在');
    }
    
    return service;
  });
  
  // 更新开发者服务 Mock
  api.mockResolvedValue('updateDeveloperService', async (serviceId, updateData) => {
    await delay(800);
    
    const serviceIndex = developerServices.findIndex(s => s.id === serviceId);
    
    if (serviceIndex === -1) {
      throw new Error('服务不存在');
    }
    
    const updatedService = {
      ...developerServices[serviceIndex],
      ...updateData
    };
    
    developerServices[serviceIndex] = updatedService;
    
    return updatedService;
  });
  
  // 删除开发者服务 Mock
  api.mockResolvedValue('deleteDeveloperService', async (serviceId) => {
    await delay(500);
    
    const serviceIndex = developerServices.findIndex(s => s.id === serviceId);
    
    if (serviceIndex === -1) {
      throw new Error('服务不存在');
    }
    
    developerServices.splice(serviceIndex, 1);
    
    return { success: true, message: '服务已删除' };
  });
  
  // 测试API服务 Mock
  api.mockResolvedValue('testApiService', async (serviceId, testData) => {
    await delay(1500);
    
    const service = developerServices.find(s => s.id === serviceId);
    
    if (!service) {
      throw new Error('服务不存在');
    }
    
    // 根据服务类型返回不同的测试结果
    if (service.type === 'http') {
      if (service.name.includes('股票')) {
        return {
          symbol: testData.query || 'AAPL',
          price: 145.86,
          change: 2.13,
          timestamp: new Date().toISOString()
        };
      } else if (service.name.includes('翻译')) {
        return {
          text: testData.query || '你好',
          translated: testData.query ? `Translated: ${testData.query}` : 'Hello',
          source: 'zh-CN',
          target: 'en-US'
        };
      }
    } else if (service.type === 'mcp') {
      if (service.name.includes('新闻')) {
        return [
          {
            title: '大型科技公司发布新产品',
            date: new Date().toISOString(),
            summary: '今日，多家大型科技公司发布了新产品，市场反响热烈。'
          },
          {
            title: '全球环保会议在京召开',
            date: new Date().toISOString(),
            summary: '各国代表齐聚北京，讨论全球环保策略。'
          }
        ];
      }
    }
    
    // 默认返回
    return {
      result: `测试成功：${testData.query || '默认查询'}`,
      timestamp: new Date().toISOString()
    };
  });
  
  // 获取开发者应用列表 Mock
  api.mockResolvedValue('getDeveloperApplications', async () => {
    await delay(700);
    return developerApplications;
  });
  
  // 创建开发者应用 Mock
  api.mockResolvedValue('createDeveloperApplication', async (applicationData) => {
    await delay(900);
    
    const newApp = {
      id: `app-${Date.now()}`,
      name: applicationData.name,
      appKey: `app_key_${Math.random().toString(36).substring(2, 10)}`,
      status: 'active',
      created: new Date().toISOString().split('T')[0],
      services: 0
    };
    
    developerApplications.push(newApp);
    
    return newApp;
  });
  
  console.log('开发者 API Mock 已注册');
};

export default setupDeveloperApiMocks; 