import axios from 'axios';

const api = axios.create({
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

const interpret = async (transcript, sessionId, userId) => {
    try {
        console.log(`发送interpret请求，携带sessionId: ${sessionId}`);
        const response = await api.post('/api/v1/interpret', {
            query: transcript, 
            sessionId: sessionId,
            userId: userId,
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
        // 参数验证
        if (!toolId) {
            throw new Error('工具ID不能为空');
        }
        if (!params || typeof params !== 'object') {
            throw new Error('参数必须是一个对象');
        }
        
        // 确保userId是字符串类型
        const userIdStr = userId ? String(userId) : null;
        
        console.log(`发送execute请求，携带sessionId: ${sessionId}`);
        
        // 确保后端请求参数严格符合后端ExecuteRequest模型
        const requestData = {
            tool_id: toolId,
            params: params,
            sessionId: sessionId, // 使用sessionId作为会话ID字段
        };
        
        // 只有在有userId值的情况下才添加此字段，并使用user_id字段名
        if (userIdStr) {
            requestData.user_id = userIdStr;
        }
        
        console.log("准备发送execute请求数据:", requestData);
        
        const response = await api.post('/api/v1/execute', requestData);
        
        console.log("Execute API Response:", response);
        
        // 检查响应中是否返回了sessionId，并记录
        if (response.data && response.data.sessionId) {
            console.log(`Execute响应中包含sessionId: ${response.data.sessionId}`);
        } else {
            console.warn(`⚠️ 警告: Execute响应中未找到sessionId! 响应数据:`, response.data);
        }
        
        return response.data; 
    } catch (error) {
        console.error('API call to /execute failed:', error);
        // Re-throw the processed error object from the interceptor
         throw error; 
    }
};

const getTools = async () => {
    try {
        console.log("获取工具列表...");
        const response = await api.get('/api/v1/tools');
        console.log("工具列表响应:", response.data);
        return response.data.tools; // 直接返回工具数组
    } catch (error) {
        console.error('获取工具列表失败:', error);
        throw error;
    }
};

const apiClient = {
  interpret,
  execute, 
  getTools,
};

export default apiClient; 