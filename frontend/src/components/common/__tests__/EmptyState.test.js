import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '../EmptyState';

describe('EmptyState组件', () => {
  // 基础渲染测试
  test('应该正确渲染默认空状态', () => {
    render(<EmptyState />);
    
    expect(screen.getByText('这里是空的')).toBeInTheDocument();
    expect(screen.getByText('暂时没有内容可以显示')).toBeInTheDocument();
  });
  
  // 自定义内容测试
  test('应该正确渲染自定义标题和描述', () => {
    const title = '自定义标题';
    const description = '自定义描述文本';
    
    render(<EmptyState title={title} description={description} />);
    
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });
  
  // 不同类型测试
  test('应该根据类型显示不同内容', () => {
    // no-data类型
    const { rerender } = render(<EmptyState type="no-data" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前还没有数据，请稍后再试')).toBeInTheDocument();
    
    // no-results类型
    rerender(<EmptyState type="no-results" />);
    expect(screen.getByText('无搜索结果')).toBeInTheDocument();
    expect(screen.getByText('没有找到匹配的结果，请尝试其他搜索条件')).toBeInTheDocument();
    
    // error类型
    rerender(<EmptyState type="error" />);
    expect(screen.getByText('出错了')).toBeInTheDocument();
    expect(screen.getByText('加载数据时发生错误，请重试')).toBeInTheDocument();
  });
  
  // 按钮测试
  test('点击按钮应该触发回调', () => {
    const buttonText = '点击重试';
    const onButtonClick = jest.fn();
    
    render(
      <EmptyState 
        type="error" 
        buttonText={buttonText}
        onButtonClick={onButtonClick}
      />
    );
    
    const button = screen.getByText(buttonText);
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(onButtonClick).toHaveBeenCalledTimes(1);
  });
  
  // 不传递按钮文本时应不显示按钮
  test('不传递buttonText时不应显示按钮', () => {
    render(<EmptyState type="error" />);
    
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });
  
  // 全页面模式测试
  test('fullPage属性应影响容器样式', () => {
    const { container, rerender } = render(<EmptyState fullPage={true} />);
    
    // 检查容器是否有对应的样式
    const emptyContainer = container.firstChild;
    expect(emptyContainer).toHaveStyle('min-height: calc(100vh - 100px)');
    
    // 重新渲染为非全页面模式
    rerender(<EmptyState fullPage={false} />);
    expect(container.firstChild).toHaveStyle('min-height: 200px');
  });
}); 