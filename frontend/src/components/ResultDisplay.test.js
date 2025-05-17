import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultDisplay from './ResultDisplay';

// 模拟TTS
jest.mock('../hooks/useTTS', () => () => ({
  speak: jest.fn(),
  cancel: jest.fn(),
  isSpeaking: false
}));

describe('ResultDisplay 组件测试', () => {
  test('渲染信息状态', () => {
    render(<ResultDisplay status="info" message="这是一条信息" />);
    
    expect(screen.getByText('这是一条信息')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  test('渲染成功状态', () => {
    render(<ResultDisplay status="success" message="操作成功" />);
    
    expect(screen.getByText('操作成功')).toBeInTheDocument();
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  test('渲染错误状态', () => {
    render(<ResultDisplay status="error" message="出现错误" />);
    
    expect(screen.getByText('出现错误')).toBeInTheDocument();
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  test('渲染警告状态', () => {
    render(<ResultDisplay status="warning" message="警告信息" />);
    
    expect(screen.getByText('警告信息')).toBeInTheDocument();
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  test('渲染复杂数据', () => {
    const complexData = {
      title: '天气预报',
      summary: '今天是晴天',
      details: {
        temperature: '25°C',
        humidity: '60%'
      }
    };
    
    render(<ResultDisplay status="success" data={complexData} />);
    
    expect(screen.getByText('天气预报')).toBeInTheDocument();
    expect(screen.getByText('今天是晴天')).toBeInTheDocument();
    expect(screen.getByText('25°C')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  test('调用关闭回调', () => {
    const onDismissMock = jest.fn();
    render(<ResultDisplay 
      status="success" 
      message="可关闭消息" 
      onDismiss={onDismissMock} 
    />);
    
    const closeButton = screen.getByRole('button', { name: /关闭/i });
    fireEvent.click(closeButton);
    
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  test('正确处理空数据', () => {
    render(<ResultDisplay status="info" />);
    
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });
}); 