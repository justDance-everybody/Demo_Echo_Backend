import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBar from '../StatusBar';

describe('StatusBar组件', () => {
  // 测试不同状态文本显示
  test('应该根据不同状态显示相应的文本', () => {
    // 定义测试的状态和期望文本
    const statusTestCases = [
      { status: 'idle', expected: '空闲，等待语音输入' },
      { status: 'listening', expected: '正在听您说话...' },
      { status: 'thinking', expected: '正在理解您的指令...' },
      { status: 'confirming', expected: '请确认操作...' },
      { status: 'executing', expected: '正在执行操作...' },
      { status: 'speaking', expected: '正在播报结果...' },
      { status: 'error', expected: '发生错误，请重试' },
      { status: 'unknown', expected: '未知状态' },
    ];

    // 测试每一种状态
    statusTestCases.forEach(({ status, expected }) => {
      const { rerender } = render(<StatusBar currentStatus={status} />);
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      // 清理并重新渲染下一个状态
      rerender(<></>);
    });
  });

  // 测试CSS类应用
  test('应该根据状态应用正确的CSS类', () => {
    const { container, rerender } = render(<StatusBar currentStatus="idle" />);
    
    // 检查容器是否有正确的类
    expect(container.firstChild).toHaveClass('status-bar-container');
    expect(container.firstChild).toHaveClass('status-idle');
    
    // 切换到另一个状态
    rerender(<StatusBar currentStatus="listening" />);
    expect(container.firstChild).toHaveClass('status-listening');
    
    // 切换到执行状态
    rerender(<StatusBar currentStatus="executing" />);
    expect(container.firstChild).toHaveClass('status-executing');
    
    // 切换到错误状态
    rerender(<StatusBar currentStatus="error" />);
    expect(container.firstChild).toHaveClass('status-error');
  });

  // 测试默认状态
  test('没有提供状态时，应该显示未知状态', () => {
    render(<StatusBar />);
    
    expect(screen.getByText('未知状态')).toBeInTheDocument();
  });
  
  // 测试文本元素
  test('应该包含状态文本元素', () => {
    const { container } = render(<StatusBar currentStatus="idle" />);
    
    // 检查文本元素是否存在并有正确的类
    const textElement = container.querySelector('.status-text');
    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveTextContent('空闲，等待语音输入');
  });
}); 