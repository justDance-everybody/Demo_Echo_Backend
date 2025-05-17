import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner, { PageLoading, OverlayLoading } from '../LoadingSpinner';

describe('LoadingSpinner组件', () => {
  // 基础渲染测试
  test('应该正确渲染默认加载器', () => {
    render(<LoadingSpinner />);
    
    // 检查默认文本
    expect(screen.getByText('加载中')).toBeInTheDocument();
  });
  
  // 自定义文本测试
  test('应该显示自定义加载文本', () => {
    const customText = '正在处理数据';
    render(<LoadingSpinner text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
  });
  
  // 不显示文本测试
  test('传入空文本时不应显示文本', () => {
    render(<LoadingSpinner text="" />);
    
    // 不应该有加载文本
    expect(screen.queryByText('加载中')).not.toBeInTheDocument();
  });
  
  // 全屏模式测试
  test('fullScreen属性应影响容器样式', () => {
    const { container, rerender } = render(<LoadingSpinner fullScreen={true} />);
    
    // 检查容器是否有对应的样式
    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveStyle('min-height: 100vh');
    
    // 重新渲染为非全屏模式
    rerender(<LoadingSpinner fullScreen={false} />);
    expect(container.firstChild).toHaveStyle('min-height: 100px');
  });
  
  // 覆盖层模式测试
  test('overlay属性应影响容器样式', () => {
    const { container } = render(<LoadingSpinner overlay={true} />);
    
    // 检查容器是否有对应的样式
    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveStyle('position: fixed');
    expect(spinnerContainer).toHaveStyle('opacity: 0.9');
  });
  
  // PageLoading测试
  test('PageLoading应该渲染全屏加载器', () => {
    const { container } = render(<PageLoading />);
    
    // 检查是否为全屏模式
    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveStyle('min-height: 100vh');
    
    // 检查默认文本
    expect(screen.getByText('页面加载中')).toBeInTheDocument();
  });
  
  // OverlayLoading测试
  test('OverlayLoading应该渲染覆盖层加载器', () => {
    const { container } = render(<OverlayLoading />);
    
    // 检查是否为覆盖层模式
    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveStyle('position: fixed');
    expect(spinnerContainer).toHaveStyle('opacity: 0.9');
    
    // 检查默认文本
    expect(screen.getByText('处理中')).toBeInTheDocument();
  });
  
  // 自定义OverlayLoading文本测试
  test('OverlayLoading应该支持自定义文本', () => {
    const customText = '正在上传文件';
    render(<OverlayLoading text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
  });
}); 