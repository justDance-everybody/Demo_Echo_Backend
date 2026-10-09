import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../AppLayout';

// 模拟react-router-dom的navigate和useLocation函数
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/services'
  })
}));

describe('AppLayout组件', () => {
  // 辅助函数：带路由的渲染
  const renderWithRouter = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    );
  };
  
  // 基础渲染测试
  test('应该正确渲染标题和内容', () => {
    renderWithRouter(
      <AppLayout title="测试标题">
        <div data-testid="test-content">测试内容</div>
      </AppLayout>
    );
    
    // 验证标题
    expect(screen.getByText('测试标题')).toBeInTheDocument();
    
    // 验证内容
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('测试内容')).toBeInTheDocument();
  });
  
  // 返回按钮测试
  test('应该根据showBack属性显示或隐藏返回按钮', () => {
    const { rerender } = renderWithRouter(
      <AppLayout title="测试" showBack={false} />
    );
    
    // 没有返回按钮
    expect(screen.queryByRole('button', { name: /返回/i })).not.toBeInTheDocument();
    
    // 重新渲染，显示返回按钮
    rerender(
      <MemoryRouter>
        <AppLayout title="测试" showBack={true} />
      </MemoryRouter>
    );
    
    // 有返回按钮
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
  
  // 自定义返回函数测试
  test('点击返回按钮应该调用onBack回调', () => {
    const mockOnBack = jest.fn();
    renderWithRouter(
      <AppLayout title="测试" showBack={true} onBack={mockOnBack} />
    );
    
    // 点击返回按钮
    const backButton = screen.getByRole('button');
    userEvent.click(backButton);
    
    // 验证回调被调用
    expect(mockOnBack).toHaveBeenCalled();
  });
  
  // 底部导航测试
  test('应该根据showTabBar属性显示或隐藏底部标签栏', () => {
    const { rerender } = renderWithRouter(
      <AppLayout title="测试" showTabBar={true} />
    );
    
    // 有底部标签栏
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('服务')).toBeInTheDocument();
    expect(screen.getByText('消息')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
    
    // 重新渲染，隐藏标签栏
    rerender(
      <MemoryRouter>
        <AppLayout title="测试" showTabBar={false} />
      </MemoryRouter>
    );
    
    // 现在菜单项应该在侧边栏，而不是底部
    expect(screen.getByText('首页')).toBeInTheDocument();
    
    // 底部标签栏应该被隐藏
    const tabBarContainer = document.querySelector('.adm-tab-bar');
    expect(tabBarContainer).not.toBeInTheDocument();
  });
  
  // 侧边导航测试
  test('应该根据showSideNav属性显示或隐藏侧边导航', () => {
    // 创建大屏幕环境
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
    
    const { rerender } = renderWithRouter(
      <AppLayout title="测试" showSideNav={true} />
    );
    
    // 侧边导航存在
    const sideNav = document.querySelector('nav');
    expect(sideNav).toBeInTheDocument();
    
    // 重新渲染，隐藏侧边导航
    rerender(
      <MemoryRouter>
        <AppLayout title="测试" showSideNav={false} />
      </MemoryRouter>
    );
    
    // 侧边导航被隐藏
    expect(document.querySelector('nav')).not.toBeInTheDocument();
  });
  
  // 移动端菜单测试
  test('点击移动端菜单按钮应打开移动菜单', () => {
    // 创建小屏幕环境
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    
    renderWithRouter(<AppLayout title="测试" />);
    
    // 点击菜单按钮
    const menuButton = screen.getByRole('button', { name: '菜单' });
    userEvent.click(menuButton);
    
    // 验证菜单打开
    expect(screen.getByText('菜单')).toBeInTheDocument();
    
    // 点击关闭按钮
    const closeButton = screen.getByRole('button', { name: '关闭菜单' });
    userEvent.click(closeButton);
    
    // 验证菜单关闭
    expect(screen.queryByText('菜单')).not.toBeInTheDocument();
  });
  
  // 路径高亮测试
  test('当前路径对应的导航项应该高亮显示', () => {
    // 模拟在服务页面
    jest.spyOn(require('react-router-dom'), 'useLocation').mockImplementation(() => ({
      pathname: '/services'
    }));
    
    renderWithRouter(<AppLayout title="测试" />);
    
    // 获取所有导航项
    const navItems = document.querySelectorAll('nav div');
    
    // 第二个项目(服务)应该高亮
    expect(navItems[1]).toHaveClass('active');
    
    // 其他项目不应该高亮
    expect(navItems[0]).not.toHaveClass('active');
  });
}); 