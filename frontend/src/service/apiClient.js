/**
 * 统一API客户端
 * 提供与后端API交互的标准化方法
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

/**
 * 创建axios实例
 */
const apiClient = axios.create({
  baseURL: `${API_URL}/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
});

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  config => {
    // 这里可以添加认证令牌等
    // const token = getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  error => Promise.reject(error)
);

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error);
    
    // 构建标准错误对象
    const errorObj = {
      status: 'error',
      message: '网络请求失败',
      timestamp: new Date().toISOString()
    };
    
    if (error.response) {
      // 服务器返回了错误状态码
      errorObj.message = error.response.data.message || `服务器错误: ${error.response.status}`;
      errorObj.data = error.response.data;
      errorObj.statusCode = error.response.status;
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorObj.message = '服务器无响应，请检查网络连接';
    }
    
    return Promise.reject(errorObj);
  }
);

/**
 * API方法
 */
const api = {
  /**
   * 发送聊天消息
   * @param {String} query - 用户查询文本
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendChatMessage: (query, userId, sessionId, context) => {
    return apiClient.post('/chat', {
      query,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 发送语音请求
   * @param {String} voiceText - 语音转文字内容
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendVoiceRequest: (voiceText, userId, sessionId, context) => {
    return apiClient.post('/voice', {
      voiceText,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 获取可用服务列表
   * @returns {Promise} 响应Promise
   */
  getServices: () => {
    return apiClient.get('/services');
  },
  
  /**
   * 直接执行MCP服务
   * @param {String} serverId - MCP服务ID
   * @param {String} query - 用户查询
   * @param {Object} [options] - 附加选项 (可选)
   * @returns {Promise} 响应Promise
   */
  executeMcpService: (serverId, query, options = {}) => {
    return apiClient.post('/mcp/execute', {
      serverId,
      query,
      options
    });
  }
};

export default api; 
 * 统一API客户端
 * 提供与后端API交互的标准化方法
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

/**
 * 创建axios实例
 */
const apiClient = axios.create({
  baseURL: `${API_URL}/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
});

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  config => {
    // 这里可以添加认证令牌等
    // const token = getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  error => Promise.reject(error)
);

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error);
    
    // 构建标准错误对象
    const errorObj = {
      status: 'error',
      message: '网络请求失败',
      timestamp: new Date().toISOString()
    };
    
    if (error.response) {
      // 服务器返回了错误状态码
      errorObj.message = error.response.data.message || `服务器错误: ${error.response.status}`;
      errorObj.data = error.response.data;
      errorObj.statusCode = error.response.status;
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorObj.message = '服务器无响应，请检查网络连接';
    }
    
    return Promise.reject(errorObj);
  }
);

/**
 * API方法
 */
const api = {
  /**
   * 发送聊天消息
   * @param {String} query - 用户查询文本
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendChatMessage: (query, userId, sessionId, context) => {
    return apiClient.post('/chat', {
      query,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 发送语音请求
   * @param {String} voiceText - 语音转文字内容
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendVoiceRequest: (voiceText, userId, sessionId, context) => {
    return apiClient.post('/voice', {
      voiceText,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 获取可用服务列表
   * @returns {Promise} 响应Promise
   */
  getServices: () => {
    return apiClient.get('/services');
  },
  
  /**
   * 直接执行MCP服务
   * @param {String} serverId - MCP服务ID
   * @param {String} query - 用户查询
   * @param {Object} [options] - 附加选项 (可选)
   * @returns {Promise} 响应Promise
   */
  executeMcpService: (serverId, query, options = {}) => {
    return apiClient.post('/mcp/execute', {
      serverId,
      query,
      options
    });
  }
};

export default api; 
 * 统一API客户端
 * 提供与后端API交互的标准化方法
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

/**
 * 创建axios实例
 */
const apiClient = axios.create({
  baseURL: `${API_URL}/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
});

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  config => {
    // 这里可以添加认证令牌等
    // const token = getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  error => Promise.reject(error)
);

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error);
    
    // 构建标准错误对象
    const errorObj = {
      status: 'error',
      message: '网络请求失败',
      timestamp: new Date().toISOString()
    };
    
    if (error.response) {
      // 服务器返回了错误状态码
      errorObj.message = error.response.data.message || `服务器错误: ${error.response.status}`;
      errorObj.data = error.response.data;
      errorObj.statusCode = error.response.status;
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorObj.message = '服务器无响应，请检查网络连接';
    }
    
    return Promise.reject(errorObj);
  }
);

/**
 * API方法
 */
const api = {
  /**
   * 发送聊天消息
   * @param {String} query - 用户查询文本
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendChatMessage: (query, userId, sessionId, context) => {
    return apiClient.post('/chat', {
      query,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 发送语音请求
   * @param {String} voiceText - 语音转文字内容
   * @param {String} userId - 用户ID
   * @param {String} [sessionId] - 会话ID (可选)
   * @param {Object} [context] - 上下文信息 (可选)
   * @returns {Promise} 响应Promise
   */
  sendVoiceRequest: (voiceText, userId, sessionId, context) => {
    return apiClient.post('/voice', {
      voiceText,
      userId,
      sessionId,
      context
    });
  },
  
  /**
   * 获取可用服务列表
   * @returns {Promise} 响应Promise
   */
  getServices: () => {
    return apiClient.get('/services');
  },
  
  /**
   * 直接执行MCP服务
   * @param {String} serverId - MCP服务ID
   * @param {String} query - 用户查询
   * @param {Object} [options] - 附加选项 (可选)
   * @returns {Promise} 响应Promise
   */
  executeMcpService: (serverId, query, options = {}) => {
    return apiClient.post('/mcp/execute', {
      serverId,
      query,
      options
    });
  }
};

export default api; 