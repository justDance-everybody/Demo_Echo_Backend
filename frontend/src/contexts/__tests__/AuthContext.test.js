import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, AuthContext } from '../AuthContext';
import { toast } from '../../components/common/Toast';

// 模拟API客户端
jest.mock('../../services/apiClient', () => ({
  setAuthToken: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  getUserInfo: jest.fn(),
  refreshToken: jest.fn()
}));

// 模拟Toast
jest.mock('../../components/common/Toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// 导入模拟的apiClient
import apiClient from '../../services/apiClient';

// 测试组件
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    register, 
    logout, 
    loading, 
    error 
  } = React.useContext(AuthContext);
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? '已登录' : '未登录'}
      </div>
      {user && (
        <div data-testid="username">{user.username}</div>
      )}
      {error && (
        <div data-testid="error">{error}</div>
      )}
      {loading && (
        <div data-testid="loading">加载中...</div>
      )}
      <button 
        onClick={() => login('testuser', 'password123')}
        data-testid="login-button"
      >
        登录
      </button>
      <button 
        onClick={() => register('newuser', 'password123', 'new@example.com')}
        data-testid="register-button"
      >
        注册
      </button>
      <button 
        onClick={logout}
        data-testid="logout-button"
      >
        退出
      </button>
    </div>
  );
};

describe('AuthContext组件', () => {
  beforeEach(() => {
    // 清除模拟函数的调用记录
    jest.clearAllMocks();
    
    // 清除localStorage
    localStorage.clear();
    
    // 模拟localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });
  
  test('初始状态应该是未认证的', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('未登录');
    expect(screen.queryByTestId('username')).not.toBeInTheDocument();
  });
  
  test('登录成功应该更新认证状态', async () => {
    // 模拟成功登录
    apiClient.login.mockResolvedValueOnce({
      success: true,
      user: { username: 'testuser', id: '123' },
      token: 'fake-token'
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // 点击登录按钮
    const loginButton = screen.getByTestId('login-button');
    await act(async () => {
      userEvent.click(loginButton);
    });
    
    // 等待状态更新
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('已登录');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });
    
    // 验证API调用
    expect(apiClient.login).toHaveBeenCalledWith('testuser', 'password123');
    
    // 验证localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
    
    // 验证Toast消息
    expect(toast.success).toHaveBeenCalledWith('登录成功');
  });
  
  test('登录失败应该显示错误消息', async () => {
    // 模拟登录失败
    apiClient.login.mockResolvedValueOnce({
      success: false,
      message: '用户名或密码错误'
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // 点击登录按钮
    const loginButton = screen.getByTestId('login-button');
    await act(async () => {
      userEvent.click(loginButton);
    });
    
    // 等待状态更新
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('用户名或密码错误');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('未登录');
    });
    
    // 验证Toast消息
    expect(toast.error).toHaveBeenCalledWith('用户名或密码错误');
  });
  
  test('登录时应该显示加载状态', async () => {
    // 延迟模拟登录响应
    apiClient.login.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => 
        resolve({
          success: true,
          user: { username: 'testuser', id: '123' },
          token: 'fake-token'
        }), 100)
      )
    );
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // 点击登录按钮
    const loginButton = screen.getByTestId('login-button');
    await act(async () => {
      userEvent.click(loginButton);
    });
    
    // 应该显示加载中状态
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // 等待登录完成
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('已登录');
    });
  });
  
  test('注册成功应该更新认证状态', async () => {
    // 模拟成功注册
    apiClient.register.mockResolvedValueOnce({
      success: true,
      user: { username: 'newuser', id: '456' },
      token: 'new-fake-token'
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // 点击注册按钮
    const registerButton = screen.getByTestId('register-button');
    await act(async () => {
      userEvent.click(registerButton);
    });
    
    // 等待状态更新
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('已登录');
      expect(screen.getByTestId('username')).toHaveTextContent('newuser');
    });
    
    // 验证API调用
    expect(apiClient.register).toHaveBeenCalledWith('newuser', 'password123', 'new@example.com');
    
    // 验证localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-fake-token');
    
    // 验证Toast消息
    expect(toast.success).toHaveBeenCalledWith('注册成功');
  });
  
  test('注销应该清除认证状态', async () => {
    // 模拟已登录状态
    localStorage.getItem.mockReturnValueOnce('fake-token');
    apiClient.getUserInfo.mockResolvedValueOnce({
      success: true,
      user: { username: 'testuser', id: '123' }
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // 等待认证状态加载
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('已登录');
    });
    
    // 点击注销按钮
    const logoutButton = screen.getByTestId('logout-button');
    await act(async () => {
      userEvent.click(logoutButton);
    });
    
    // 验证状态更新
    expect(screen.getByTestId('auth-status')).toHaveTextContent('未登录');
    expect(screen.queryByTestId('username')).not.toBeInTheDocument();
    
    // 验证localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    
    // 验证Toast消息
    expect(toast.success).toHaveBeenCalledWith('已退出登录');
  });
}); 