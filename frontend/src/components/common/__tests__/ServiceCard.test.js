import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ServiceCard from '../ServiceCard';

// 基本的服务数据
const mockServiceData = {
  id: 'service-1',
  title: '测试服务',
  description: '这是一个测试服务的描述',
  tags: ['测试', 'demo'],
  type: 'voice',
  provider: '测试提供商'
};

describe('ServiceCard组件', () => {
  // 基础渲染测试
  test('应该正确渲染卡片内容', () => {
    render(<ServiceCard {...mockServiceData} />);
    
    // 验证标题渲染
    expect(screen.getByText('测试服务')).toBeInTheDocument();
    
    // 验证描述渲染
    expect(screen.getByText('这是一个测试服务的描述')).toBeInTheDocument();
    
    // 验证标签渲染
    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
    
    // 验证提供商渲染
    expect(screen.getByText('提供者: 测试提供商')).toBeInTheDocument();
  });
  
  // 网格视图测试
  test('网格视图应该正确渲染', () => {
    render(<ServiceCard {...mockServiceData} viewMode="grid" />);
    
    // 检查是否使用了GridCard
    expect(document.querySelector('.adm-card')).toBeInTheDocument();
    
    // 验证标签全部显示
    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
    
    // 验证查看详情按钮存在
    expect(screen.getByText('查看详情')).toBeInTheDocument();
  });
  
  // 列表视图测试
  test('列表视图应该正确渲染', () => {
    render(<ServiceCard {...mockServiceData} viewMode="list" />);
    
    // 应该不使用Card组件，而是自定义的列表容器
    expect(document.querySelector('.adm-card')).not.toBeInTheDocument();
    
    // 验证列表特有的布局元素
    expect(document.querySelector('svg')).toBeInTheDocument(); // 右箭头图标
  });
  
  // 点击处理测试
  test('点击卡片应该触发onClick回调', () => {
    const handleClick = jest.fn();
    
    render(
      <ServiceCard 
        {...mockServiceData} 
        onClick={handleClick} 
      />
    );
    
    // 点击卡片
    userEvent.click(screen.getByText('测试服务'));
    
    // 验证点击回调被调用，且传入正确的id
    expect(handleClick).toHaveBeenCalledWith('service-1');
  });
  
  // 标签数量超限测试
  test('列表视图中标签超过3个时应显示+N', () => {
    const serviceWithManyTags = {
      ...mockServiceData,
      tags: ['标签1', '标签2', '标签3', '标签4', '标签5']
    };
    
    render(
      <ServiceCard 
        {...serviceWithManyTags} 
        viewMode="list" 
      />
    );
    
    // 验证只显示前3个标签
    expect(screen.getByText('标签1')).toBeInTheDocument();
    expect(screen.getByText('标签2')).toBeInTheDocument();
    expect(screen.getByText('标签3')).toBeInTheDocument();
    
    // 验证显示了+2标签
    expect(screen.getByText('+2')).toBeInTheDocument();
    
    // 验证第4个标签没有直接显示
    expect(screen.queryByText('标签4')).not.toBeInTheDocument();
  });
  
  // 类型图标测试
  test('根据服务类型显示正确的图标', () => {
    const { rerender } = render(<ServiceCard {...mockServiceData} type="voice" />);
    
    // voice类型应该有一个声音图标
    const voiceIcon = document.querySelector('svg');
    expect(voiceIcon).toBeInTheDocument();
    
    // 重新渲染为content类型
    rerender(<ServiceCard {...mockServiceData} type="content" />);
    
    // content类型应该有内容图标
    const contentIcon = document.querySelector('svg');
    expect(contentIcon).toBeInTheDocument();
    
    // 图标应该不同
    expect(contentIcon).not.toEqual(voiceIcon);
  });
}); 