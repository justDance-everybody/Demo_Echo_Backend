import axios from 'axios';
import { replaceContactsInText, replaceContactsInParams } from '../utils/addressBook';

const isDev = process.env.NODE_ENV === 'development';
// 开发环境：走 CRA 代理（相对路径 /api/...），避免 CORS
// 生产环境：使用环境变量或线上地址
const API_URL = isDev
  ? ''
  : (process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'https://xkvwqhdfaegy.sealosgzg.site');

const api = axios.create({
  baseURL: API_URL,
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
      } else if (status === 405) {
        errorMsg = '请求方法不被允许，请检查API配置';
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
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);

  const endpoints = [
    '/api/v1/auth/login',
    '/api/v1/auth/token', // 兼容部分后端使用 /token
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const data = response.data || {};
      const token = data.access_token || data.token || data.jwt || (data.data && data.data.token);
      const user = data.user || {
        id: data.user_id ?? data.id,
        username: data.username,
        role: (data.role || (data.user && data.user.role)) || 'user'
      };

      if (!token) {
        return {
          success: false,
          message: data.message || '登录返回中未包含 token'
        };
      }

      return {
        success: true,
        token,
        user
      };
    } catch (error) {
      lastError = error;
      // 遇到 404 或 Cannot POST 时尝试下一个候选端点
      const status = error?.originalError?.response?.status;
      const htmlText = error?.originalError?.response?.data;
      const isNotFound = status === 404 || (typeof htmlText === 'string' && /Cannot\s+POST/i.test(htmlText));
      if (!isNotFound) break;
    }
  }

  console.error('登录失败:', lastError);
  return {
    success: false,
    message: (lastError && lastError.message) || '登录失败，请稍后再试'
  };
};

// 用户注册
const register = async (username, password, email) => {
  try {
    const response = await api.post('/api/v1/auth/register', {
      username,
      password,
      email
    });

    const data = response.data || {};
    return {
      success: true,
      user: data.user || {
        id: data.id,
        username: data.username,
        role: data.role || 'user'
      },
      token: data.access_token || data.token
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
    const response = await api.get('/api/v1/auth/me');
    const data = response.data || {};
    const user = data.user || {
      id: data.id ?? data.user_id,
      username: data.username,
      role: data.role || 'user'
    };
    return { success: true, user };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return { success: false, message: error.message || '获取用户信息失败' };
  }
};

// 刷新令牌
const refreshToken = async () => {
  try {
    const response = await api.post('/api/v1/auth/refresh');
    const data = response.data || {};
    const token = data.access_token || data.token || data.jwt;
    const user = data.user || {
      id: data.id ?? data.user_id,
      username: data.username,
      role: data.role || 'user'
    };
    if (!token) return { success: false, message: '刷新失败，未返回 token' };
    return { success: true, token, user };
  } catch (error) {
    console.error('刷新令牌失败:', error);
    return { success: false, message: error.message || '刷新令牌失败' };
  }
};

// 原有的API方法

// 健康检查
const getHealth = async () => {
  try {
    const response = await api.get('/api/v1/mcp/health');
    return response.data; // 期望: { success: boolean, data: { servers: {...}, summary: {...} } }
  } catch (error) {
    console.error('健康检查失败:', error);
    throw error;
  }
};

const interpret = async (transcript, sessionId, userId) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return Promise.reject({ message: '身份验证失败，请先登录', originalError: null });
        }
        console.log(`发送interpret请求，携带sessionId: ${sessionId}`);
        const processedTranscript = replaceContactsInText(transcript);
        const response = await api.post('/api/v1/intent/interpret', {
            query: processedTranscript,
            session_id: sessionId || null,
            user_id: userId != null ? Number(userId) : undefined,
        });
        console.log(`收到interpret响应:`, response.data);
        
        // 检查响应中是否返回了sessionId，并记录
        if (response.data && response.data.sessionId) {
            console.log(`响应中包含sessionId: ${response.data.sessionId}`);
        } else {
            console.warn(`⚠️ 警告: 响应中未找到sessionId! 响应数据:`, response.data);
        }
        
        return response.data; // Extract data from successful response
    } catch (error) {
         console.error('API call to interpret failed in function:', error);
         // Re-throw the processed error object from the interceptor
         throw error; 
    }
};

const execute = async (toolId, params, sessionId, userId) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return Promise.reject({ message: '身份验证失败，请先登录', originalError: null });
        }
        // 参数验证
        if (!toolId) {
            throw new Error('工具ID不能为空');
        }
        if (!params || typeof params !== 'object') {
            throw new Error('参数必须是一个对象');
        }
        
        // 确保 user_id 为数字类型
        const userIdNum = userId != null ? Number(userId) : undefined;
        
        console.log(`发送execute请求，携带sessionId: ${sessionId}`);
        
        // 确保后端请求参数严格符合后端ExecuteRequest模型
        const requestData = {
            tool_id: toolId,
            params: replaceContactsInParams(params),
            session_id: sessionId,
        };
        
        // 只有在有userId值的情况下才添加此字段，并使用user_id字段名
        if (userIdNum !== undefined && !Number.isNaN(userIdNum)) {
            requestData.user_id = userIdNum;
        }
        
        console.log("准备发送execute请求数据:", requestData);
        
        const response = await api.post('/api/v1/tools/execute', requestData);
        
        console.log("Execute API Response:", response);
        
        // 检查响应中是否返回了sessionId，并记录
        if (response.data && response.data.sessionId) {
            console.log(`Execute响应中包含sessionId: ${response.data.sessionId}`);
        } else {
            console.warn(`⚠️ 警告: Execute响应中未找到sessionId! 响应数据:`, response.data);
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
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('未登录，跳过获取工具列表请求');
            return [];
        }
        console.log("获取工具列表...");
        const response = await api.get('/api/v1/tools');
        console.log("工具列表响应:", response.data);
        return response.data.tools; // 直接返回工具数组
    } catch (error) {
        console.error('获取工具列表失败:', error);
        throw error;
    }
};

// 获取单个工具（服务）详情
const getToolById = async (toolId) => {
  try {
    console.log(`获取工具ID: ${toolId} 的详情`);
    const response = await api.get(`/api/v1/tools/${toolId}`);
    console.log("工具详情响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`获取工具ID: ${toolId} 的详情失败:`, error);
    throw error;
  }
};

// 开发者API接口

// 获取开发者工具列表
const getDeveloperServices = async (params = {}) => {
  try {
    console.log("获取开发者工具列表...", params);
    
    // 构建查询参数
    const queryParams = new URLSearchParams();
    
    // 分页参数
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    // 筛选参数
    if (params.status) queryParams.append('status', params.status);
    if (params.is_public !== undefined) queryParams.append('is_public', params.is_public);
    if (params.search) queryParams.append('search', params.search);
    
    const url = `/api/v1/dev/integrations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get(url);
    
    console.log("开发者工具列表响应:", response.data);
    
    // 返回完整的响应数据，包含分页信息
    return {
      tools: response.data.tools || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      page_size: response.data.page_size || 10
    };
  } catch (error) {
    console.error('获取开发者工具列表失败:', error);
    throw error;
  }
};

// 创建新服务
const createDeveloperService = async (serviceData) => {
  try {
    console.log("创建新服务...", serviceData);
    const response = await api.post('/api/v1/dev/integrations', serviceData);
    console.log("创建服务响应:", response.status, response.data);
    // 返回完整响应，便于上层用 status 做判断
    return response;
  } catch (error) {
    console.error('创建服务失败:', error);
    throw error;
  }
};

// 获取单个开发者服务详情
const getDeveloperServiceById = async (serviceId) => {
  try {
    console.log(`获取开发者服务ID: ${serviceId} 的详情`);
    const response = await api.get(`/api/v1/dev/integrations/${serviceId}`);
    console.log("开发者服务详情响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`获取开发者服务ID: ${serviceId} 的详情失败:`, error);
    throw error;
  }
};

// 更新开发者工具
const updateDeveloperService = async (toolId, updateData) => {
  try {
    console.log(`更新开发者工具ID: ${toolId}`, updateData);
    const response = await api.put(`/api/v1/dev/integrations/${toolId}`, updateData);
    console.log("更新工具响应:", response.status, response.data);
    // 返回完整响应，便于上层用 status 做判断
    return response;
  } catch (error) {
    console.error(`更新开发者工具ID: ${toolId} 失败:`, error);
    throw error;
  }
};

// 删除开发者工具
const deleteDeveloperService = async (toolId) => {
  try {
    console.log(`删除开发者工具ID: ${toolId}`);
    const response = await api.delete(`/api/v1/dev/integrations/${toolId}`);
    console.log("删除工具响应:", response.status, response.data);
    // 返回完整响应，便于上层用 status 做判断
    return response;
  } catch (error) {
    console.error(`删除开发者工具ID: ${toolId} 失败:`, error);
    throw error;
  }
};

// 测试开发者工具
const testDeveloperTool = async (toolId, testData, timeout = 30) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return Promise.reject({ message: '身份验证失败，请先登录', originalError: null });
        }
        console.log(`测试开发者工具ID: ${toolId}`, testData);
        const payload = {
            tool_id: toolId,
            test_data: testData,
            timeout: timeout
        };
        const response = await api.post(`/api/v1/dev/integrations/${toolId}/test`, payload);
        console.log("测试工具响应:", response.status, response.data);
        return response;
    } catch (error) {
        console.error(`测试开发者工具ID: ${toolId} 失败:`, error);
        throw error;
    }
};

// 获取开发者工具列表（带分页与筛选）
const getDeveloperTools = async ({ page = 1, pageSize = 10, status, isPublic, search } = {}) => {
  try {
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    if (typeof isPublic === 'boolean') params.is_public = isPublic;
    if (search) params.search = search;

    const response = await api.get('/api/v1/dev/integrations', { params });
    return response.data; // 期望结构: { tools: [...], total, page, page_size }
  } catch (error) {
    console.error('获取开发者工具列表失败:', error);
    throw error;
  }
};

// 上传API包
const uploadApiPackage = async (formData) => {
  try {
    console.log("上传API包...");
    const response = await api.post('/api/v1/dev/upload', formData, {
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
    const response = await api.get('/api/v1/dev/apps');
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
    const response = await api.post('/api/v1/dev/apps', applicationData);
    console.log("创建应用响应:", response.data);
    return response.data;
  } catch (error) {
    console.error('创建应用失败:', error);
    throw error;
  }
};

// 测试已保存的API服务 (原 testApiService)
const testSavedApiService = async (serviceId, testData) => {
  try {
    console.log(`测试已保存的开发者服务ID: ${serviceId}`, testData);
    const response = await api.post(`/api/v1/dev/integrations/${serviceId}/test`, testData);
    console.log("测试服务响应:", response.data);
    return response.data;
  } catch (error) {
    console.error(`测试已保存的开发者服务ID: ${serviceId} 失败:`, error);
    throw error;
  }
};

// 新增: 测试未保存的API服务配置
const testUnsavedDeveloperTool = async (toolConfiguration) => {
    // toolConfiguration should include tool_config, test_data, and timeout
    // Format: { tool_config: {...}, test_data: {...}, timeout: 30 }
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return Promise.reject({ message: '身份验证失败，请先登录', originalError: null });
        }
        console.log("测试未保存的服务配置:", toolConfiguration);
        // 使用重构后的API路径
        const response = await api.post('/api/v1/dev/integrations/test', toolConfiguration);
        console.log("测试未保存的服务响应:", response.data);
        return response; // Return full response object to match API documentation format
    } catch (error) {
        console.error('测试未保存的服务配置失败:', error);
        throw error; // Let the interceptor handle formatting the error
    }
};

// Generic methods for direct use by components if they import the default export
const apiClientInstance = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
  patch: (url, data, config) => api.patch(url, data, config), // Added patch for completeness

  // You can also choose to expose specific, named functions through this default export if preferred by components
  setAuthToken,
  login,
  register,
  getUserInfo,
  refreshToken,
  interpret,
  execute,
  getTools,
  getToolById,
  // If there are specific developer tool functions that components might use via `apiClient.someFunc()`,
  // they could be added here too. For now, DeveloperConsolePage uses the generic get, put, delete.
  // 开发者API接口
  getDeveloperServices,
  createDeveloperService,
  getDeveloperServiceById,
  updateDeveloperService,
  deleteDeveloperService,
  testDeveloperTool,
  uploadApiPackage,
  getDeveloperApplications,
  createDeveloperApplication,
  testSavedApiService,          // Renamed original testApiService
  testUnsavedDeveloperTool,     // Added new method
  getHealth,
  getDeveloperTools,
};

export default apiClientInstance; 
