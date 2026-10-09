import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Footer from '../Footer';
import { ThemeContext } from '../../contexts/ThemeContext';

expect.extend(toHaveNoViolations);

// 模拟ThemeContext
const mockThemeContext = {
  theme: { isDark: true },
  toggleTheme: jest.fn(),
  updateThemeVariable: jest.fn()
};

// 创建一个包装组件提供必要的上下文
const FooterWithProviders = () => (
  <BrowserRouter>
    <ThemeContext.Provider value={mockThemeContext}>
      <Footer />
    </ThemeContext.Provider>
  </BrowserRouter>
);

describe('Footer组件', () => {
  test('正确渲染页脚组件并符合无障碍标准', async () => {
    const { container } = render(<FooterWithProviders />);
    
    // 验证页脚标题是否存在
    expect(screen.getByText('关于我们')).toBeInTheDocument();
    expect(screen.getByText('资源')).toBeInTheDocument();
    expect(screen.getByText('支持')).toBeInTheDocument();
    expect(screen.getByText('联系信息')).toBeInTheDocument();

    // 检查无障碍性
    expect(await axe(container)).toHaveNoViolations();
  });
  
  test('渲染联系信息', () => {
    render(<FooterWithProviders />);
    
    // 验证联系信息是否正确显示
    expect(screen.getByText(/support@echo-ai.com/)).toBeInTheDocument();
    expect(screen.getByText(/400-800-8888/)).toBeInTheDocument();
    expect(screen.getByText(/北京市海淀区科技园/)).toBeInTheDocument();

    // 验证版权区域的链接
    expect(screen.getByText('隐私政策')).toHaveAttribute('href', '/privacy');
    expect(screen.getByText('服务条款')).toHaveAttribute('href', '/terms');
    expect(screen.getByText('网站地图')).toHaveAttribute('href', '/sitemap');
  });
  
  test('包含正确的导航链接', () => {
    render(<FooterWithProviders />);
    
    // 验证关于我们部分的链接
    expect(screen.getByText('平台介绍')).toHaveAttribute('href', '/about');
    expect(screen.getByText('团队成员')).toHaveAttribute('href', '/team');
    expect(screen.getByText('联系我们')).toHaveAttribute('href', '/contact');
    
    // 验证资源部分的链接
    expect(screen.getByText('开发文档')).toHaveAttribute('href', '/docs');
    expect(screen.getByText('API参考')).toHaveAttribute('href', '/api');
    
    // 验证支持部分的链接
    expect(screen.getByText('帮助中心')).toHaveAttribute('href', '/help');
    expect(screen.getByText('常见问题')).toHaveAttribute('href', '/faq');
  });
  
  test('显示正确的版权年份', () => {
    // 模拟当前年份
    const currentYear = new Date().getFullYear();
    
    render(<FooterWithProviders />);
    
    // 验证版权信息中是否包含当前年份
    expect(screen.getByText(new RegExp(`© ${currentYear} Echo AI`))).toBeInTheDocument();
  });
  
  test('社交媒体链接具有正确的href和标签', () => {
    render(<FooterWithProviders />);
    
    // 验证社交媒体链接的href和aria-label
    const githubLink = screen.getByLabelText('GitHub');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/echo-ai');
    expect(githubLink).toHaveAttribute('target', '_blank');
    
    const twitterLink = screen.getByLabelText('Twitter');
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/echo-ai');
    expect(twitterLink).toHaveAttribute('target', '_blank');
  });
}); 