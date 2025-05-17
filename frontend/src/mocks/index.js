import { v4 as uuidv4 } from 'uuid';
import setupDeveloperApiMocks from './developerApiMock';

/**
 * Mock服务配置
 * @param {Object} api - API客户端实例
 */
const setupMocks = (api) => {
  // 模拟接口响应延迟
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 模拟会话数据
  const sessions = {};
  
  // 模拟工具列表
  const tools = [
    {
      tool_id: 'weather',
      name: '天气查询',
      type: 'http',
      description: '查询指定城市的天气情况',
      icon: 'cloudy'
    },
    {
      tool_id: 'maps',
      name: '地图导航',
      type: 'http',
      description: '查询位置和导航服务',
      icon: 'map'
    },
    {
      tool_id: 'reminder',
      name: '提醒服务',
      type: 'mcp',
      description: '设置日程提醒',
      icon: 'calendar'
    },
    {
      tool_id: 'music',
      name: '音乐播放',
      type: 'mcp',
      description: '搜索和播放音乐',
      icon: 'music'
    },
    {
      tool_id: 'message',
      name: '消息服务',
      type: 'mcp',
      description: '发送和接收消息',
      icon: 'message'
    }
  ];
  
  // 意图解析 Mock
  api.mockResolvedValue('interpret', async (data) => {
    // 模拟延迟
    await delay(1500);
    
    const { text, sessionId } = data;
    
    // 初始化会话状态
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        stage: 'interpreting',
        data: {},
      };
    }
    
    // 根据用户输入识别意图
    let action, params, confirmText;
    
    if (text.includes('天气') || text.includes('气温') || text.includes('下雨')) {
      action = 'weather';
      params = {
        city: text.includes('北京') ? '北京' : 
              text.includes('上海') ? '上海' : 
              text.includes('广州') ? '广州' : '当前城市'
      };
      confirmText = `我将为您查询${params.city}的天气情况，是否确认？`;
    } else if (text.includes('导航') || text.includes('地图') || text.includes('位置') || text.includes('在哪')) {
      action = 'maps';
      params = {
        destination: text.match(/[到去往去]([^的]+)/)?.[1] || '目的地',
        mode: text.includes('开车') ? 'driving' : 
              text.includes('步行') ? 'walking' : 
              text.includes('公交') ? 'transit' : 'auto'
      };
      confirmText = `我将为您导航到${params.destination}，使用${params.mode === 'driving' ? '驾车' : params.mode === 'walking' ? '步行' : '公共交通'}模式，是否确认？`;
    } else if (text.includes('提醒') || text.includes('日程') || text.includes('记得')) {
      action = 'reminder';
      const timeMatch = text.match(/(今天|明天|后天|周[一二三四五六日末]|\d+[点分秒])/g);
      params = {
        event: text.replace(/(提醒我|记得|日程|安排|行程|时间|提醒)/g, '').trim(),
        time: timeMatch ? timeMatch.join(' ') : '稍后'
      };
      confirmText = `我将为您设置提醒：${params.event}，时间为${params.time}，是否确认？`;
    } else if (text.includes('音乐') || text.includes('歌') || text.includes('播放')) {
      action = 'music';
      params = {
        song: text.replace(/(播放|音乐|歌曲|来首|听|放首|放个|放一首)/g, '').trim()
      };
      confirmText = `我将为您播放${params.song}，是否确认？`;
    } else if (text.includes('消息') || text.includes('发送') || text.includes('告诉')) {
      action = 'message';
      const recipientMatch = text.match(/(给|向|发给|通知)([^发送]+)/);
      params = {
        recipient: recipientMatch ? recipientMatch[2].trim() : '联系人',
        content: text.replace(/(发送|消息|短信|通知|信息|告诉|给|向|发给)+[^发送]+/g, '').trim()
      };
      confirmText = `我将向${params.recipient}发送消息：${params.content}，是否确认？`;
    } else {
      action = 'unknown';
      params = { query: text };
      confirmText = `抱歉，我不太理解您的请求。您是想查询"${text}"吗？`;
    }
    
    // 更新会话状态
    sessions[sessionId] = {
      stage: 'confirming',
      data: { action, params }
    };
    
    return {
      type: 'confirm',
      action,
      params,
      confirmText
    };
  });
  
  // 执行操作 Mock
  api.mockResolvedValue('execute', async (data) => {
    // 模拟延迟
    await delay(2000);
    
    const { action, params, sessionId } = data;
    
    // 检查会话是否存在
    if (!sessions[sessionId]) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在或已过期'
        }
      };
    }
    
    // 根据动作返回不同的结果
    let result;
    
    switch (action) {
      case 'weather':
        result = {
          success: true,
          data: {
            city: params.city,
            temperature: Math.floor(Math.random() * 15) + 15, // 15-30°C
            condition: ['晴朗', '多云', '阴天', '小雨', '大雨'][Math.floor(Math.random() * 5)],
            humidity: Math.floor(Math.random() * 40) + 30, // 30-70%
            wind: Math.floor(Math.random() * 5) + 1 // 1-6级
          },
          message: `${params.city}今天${['晴朗', '多云', '阴天', '小雨', '大雨'][Math.floor(Math.random() * 5)]}，气温${Math.floor(Math.random() * 15) + 15}°C，湿度${Math.floor(Math.random() * 40) + 30}%，${Math.floor(Math.random() * 5) + 1}级风。`
        };
        break;
        
      case 'maps':
        result = {
          success: true,
          data: {
            destination: params.destination,
            distance: Math.floor(Math.random() * 20) + 1, // 1-20公里
            duration: Math.floor(Math.random() * 50) + 10, // 10-60分钟
            mode: params.mode
          },
          message: `已为您找到前往${params.destination}的路线，距离约${Math.floor(Math.random() * 20) + 1}公里，预计耗时${Math.floor(Math.random() * 50) + 10}分钟。`
        };
        break;
        
      case 'reminder':
        result = {
          success: true,
          data: {
            event: params.event,
            time: params.time,
            id: uuidv4().substring(0, 8)
          },
          message: `已为您设置提醒：${params.event}，时间为${params.time}。`
        };
        break;
        
      case 'music':
        result = {
          success: true,
          data: {
            song: params.song,
            artist: ['周杰伦', '林俊杰', '邓紫棋', '王力宏', '陈奕迅'][Math.floor(Math.random() * 5)],
            album: '热门单曲',
            duration: '03:45'
          },
          message: `正在为您播放${params.song}，演唱：${['周杰伦', '林俊杰', '邓紫棋', '王力宏', '陈奕迅'][Math.floor(Math.random() * 5)]}。`
        };
        break;
        
      case 'message':
        result = {
          success: true,
          data: {
            recipient: params.recipient,
            content: params.content,
            timestamp: new Date().toISOString()
          },
          message: `已向${params.recipient}发送消息：${params.content}。`
        };
        break;
        
      case 'unknown':
      default:
        result = {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: '无法识别的操作'
          },
          message: '抱歉，我无法执行这个操作。请尝试其他请求。'
        };
    }
    
    // 更新会话状态
    sessions[sessionId] = {
      stage: 'done',
      data: result
    };
    
    return result;
  });
  
  // 获取工具列表 Mock
  api.mockResolvedValue('getTools', async () => {
    await delay(500);
    return tools;
  });
  
  // 创建会话 Mock
  api.mockResolvedValue('createSession', async (data) => {
    await delay(300);
    const sessionId = uuidv4();
    sessions[sessionId] = {
      stage: 'idle',
      data: {},
      userId: data.userId || null,
      createdAt: new Date().toISOString()
    };
    
    return {
      sessionId,
      status: 'created'
    };
  });
  
  // 注册开发者API Mock
  setupDeveloperApiMocks(api);
  
  console.log('Mock服务已启动');
};

/**
 * 拦截API请求并返回模拟数据
 */
class MockAPI {
  constructor() {
    this.mocks = {};
  }
  
  /**
   * 模拟API解析值
   * @param {string} method - API方法名
   * @param {Function} handler - 处理函数
   */
  mockResolvedValue(method, handler) {
    this.mocks[method] = handler;
  }
  
  /**
   * 执行模拟API调用
   * @param {string} method - API方法名
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 模拟响应
   */
  async call(method, data) {
    if (this.mocks[method]) {
      try {
        return await this.mocks[method](data);
      } catch (error) {
        console.error(`Mock调用错误 ${method}:`, error);
        throw error;
      }
    }
    
    console.warn(`未找到模拟方法: ${method}`);
    throw new Error(`未找到模拟方法: ${method}`);
  }
}

// 创建模拟API实例
const mockAPI = new MockAPI();

// 初始化Mock
setupMocks(mockAPI);

export default mockAPI; 