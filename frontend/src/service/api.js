import axios from 'axios';
import apiClient from './apiClient';

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
    // 使用统一API客户端
    return apiClient.sendVoiceRequest(
      voiceText,
      userId,
      sessionId || `session-${Date.now()}`
    );
  },
};

// 获取支持的服务列表
export const serviceAPI = {
  // 获取MCP服务列表
  getServiceList: async () => {
    try {
      // 使用统一API客户端
      return await apiClient.getServices();
    } catch (error) {
      console.warn('无法从后端获取MCP服务器列表，使用默认服务列表:', error);
      // 返回硬编码的服务列表作为后备
      return {
        status: 'success',
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
      };
    }
  }
};

// 聊天API
export const chatAPI = {
  // 发送聊天消息
  sendMessage: (query, userId = 'user123', sessionId = null) => {
    // 使用统一API客户端
    return apiClient.sendChatMessage(
      query,
      userId,
      sessionId || `session-${Date.now()}`
    );
  }
};

// 导出legacy API实例
export default api; 
            },
          ]
        }
      };
    }
  }
};

// 聊天API
export const chatAPI = {
  // 发送聊天消息
  sendMessage: (query, userId = 'user123', sessionId = null) => {
    // 使用统一API客户端
    return apiClient.sendChatMessage(
      query,
      userId,
      sessionId || `session-${Date.now()}`
    );
  }
};

// 导出legacy API实例
export default api; 
            },
          ]
        }
      };
    }
  }
};

// 聊天API
export const chatAPI = {
  // 发送聊天消息
  sendMessage: (query, userId = 'user123', sessionId = null) => {
    // 使用统一API客户端
    return apiClient.sendChatMessage(
      query,
      userId,
      sessionId || `session-${Date.now()}`
    );
  }
};

// 导出legacy API实例
export default api; 