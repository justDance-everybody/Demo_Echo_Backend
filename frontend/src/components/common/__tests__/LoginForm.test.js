import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../LoginForm';
import { AuthContext } from '../../../contexts/AuthContext';
import { toast } from '../Toast';

// 模拟toast模块
jest.mock('../Toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}));

describe('LoginForm组件', () => {
  // 基础的AuthContext模拟
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();
  const defaultAuthContext = {
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
  };
  
  const renderWithAuthContext = (ui, authContextValue = defaultAuthContext) => {
    return render(
      <AuthContext.Provider value={authContextValue}>
        {ui}
      </AuthContext.Provider>
    );
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 基础渲染测试
  test('应该正确渲染表单组件', () => {
    renderWithAuthContext(<LoginForm />);
    
    // 验证标题
    expect(screen.getByText('用户登录')).toBeInTheDocument();
    
    // 验证输入框
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    
    // 验证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('没有账号？注册')).toBeInTheDocument();
  });
  
  // 表单验证测试
  test('当表单为空时应该显示验证错误', async () => {
    renderWithAuthContext(<LoginForm />);
    
    // 点击登录按钮
    userEvent.click(screen.getByText('登录'));
    
    // 验证显示错误信息
    expect(screen.getByText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    
    // 验证不会调用登录方法
    expect(mockLogin).not.toHaveBeenCalled();
  });
  
  // 登录成功测试
  test('正确提交表单时应调用登录方法', async () => {
    mockLogin.mockResolvedValue(true);
    
    renderWithAuthContext(<LoginForm />);
    
    // 输入用户名和密码
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    
    // 点击登录按钮
    userEvent.click(screen.getByText('登录'));
    
    // 验证登录方法被调用，参数正确
    expect(mockClearError).toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
  });
  
  // 登录失败测试
  test('登录失败时应显示错误提示', async () => {
    mockLogin.mockResolvedValue(false);
    
    renderWithAuthContext(<LoginForm />);
    
    // 输入用户名和密码
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    
    // 点击登录按钮
    userEvent.click(screen.getByText('登录'));
    
    // 验证显示错误提示
    expect(toast.error).toHaveBeenCalledWith('登录失败，请检查用户名和密码');
  });
  
  // 登录异常测试
  test('登录出现异常时应显示错误信息', async () => {
    mockLogin.mockRejectedValue(new Error('网络错误'));
    
    renderWithAuthContext(<LoginForm />);
    
    // 输入用户名和密码
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    
    // 点击登录按钮
    userEvent.click(screen.getByText('登录'));
    
    // 验证显示网络错误
    expect(toast.error).toHaveBeenCalledWith('网络错误');
  });
  
  // 注册按钮点击测试
  test('点击注册按钮应调用注册回调函数', () => {
    const mockRegisterClick = jest.fn();
    renderWithAuthContext(<LoginForm onRegisterClick={mockRegisterClick} />);
    
    // 点击注册按钮
    userEvent.click(screen.getByText('没有账号？注册'));
    
    // 验证回调被调用
    expect(mockRegisterClick).toHaveBeenCalled();
  });
  
  // 加载状态测试
  test('加载中状态应该禁用登录按钮', () => {
    renderWithAuthContext(<LoginForm />, {
      ...defaultAuthContext,
      loading: true
    });
    
    // 验证登录按钮显示加载状态
    const loginButton = screen.getByText('登录');
    expect(loginButton.closest('button')).toHaveAttribute('aria-disabled', 'true');
  });
}); 