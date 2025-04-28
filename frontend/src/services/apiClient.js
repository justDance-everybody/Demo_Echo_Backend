import axios from 'axios';
import mockAPI from '../mocks';

// 是否使用Mock API
const USE_MOCKS = process.env.REACT_APP_USE_MOCKS === 'true';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  timeout: 15000, // 15秒超时
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response;
      
      // 身份验证错误
      if (status === 401) {
        // 清除本地存储的token
        localStorage.removeItem('token');
        // 重定向到登录页面
        // window.location.href = '/login';
        return Promise.reject(new Error('身份验证失败，请重新登录'));
      }
      
      // 服务器错误信息
      const errorMessage = data.error?.message || `请求失败，状态码: ${status}`;
      return Promise.reject(new Error(errorMessage));
    } 
    
    // 网络错误或请求被取消
    if (error.request) {
      return Promise.reject(new Error('无法连接到服务器，请检查网络连接'));
    }
    
    // 请求配置错误
    return Promise.reject(error);
  }
);

/**
 * API客户端
 */
const apiClient = {
  /**
   * 发送用户语音文本进行意图解析
   * @param {string} text - 用户的语音转文本内容
   * @param {string} sessionId - 会话ID
   * @param {number} userId - 用户ID（可选）
   * @returns {Promise<Object>} 解析结果
   */
  interpret: async (text, sessionId, userId = null) => {
    const data = { text, sessionId, userId };
    
    if (USE_MOCKS) {
      console.log('使用Mock API: interpret', data);
      return mockAPI.call('interpret', data);
    }
    
    return api.post('/api/interpret', data);
  },
  
  /**
   * 执行已确认的操作
   * @param {string} action - 要执行的动作/工具ID
   * @param {Object} params - 执行参数
   * @param {string} sessionId - 会话ID
   * @param {number} userId - 用户ID（可选）
   * @returns {Promise<Object>} 执行结果
   */
  execute: async (action, params, sessionId, userId = null) => {
    const data = { action, params, sessionId, userId };
    
    if (USE_MOCKS) {
      console.log('使用Mock API: execute', data);
      return mockAPI.call('execute', data);
    }
    
    return api.post('/api/execute', data);
  },
  
  /**
   * 获取可用的工具/服务列表
   * @returns {Promise<Array>} 工具列表
   */
  getTools: async () => {
    if (USE_MOCKS) {
      console.log('使用Mock API: getTools');
      return mockAPI.call('getTools');
    }
    
    return api.get('/api/tools');
  },
  
  /**
   * 注册新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  register: async (userData) => {
    if (USE_MOCKS) {
      console.log('使用Mock API: register', userData);
      return mockAPI.call('register', userData);
    }
    
    return api.post('/api/users/register', userData);
  },
  
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果，包含token
   */
  login: async (username, password) => {
    const data = { username, password };
    
    if (USE_MOCKS) {
      console.log('使用Mock API: login', data);
      return mockAPI.call('login', data);
    }
    
    return api.post('/api/users/login', data);
  },
  
  /**
   * 获取用户配置
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 用户配置
   */
  getUserConfig: async (userId) => {
    if (USE_MOCKS) {
      console.log('使用Mock API: getUserConfig', userId);
      return mockAPI.call('getUserConfig', { userId });
    }
    
    return api.get(`/api/users/${userId}/config`);
  },
  
  /**
   * 更新用户配置
   * @param {number} userId - 用户ID
   * @param {Object} config - 新的用户配置
   * @returns {Promise<Object>} 更新结果
   */
  updateUserConfig: async (userId, config) => {
    if (USE_MOCKS) {
      console.log('使用Mock API: updateUserConfig', { userId, config });
      return mockAPI.call('updateUserConfig', { userId, config });
    }
    
    return api.put(`/api/users/${userId}/config`, config);
  },
  
  /**
   * 创建新会话
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 新会话信息
   */
  createSession: async (userId) => {
    if (USE_MOCKS) {
      console.log('使用Mock API: createSession', { userId });
      return mockAPI.call('createSession', { userId });
    }
    
    return api.post('/api/sessions', { userId });
  },
};

export default apiClient; 