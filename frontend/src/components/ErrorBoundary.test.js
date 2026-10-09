import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// 创建一个会抛出错误的组件
const BuggyComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('测试错误');
  }
  return <div>正常组件</div>;
};

// 在测试前修改 console.error，避免测试日志中显示错误信息
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

// 在所有测试后恢复 console.error
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary 组件测试', () => {
  test('正常渲染子组件', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('正常组件')).toBeInTheDocument();
  });
  
  test('捕获并展示错误信息', () => {
    // 在React 16+中，错误边界在测试环境下不会捕获所有错误
    // 我们需要模拟这个过程或者捕获控制台错误
    // 使用 jest.spyOn 监视 console.error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // 期望渲染会产生错误
    expect(() => {
      render(
        <ErrorBoundary>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    }).not.toThrow();
    
    // 验证错误UI是否显示
    expect(screen.getByText('应用遇到问题')).toBeInTheDocument();
    expect(screen.getByText('我们正在努力解决这个问题，请稍后再试。')).toBeInTheDocument();
    
    // 测试"查看详细错误信息"的功能
    const detailsElement = screen.getByText('查看详细错误信息');
    fireEvent.click(detailsElement);
    
    // 这里我们验证错误信息中包含我们的测试错误
    expect(screen.getByText(/测试错误/)).toBeInTheDocument();
    
    // 验证刷新按钮存在
    expect(screen.getByRole('button', { name: /刷新页面/i })).toBeInTheDocument();
    
    // 清理 spy
    spy.mockRestore();
  });
  
  test('刷新按钮应该尝试重新加载页面', () => {
    // 模拟 window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = jest.fn();
    
    // 渲染错误边界并触发错误
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // 点击刷新按钮
    const refreshButton = screen.getByRole('button', { name: /刷新页面/i });
    fireEvent.click(refreshButton);
    
    // 验证 reload 被调用
    expect(window.location.reload).toHaveBeenCalled();
    
    // 还原原始函数
    window.location.reload = originalReload;
  });
}); 