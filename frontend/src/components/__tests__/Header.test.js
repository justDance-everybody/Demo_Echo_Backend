import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';
import { ThemeContext } from '../../theme/ThemeProvider';

// 模拟 VoiceDialog 组件
jest.mock('../VoiceDialog', () => {
  return jest.fn(({ onClose }) => (
    <div data-testid="mock-voice-dialog">
      <button onClick={onClose}>关闭对话框</button>
    </div>
  ));
});

// 为测试创建包装器组件
const HeaderWrapper = ({ theme = 'light', toggleTheme = jest.fn() }) => (
  <ThemeContext.Provider value={{ theme, toggleTheme }}>
    <Header />
  </ThemeContext.Provider>
);

describe('Header 组件', () => {
  // 测试基本渲染
  test('正确渲染标题和控件', () => {
    render(<HeaderWrapper />);
    
    // 验证 Logo 存在
    expect(screen.getByText('Echo')).toBeInTheDocument();
    
    // 验证语音按钮存在
    const voiceButton = screen.getByRole('button', { name: '' });
    expect(voiceButton).toBeInTheDocument();
    
    // 验证主题切换开关存在
    const themeSwitch = screen.getByRole('switch');
    expect(themeSwitch).toBeInTheDocument();
    
    // 初始状态下不应显示语音对话框
    expect(screen.queryByTestId('mock-voice-dialog')).not.toBeInTheDocument();
  });
  
  // 测试点击语音按钮
  test('点击语音按钮时显示对话框', () => {
    render(<HeaderWrapper />);
    
    // 找到并点击语音按钮
    const voiceButton = screen.getByRole('button', { name: '' });
    fireEvent.click(voiceButton);
    
    // 验证语音对话框显示
    const voiceDialog = screen.getByTestId('mock-voice-dialog');
    expect(voiceDialog).toBeInTheDocument();
    
    // 关闭对话框
    const closeButton = screen.getByText('关闭对话框');
    fireEvent.click(closeButton);
    
    // 验证对话框已关闭
    expect(screen.queryByTestId('mock-voice-dialog')).not.toBeInTheDocument();
  });
  
  // 测试主题切换
  test('点击主题切换开关时调用toggleTheme', () => {
    const mockToggleTheme = jest.fn();
    render(<HeaderWrapper toggleTheme={mockToggleTheme} />);
    
    // 找到并点击主题切换开关
    const themeSwitch = screen.getByRole('switch');
    fireEvent.click(themeSwitch);
    
    // 验证toggleTheme被调用
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  // 测试暗色主题渲染
  test('在暗色主题下正确渲染', () => {
    render(<HeaderWrapper theme="dark" />);
    
    // 在暗色模式下应该显示灯泡图标
    // 注意：由于图标实现方式的不同，这里的测试可能需要调整
    const themeSwitch = screen.getByRole('switch');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');
  });
}); 