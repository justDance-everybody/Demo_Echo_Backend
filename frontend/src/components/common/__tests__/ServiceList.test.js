import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ServiceList from '../ServiceList';

// 模拟服务数据
const mockServices = [
  {
    id: '1',
    title: '语音助手',
    description: '智能语音对话',
    tags: ['语音', 'AI'],
    type: 'voice',
    provider: '系统',
    createdAt: '2025-01-01'
  },
  {
    id: '2',
    title: '天气服务',
    description: '查询天气信息',
    tags: ['天气', '日常'],
    type: 'content',
    provider: '系统',
    createdAt: '2025-01-02'
  },
  {
    id: '3',
    title: '翻译工具',
    description: '多语言翻译',
    tags: ['翻译', '语言'],
    type: 'content',
    provider: '系统',
    createdAt: '2025-01-03'
  }
];

// 模拟回调函数
const mockOnServiceClick = jest.fn();
const mockOnSearch = jest.fn();
const mockOnRetry = jest.fn();

// 辅助函数：带路由的渲染
const renderWithRouter = (ui) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('ServiceList组件', () => {
  // 基础渲染测试
  test('应该正确渲染服务列表', () => {
    renderWithRouter(
      <ServiceList 
        services={mockServices}
        onServiceClick={mockOnServiceClick}
      />
    );
    
    // 验证所有服务都被渲染
    expect(screen.getByText('语音助手')).toBeInTheDocument();
    expect(screen.getByText('天气服务')).toBeInTheDocument();
    expect(screen.getByText('翻译工具')).toBeInTheDocument();
    
    // 验证服务描述
    expect(screen.getByText('智能语音对话')).toBeInTheDocument();
    expect(screen.getByText('查询天气信息')).toBeInTheDocument();
    expect(screen.getByText('多语言翻译')).toBeInTheDocument();
    
    // 验证标签渲染
    expect(screen.getByText('语音')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });
  
  // 加载状态测试
  test('加载中状态应该显示加载指示器', () => {
    renderWithRouter(
      <ServiceList 
        services={[]}
        loading={true}
      />
    );
    
    expect(screen.getByText(/加载服务中/i)).toBeInTheDocument();
  });
  
  // 错误状态测试
  test('错误状态应该显示错误信息', () => {
    const errorMessage = '获取服务列表失败';
    
    renderWithRouter(
      <ServiceList 
        services={[]}
        error={errorMessage}
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // 点击重试按钮
    const retryButton = screen.getByText('重试');
    userEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });
  
  // 空状态测试
  test('空服务列表应该显示空状态', () => {
    renderWithRouter(
      <ServiceList 
        services={[]}
        loading={false}
      />
    );
    
    expect(screen.getByText('暂无服务')).toBeInTheDocument();
  });
  
  // 搜索功能测试
  test('搜索功能应该正常工作', async () => {
    renderWithRouter(
      <ServiceList 
        services={mockServices}
        onSearch={mockOnSearch}
      />
    );
    
    // 搜索输入
    const searchInput = screen.getByPlaceholderText('搜索服务');
    userEvent.type(searchInput, '语音');
    
    // 验证搜索回调被调用
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('语音');
    });
    
    // 验证过滤结果
    expect(screen.getByText('语音助手')).toBeInTheDocument();
    expect(screen.queryByText('天气服务')).not.toBeInTheDocument();
  });
  
  // 标签过滤测试
  test('标签过滤应该正常工作', () => {
    renderWithRouter(
      <ServiceList 
        services={mockServices}
      />
    );
    
    // 点击语音标签
    const voiceTab = screen.getByText('语音');
    userEvent.click(voiceTab);
    
    // 验证只显示语音服务
    expect(screen.getByText('语音助手')).toBeInTheDocument();
    expect(screen.queryByText('天气服务')).not.toBeInTheDocument();
    expect(screen.queryByText('翻译工具')).not.toBeInTheDocument();
  });
  
  // 视图切换测试
  test('视图切换应该正常工作', () => {
    renderWithRouter(
      <ServiceList 
        services={mockServices}
        defaultView="grid"
      />
    );
    
    // 找到列表视图按钮并点击
    const listViewButton = screen.getAllByRole('button')[1]; // 通常是第二个
    userEvent.click(listViewButton);
    
    // 应该以列表视图显示服务
    expect(document.querySelector('.list-view')).toBeInTheDocument();
  });
  
  // 排序功能测试
  test('排序功能应该正常工作', () => {
    renderWithRouter(
      <ServiceList 
        services={mockServices}
      />
    );
    
    // 找到排序选择器并选择按名称排序
    const sortSelect = screen.getByRole('combobox');
    userEvent.selectOptions(sortSelect, 'name-asc');
    
    // 验证排序结果 (天气服务应该在翻译工具之前)
    const serviceElements = screen.getAllByText(/服务|工具/i);
    expect(serviceElements[0]).toHaveTextContent('天气服务');
    expect(serviceElements[1]).toHaveTextContent('翻译工具');
    expect(serviceElements[2]).toHaveTextContent('语音助手');
  });
}); 