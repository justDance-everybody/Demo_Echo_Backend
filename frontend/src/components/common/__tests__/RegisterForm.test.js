import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import RegisterForm from '../../RegisterForm';
import { AuthContext } from '../../../contexts/AuthContext';
import { toast } from '../Toast';

// 模拟toast模块
jest.mock('../Toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}));

describe('RegisterForm组件', () => {
  // 基础的AuthContext模拟
  const mockRegister = jest.fn();
  const mockClearError = jest.fn();
  const defaultAuthContext = {
    register: mockRegister,
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
  test('应该正确渲染注册表单组件', () => {
    renderWithAuthContext(<RegisterForm />);
    
    // 验证标题
    expect(screen.getByText('用户注册')).toBeInTheDocument();
    
    // 验证输入框
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请再次输入密码')).toBeInTheDocument();
    
    // 验证按钮
    expect(screen.getByText('注册')).toBeInTheDocument();
    expect(screen.getByText('已有账号？登录')).toBeInTheDocument();
  });
  
  // 表单验证测试-空字段
  test('当表单为空时应该显示验证错误', async () => {
    renderWithAuthContext(<RegisterForm />);
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示错误信息
    expect(screen.getByText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    
    // 验证不会调用注册方法
    expect(mockRegister).not.toHaveBeenCalled();
  });
  
  // 密码验证测试
  test('密码少于6位时应该显示错误提示', async () => {
    renderWithAuthContext(<RegisterForm />);
    
    // 填写表单，密码为5位
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'test@example.com');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), '12345');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), '12345');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示密码错误
    expect(screen.getByText('密码长度不能少于6位')).toBeInTheDocument();
    
    // 验证不会调用注册方法
    expect(mockRegister).not.toHaveBeenCalled();
  });
  
  // 密码确认测试
  test('两次密码不一致时应该显示错误提示', async () => {
    renderWithAuthContext(<RegisterForm />);
    
    // 填写表单，两次密码不一致
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'test@example.com');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'password456');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示密码不一致错误
    expect(screen.getByText('两次密码输入不一致')).toBeInTheDocument();
    
    // 验证不会调用注册方法
    expect(mockRegister).not.toHaveBeenCalled();
  });
  
  // 邮箱格式验证测试
  test('邮箱格式不正确时应该显示错误提示', async () => {
    renderWithAuthContext(<RegisterForm />);
    
    // 填写表单，邮箱格式不正确
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'invalid-email');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'password123');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示邮箱错误
    expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument();
    
    // 验证不会调用注册方法
    expect(mockRegister).not.toHaveBeenCalled();
  });
  
  // 注册成功测试
  test('表单正确提交时应调用注册方法', async () => {
    mockRegister.mockResolvedValue(true);
    
    renderWithAuthContext(<RegisterForm />);
    
    // 填写有效的表单数据
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'test@example.com');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'password123');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证清除错误和调用注册方法
    expect(mockClearError).toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalledWith('testuser', 'password123', 'test@example.com');
  });
  
  // 注册失败测试
  test('注册失败时应显示错误提示', async () => {
    mockRegister.mockResolvedValue(false);
    
    renderWithAuthContext(<RegisterForm />);
    
    // 填写有效的表单数据
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'test@example.com');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'password123');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示错误提示
    expect(toast.error).toHaveBeenCalledWith('注册失败，请重试');
  });
  
  // 注册异常测试
  test('注册出现异常时应显示错误信息', async () => {
    mockRegister.mockRejectedValue(new Error('用户名已存在'));
    
    renderWithAuthContext(<RegisterForm />);
    
    // 填写有效的表单数据
    userEvent.type(screen.getByPlaceholderText('请输入用户名'), 'testuser');
    userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'test@example.com');
    userEvent.type(screen.getByPlaceholderText('请输入密码'), 'password123');
    userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'password123');
    
    // 点击注册按钮
    userEvent.click(screen.getByText('注册'));
    
    // 验证显示指定错误
    expect(toast.error).toHaveBeenCalledWith('用户名已存在');
  });
  
  // 登录按钮点击测试
  test('点击登录按钮应调用登录回调函数', () => {
    const mockLoginClick = jest.fn();
    renderWithAuthContext(<RegisterForm onLoginClick={mockLoginClick} />);
    
    // 点击登录按钮
    userEvent.click(screen.getByText('已有账号？登录'));
    
    // 验证回调被调用
    expect(mockLoginClick).toHaveBeenCalled();
  });
  
  // 加载状态测试
  test('加载中状态应该禁用注册按钮', () => {
    renderWithAuthContext(<RegisterForm />, {
      ...defaultAuthContext,
      loading: true
    });
    
    // 验证注册按钮显示加载状态
    const registerButton = screen.getByText('注册');
    expect(registerButton.closest('button')).toHaveAttribute('aria-disabled', 'true');
  });
}); 