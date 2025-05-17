import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import NavBar from '../NavBar';
import { ThemeContext } from '../../theme/ThemeProvider';

// 模拟窗口大小变化
const resizeWindow = (width) => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

// 为测试创建包装器组件
const NavBarWrapper = ({ theme = 'light', toggleTheme = jest.fn() }) => (
  <BrowserRouter>
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <NavBar />
    </ThemeContext.Provider>
  </BrowserRouter>
);

describe('NavBar 组件', () => {
  beforeAll(() => {
    // 保存原始的 window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024 // 默认为桌面视图
    });
  });

  afterEach(() => {
    // 重置 jest 模拟
    jest.clearAllMocks();
  });

  // 测试桌面视图渲染
  test('在桌面视图中正确渲染导航菜单', () => {
    resizeWindow(1024); // 设置为桌面尺寸
    render(<NavBarWrapper />);
    
    // 验证 Logo 存在
    expect(screen.getByText('Echo AI')).toBeInTheDocument();
    
    // 验证菜单项显示
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('个人中心')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
    
    // 验证语音助手按钮存在
    expect(screen.getByText('语音助手')).toBeInTheDocument();
    
    // 验证主题切换开关存在
    const themeSwitch = screen.getByRole('switch');
    expect(themeSwitch).toBeInTheDocument();
    
    // 验证移动菜单按钮在桌面模式下不可见
    const mobileMenuButton = screen.queryByRole('button', { name: /MenuOutlined/ });
    expect(mobileMenuButton).not.toBeVisible();
  });
  
  // 测试移动视图渲染
  test('在移动视图中正确渲染汉堡菜单', () => {
    resizeWindow(500); // 设置为移动设备尺寸
    render(<NavBarWrapper />);
    
    // 验证移动菜单按钮可见
    const mobileMenuButton = screen.getByRole('button');
    expect(mobileMenuButton).toBeVisible();
    
    // 菜单项应该在初始状态下不可见
    expect(screen.queryByText('首页')).not.toBeVisible();
    expect(screen.queryByText('个人中心')).not.toBeVisible();
    expect(screen.queryByText('设置')).not.toBeVisible();
    
    // 点击汉堡菜单，抽屉应该打开
    fireEvent.click(mobileMenuButton);
    
    // 抽屉中的菜单项应该显示
    // 注意：由于Drawer的实现可能会渲染在不同位置，这里的测试可能需要调整
    // 这里我们假设抽屉内容渲染在同一个DOM中
    const closeButton = screen.getByRole('button', { name: /CloseOutlined/ });
    expect(closeButton).toBeInTheDocument();
  });
  
  // 测试主题切换功能
  test('点击主题切换开关时调用toggleTheme', () => {
    const mockToggleTheme = jest.fn();
    resizeWindow(1024); // 设置为桌面尺寸
    render(<NavBarWrapper toggleTheme={mockToggleTheme} />);
    
    // 找到并点击主题切换开关
    const themeSwitch = screen.getByRole('switch');
    fireEvent.click(themeSwitch);
    
    // 验证toggleTheme被调用
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  // 测试暗色主题渲染
  test('在暗色主题下正确渲染', () => {
    resizeWindow(1024);
    render(<NavBarWrapper theme="dark" />);
    
    // 验证开关在正确的位置
    const themeSwitch = screen.getByRole('switch');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');
  });
}); 