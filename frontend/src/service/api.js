import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里添加身份验证token
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// API接口
export const voiceAPI = {
  // 发送语音文本到后端
  processVoice: (voiceText, userId = 'user123', sessionId = null) => {
    return api.post('/api/test-service/voice', {
      voiceText,
      userId,
      sessionId: sessionId || `session-${Date.now()}`,
    });
  },
};

// 获取支持的服务列表
export const serviceAPI = {
  // 获取MCP服务列表
  getServiceList: () => {
    // 这里可以连接到后端API
    return Promise.resolve({
      data: {
        services: [
          {
            id: 'voice-translate',
            name: '同声传译',
            icon: 'translate',
            description: '即时语音翻译，支持多语种',
            color: '#80c3ff',
          },
          {
            id: 'blockchain-transfer',
            name: '链上转账',
            icon: 'money',
            description: '语音控制，链上转账更便捷',
            color: '#80c3ff',
          },
          {
            id: 'asset-check',
            name: '资产查询',
            icon: 'wallet',
            description: '语音查询余额，交易记录一目了然',
            color: '#80c3ff',
          },
          {
            id: 'defi-assistant',
            name: 'DeFi 助手',
            icon: 'chart',
            description: '智能 DeFi 收益管理，语音操控',
            color: '#80c3ff',
          },
          {
            id: 'nft-manager',
            name: 'NFT 管家',
            icon: 'picture',
            description: '语音管理 NFT，交易行情查看',
            color: '#80c3ff',
          },
          {
            id: 'more-services',
            name: '查看更多',
            icon: 'more',
            description: '更多服务即将上线',
            color: '#80c3ff',
          },
        ]
      }
    });
  }
};

export default api; 