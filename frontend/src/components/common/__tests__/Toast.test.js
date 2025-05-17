import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, ToastService, toast, ToastTypes } from '../Toast';

// 模拟定时器
jest.useFakeTimers();

describe('Toast组件', () => {
  // 测试渲染
  test('应该正确渲染Toast消息', () => {
    const messages = [
      { id: '1', content: '成功消息', type: ToastTypes.SUCCESS, exiting: false },
    ];
    
    render(<Toast messages={messages} removeMessage={() => {}} />);
    
    expect(screen.getByText('成功消息')).toBeInTheDocument();
  });
  
  // 测试多条消息
  test('应该可以显示多条消息', () => {
    const messages = [
      { id: '1', content: '成功消息', type: ToastTypes.SUCCESS, exiting: false },
      { id: '2', content: '错误消息', type: ToastTypes.ERROR, exiting: false },
    ];
    
    render(<Toast messages={messages} removeMessage={() => {}} />);
    
    expect(screen.getByText('成功消息')).toBeInTheDocument();
    expect(screen.getByText('错误消息')).toBeInTheDocument();
  });
});

describe('ToastService组件', () => {
  // 清除文档中的任何现有Portal
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  
  // 测试添加消息
  test('应该能添加新消息', () => {
    render(<ToastService />);
    
    // 使用toast API
    act(() => {
      toast.success('成功提示');
    });
    
    expect(screen.getByText('成功提示')).toBeInTheDocument();
  });
  
  // 测试消息自动移除
  test('消息应该在设定时间后自动移除', async () => {
    render(<ToastService />);
    
    // 使用toast API添加一个持续时间短的消息
    act(() => {
      toast.info('短暂消息', 500);
    });
    
    // 验证消息存在
    expect(screen.getByText('短暂消息')).toBeInTheDocument();
    
    // 快进时间
    act(() => {
      jest.advanceTimersByTime(800); // 包括动画时间
    });
    
    // 验证消息已移除
    await waitFor(() => {
      expect(screen.queryByText('短暂消息')).not.toBeInTheDocument();
    });
  });
  
  // 测试不同类型的消息
  test('应该支持不同类型的消息', () => {
    render(<ToastService />);
    
    // 使用不同的API方法
    act(() => {
      toast.success('成功消息');
      toast.error('错误消息');
      toast.warning('警告消息');
      toast.info('信息消息');
    });
    
    expect(screen.getByText('成功消息')).toBeInTheDocument();
    expect(screen.getByText('错误消息')).toBeInTheDocument();
    expect(screen.getByText('警告消息')).toBeInTheDocument();
    expect(screen.getByText('信息消息')).toBeInTheDocument();
  });
  
  // 测试手动移除功能
  test('应该能手动移除消息', () => {
    render(<ToastService />);
    
    let toastId;
    
    // 添加消息并获取ID
    act(() => {
      toastId = toast.info('可手动移除的消息', 0); // 持续时间为0，不会自动移除
    });
    
    expect(screen.getByText('可手动移除的消息')).toBeInTheDocument();
    
    // 手动移除消息
    act(() => {
      toast.remove(toastId);
      // 快进动画时间
      jest.advanceTimersByTime(300);
    });
    
    // 验证消息已移除
    expect(screen.queryByText('可手动移除的消息')).not.toBeInTheDocument();
  });
}); 