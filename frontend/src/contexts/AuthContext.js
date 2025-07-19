import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { toast } from '../components/common/Toast';

// 创建认证上下文
export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  role: null,
  login: () => {},
  register: () => {},
  logout: () => {},
  clearError: () => {}
});

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || 'user');

  // 清除错误
  const clearError = () => setError(null);

  // 设置认证状态
  const setAuth = (userData, authToken, userRole) => {
    localStorage.setItem('token', authToken);
    if (userRole) {
      localStorage.setItem('userRole', userRole);
    }
    setToken(authToken);
    setUser(userData);
    setRole(userRole || 'user');
    setIsAuthenticated(true);
    setLoading(false);
    apiClient.setAuthToken(authToken);
  };

  // 清除认证状态
  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setToken(null);
    setUser(null);
    setRole('user');
    setIsAuthenticated(false);
    apiClient.setAuthToken(null);
  };

  // 登录
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.login(username, password);
      
      if (response.success) {
        // 修复token字段不匹配的问题
        const authToken = response.token || response.access_token;
        setAuth(response.user, authToken, response.user?.role);
        toast.success('登录成功');
        return true;
      } else {
        setError(response.message || '登录失败');
        setLoading(false);
        toast.error(response.message || '登录失败');
        return false;
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || '登录失败，请稍后再试';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      return false;
    }
  };

  // 注册
  const register = async (username, password, email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.register(username, password, email);
      
      if (response.success) {
        // 修复token字段不匹配的问题
        const authToken = response.token || response.access_token;
        setAuth(response.user, authToken, response.user?.role);
        toast.success('注册成功');
        return true;
      } else {
        setError(response.message || '注册失败');
        setLoading(false);
        toast.error(response.message || '注册失败');
        return false;
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || '注册失败，请稍后再试';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      return false;
    }
  };

  // 注销
  const logout = () => {
    clearAuth();
    toast.success('已退出登录');
  };

  // 检查并刷新token
  const checkAuth = useCallback(async () => {
    if (!token) return;
    
    try {
      // 设置API客户端的token
      apiClient.setAuthToken(token);
      
      // 获取用户信息
      const userData = await apiClient.getUserInfo();
      
      if (userData && userData.id) {
        // 后端返回的是直接的用户数据，不是包装在success字段中
        setUser(userData);
        setRole(userData.role || 'user');
        setIsAuthenticated(true);
      } else {
        // 如果token无效，清除认证状态
        clearAuth();
      }
    } catch (err) {
      // token无效或网络错误，清除认证状态
      console.log('Token验证失败，清除认证状态:', err.message);
      clearAuth();
    }
  }, [token]);

  // 初始化加载用户信息
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 提供上下文值
  const authContextValue = {
    isAuthenticated,
    user,
    token,
    loading,
    error,
    role,
    login,
    register,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;