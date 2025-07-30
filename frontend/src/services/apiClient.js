import axios from 'axios';

// 从环境变量获取API配置
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, 
});

api.interceptors.request.use(
  (config) => {
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

api.interceptors.response.use(
  (response) => {
     return response; // Return full response for handling in calling function
  },
  (error) => {
    console.error("API Error Interceptor:", error); // Log the raw error
    let errorMsg = '请求失败，发生未知错误。'; // Default error
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      console.error(`API Error: Status ${status}`, data);
      if (status === 401) {
        localStorage.removeItem('token');
        errorMsg = '身份验证失败，请重新登录';
        // Consider redirecting: window.location.href = '/login'; 
      } else if (data?.detail) { // FastAPI validation errors often in 'detail'
        if (Array.isArray(data.detail)) { // Handle list of validation errors
            errorMsg = data.detail.map(err => `${err.loc ? err.loc.join('.')+': ' : ''}${err.msg}`).join('; ');
        } else {
            errorMsg = data.detail; // Handle single string detail
        }
      } else {
         errorMsg = data?.error?.message || `请求失败，状态码: ${status}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error: No response received', error.request);
      errorMsg = '无法连接到服务器，请检查网络连接或后端服务是否运行。';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error: Request setup error', error.message);
      errorMsg = `请求设置错误: ${error.message}`;
    }
     // Instead of rejecting with just message, reject with an object 
     // containing message and maybe original error for more context
    return Promise.reject({ message: errorMsg, originalError: error });
  }
);

// 认证相关方法

// 设置认证令牌
const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// 用户登录
const login = async (username, password) => {
  try {
    // 根据对接指南，登录接口使用form-data格式
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post(`${API_PREFIX}/auth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // 后端返回TokenResponse格式，包含access_token, user_id, username, role等字段
    return {
      success: true,
      token: response.data.access_token,
      user: {
        id: response.data.user_id,
        username: response.data.username,
        role: response.data.role || 'user' // 确保获取角色信息，默认为user
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    // 处理HTTP错误响应
    const errorMessage = error.response?.data?.detail || error.message || '登录失败，请稍后再试';
    return {
      success: false,
      message: errorMessage
    };
  }
};

// 用户注册
const register = async (username, password, email) => {
  try {
    const response = await api.post(`${API_PREFIX}/auth/register`, {
      username,
      password,
      email
    });
    
    // 确保返回成功状态和处理用户角色
    return {
      success: true,
      user: {
        id: response.data.id,
        username: response.data.username,
        role: response.data.role || 'user' // 确保获取角色信息，默认为user
      }
    };
  } catch (error) {
    console.error('注册失败:', error);
    return {
      success: false,
      message: error.message || '注册失败，请稍后再试'
    };
  }
};

// 获取用户信息
const getUserInfo = async () => {
  try {
    const response = await api.get(`${API_PREFIX}/auth/me`);
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};

// 刷新令牌
const refreshToken = async () => {
  try {
    const response = await api.post(`${API_PREFIX}/auth/refresh`);
    return response.data;
  } catch (error) {
    console.error('刷新令牌失败:', error);
    throw error;
  }
};

// 原有的API方法

const interpret = async (transcript, session_id, user_id) => {
    try {
        console.log(`发送interpret请求，携带session_id: ${session_id}`);
        const response = await api.post(`${API_PREFIX}/intent/interpret`, {
            query: transcript, 
            session_id: session_id,
            user_id: user_id,
        });
        console.log(`收到interpret响应:`, response.data);
        
        // 检查响应中是否返回了session_id，并记录
        if (response.data && response.data.session_id) {
            console.log(`响应中包含session_id: ${response.data.session_id}`);
        } else {
            console.warn(`⚠️ 警告: 响应中未找到session_id! 响应数据:`, response.data);
        }
        
        return response.data; // Extract data from successful response
    } catch (error) {
         console.error('API call to interpret failed in function:', error);
         // Re-throw the processed error object from the interceptor
         throw error; 
    }
};

const execute = async (tool_id, params, session_id, user_id) => {
    try {
        // 参数验证
        if (!tool_id) {
            throw new Error('工具ID不能为空');
        }
        if (!params || typeof params !== 'object') {
            throw new Error('参数必须是一个对象');
        }
        
        // 确保user_id是字符串类型
        const userIdStr = user_id ? String(user_id) : null;
        
        console.log(`发送execute请求，携带session_id: ${session_id}`);
        
        // 确保后端请求参数严格符合后端ExecuteRequest模型
        const requestData = {
            tool_id: tool_id,
            params: params,
            session_id: session_id, // 使用session_id作为会话ID字段
        };
        
        // 只有在有user_id值的情况下才添加此字段，并使用user_id字段名
        if (userIdStr) {
            requestData.user_id = userIdStr;
        }
        
        console.log("准备发送execute请求数据:", requestData);
        
        const response = await api.post(`${API_PREFIX}/execute`, requestData);
        
        console.log("Execute API Response:", response);
        
        // 检查响应中是否返回了session_id，并记录
        if (response.data && response.data.session_id) {
            console.log(`Execute响应中包含session_id: ${response.data.session_id}`);
        } else {
            console.warn(`⚠️ 警告: Execute响应中未找到session_id! 响应数据:`, response.data);
        }
        
        return response.data; 
    } catch (error) {
        console.error('API call to execute failed in function:', error);
        // Re-throw the processed error object from the interceptor
         throw error; 
    }
};

const getTools = async () => {
    try {
        console.log("获取工具列表...");
        const response = await api.get(`${API_PREFIX}/tools`);
        console.log("工具列表响应:", response.data);
        return response.data.tools; // 直接返回工具数组
    } catch (error) {
        console.error('获取工具列表失败:', error);
        throw error;
    }
};

// 获取单个工具（服务）详情
const getToolById = async (tool_id) => {
  try {
    console.log(`获取工具ID: ${tool_id} 的详情`);
    const response = await api.get(`${API_PREFIX}/tools/${tool_id}`);
    console.log("工具详情响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`获取工具ID: ${tool_id} 的详情失败:`, error);
    throw error;
  }
};

// 开发者API接口

// 获取开发者服务列表
const getDeveloperServices = async () => {
  try {
    console.log("获取开发者服务列表...");
    const response = await api.get(`${API_PREFIX}/dev/tools`);
    console.log("开发者服务列表响应:", response.data);
    return response.data.services;
  } catch (error) {
    console.error('获取开发者服务列表失败:', error);
    throw error;
  }
};

// 创建新服务
const createDeveloperService = async (serviceData) => {
  try {
    console.log("创建新服务...", serviceData);
    const response = await api.post(`${API_PREFIX}/dev/tools`, serviceData);
    console.log("创建服务响应:", response.data);
    return response.data;
  } catch (error) {
    console.error('创建服务失败:', error);
    throw error;
  }
};

// 获取单个开发者服务详情
const getDeveloperServiceById = async (serviceId) => {
  try {
    console.log(`获取开发者服务ID: ${serviceId} 的详情`);
    const response = await api.get(`${API_PREFIX}/dev/tools/${serviceId}`);
    console.log("开发者服务详情响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`获取开发者服务ID: ${serviceId} 的详情失败:`, error);
    throw error;
  }
};

// 更新服务
const updateDeveloperService = async (serviceId, updateData) => {
  try {
    console.log(`更新开发者服务ID: ${serviceId}`, updateData);
    const response = await api.put(`${API_PREFIX}/dev/tools/${serviceId}`, updateData);
    console.log("更新服务响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`更新开发者服务ID: ${serviceId} 失败:`, error);
    throw error;
  }
};

// 删除服务
const deleteDeveloperService = async (serviceId) => {
  try {
    console.log(`删除开发者服务ID: ${serviceId}`);
    const response = await api.delete(`${API_PREFIX}/dev/tools/${serviceId}`);
    console.log("删除服务响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`删除开发者服务ID: ${serviceId} 失败:`, error);
    throw error;
  }
};

// 上传API包
const uploadApiPackage = async (formData) => {
  try {
    console.log("上传API包...");
    const response = await api.post(`${API_PREFIX}/dev/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log("上传API包响应:", response.data);
    return response.data;
  } catch (error) {
    console.error('上传API包失败:', error);
    throw error;
  }
};

// 获取开发者应用列表
const getDeveloperApplications = async () => {
  try {
    console.log("获取开发者应用列表...");
    const response = await api.get(`${API_PREFIX}/dev/apps`);
    console.log("开发者应用列表响应:", response.data);
    return response.data.applications;
  } catch (error) {
    console.error('获取开发者应用列表失败:', error);
    throw error;
  }
};

// 创建新应用
const createDeveloperApplication = async (applicationData) => {
  try {
    console.log("创建新应用...", applicationData);
    const response = await api.post(`${API_PREFIX}/dev/apps`, applicationData);
    console.log("创建应用响应:", response.data);
    return response.data;
  } catch (error) {
    console.error('创建应用失败:', error);
    throw error;
  }
};

// 确认执行
const confirm = async (session_id, confirmed = true, user_input = '确认') => {
  try {
    console.log('确认执行请求:', { session_id, confirmed, user_input });
    
    // 参数验证
    if (!session_id) {
      throw new Error('session_id 是必需的');
    }
    
    // 根据confirmed参数生成相应的user_input
    const actualUserInput = confirmed ? (user_input || '确认') : '取消';
    
    const requestData = {
      session_id: session_id,
      user_input: actualUserInput
    };
    
    // 注意：user_id由后端从JWT token中获取，前端不需要传递
    
    const response = await api.post(`${API_PREFIX}/intent/confirm`, requestData);
    console.log('确认执行响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('确认执行失败:', error);
    throw error;
  }
};

// 测试已保存的API服务 (原 testApiService)
const testSavedApiService = async (serviceId, testData) => {
  try {
    console.log(`测试已保存的开发者服务ID: ${serviceId}`, testData);
    const response = await api.post(`${API_PREFIX}/dev/tools/${serviceId}/test`, testData);
    console.log("测试服务响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`测试已保存的开发者服务ID: ${serviceId} 失败:`, error);
    throw error;
  }
};

// 新增: 测试未保存的API服务配置
const testUnsavedDeveloperTool = async (toolConfiguration) => {
  // toolConfiguration should include all form fields + the testInput value
  // Example: { serviceName: 'Test', platformType: 'dify', ..., testInput: 'hello' }
  try {
    console.log("测试未保存的服务配置:", toolConfiguration);
    // This endpoint /api/dev/tools/test is NEW and needs to be implemented in the backend
    // and mocked in MSW. It receives the full tool config and test input.
    const response = await api.post(`${API_PREFIX}/dev/tools/test`, toolConfiguration);
    console.log("测试未保存的服务响应:", response.data);
    return response.data; // Expected: { success: boolean, raw_response?: any, error?: string }
  } catch (error) {
    console.error('测试未保存的服务配置失败:', error);
    throw error; // Let the interceptor handle formatting the error
  }
};

// 兼容性方法：将chat和voice请求映射到interpret接口
const sendChatMessage = async (query, user_id, session_id, context) => {
  try {
    console.log('Chat请求转换为interpret请求:', { query, user_id, session_id });
    const response = await interpret(query, session_id, user_id);
    return response;
  } catch (error) {
    console.error('Chat请求失败:', error);
    throw error;
  }
};

const sendVoiceRequest = async (voiceText, user_id, session_id, context) => {
  try {
    console.log('Voice请求转换为interpret请求:', { voiceText, user_id, session_id });
    const response = await interpret(voiceText, session_id, user_id);
    return response;
  } catch (error) {
    console.error('Voice请求失败:', error);
    throw error;
  }
};

// 获取服务列表（兼容旧接口）
const getServices = async () => {
  try {
    console.log('获取服务列表（通过工具接口）');
    const tools = await getTools();
    // 转换为旧格式以保持兼容性
    return {
      status: 'success',
      data: {
        services: tools.map(tool => ({
          id: tool.tool_id,
          name: tool.name,
          description: tool.description,
          type: tool.type,
          icon: 'api', // 默认图标
          color: 'var(--color-primary-light)' // 默认颜色
        }))
      }
    };
  } catch (error) {
    console.error('获取服务列表失败:', error);
    throw error;
  }
};

// MCP服务执行（兼容旧接口）
const executeMcpService = async (serverId, query, options = {}) => {
  try {
    console.log('MCP服务执行转换为标准执行流程:', { serverId, query, options });
    
    // 首先解析意图
    const interpretation = await interpret(query, options.session_id, options.user_id);
    
    // 然后执行工具
    if (interpretation.intent) {
      const result = await execute(
        interpretation.intent,
        interpretation.params || {},
        interpretation.session_id,
        options.user_id
      );
      return result;
    } else {
      throw new Error('无法解析用户意图');
    }
  } catch (error) {
    console.error('MCP服务执行失败:', error);
    throw error;
  }
};

// Generic methods for direct use by components if they import the default export
const apiClientInstance = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
  patch: (url, data, config) => api.patch(url, data, config),

  // 认证相关
  setAuthToken,
  login,
  register,
  getUserInfo,
  refreshToken,
  
  // 核心AI功能（后端标准接口）
  interpret,
  execute,
  confirm,
  getTools,
  getToolById,
  
  // 兼容性接口（映射到标准接口）
  sendChatMessage,
  sendVoiceRequest,
  getServices,
  executeMcpService,
  
  // 开发者API接口
  getDeveloperServices,
  createDeveloperService,
  getDeveloperServiceById,
  updateDeveloperService,
  deleteDeveloperService,
  uploadApiPackage,
  getDeveloperApplications,
  createDeveloperApplication,
  testSavedApiService,
  testUnsavedDeveloperTool,
};

export default apiClientInstance;