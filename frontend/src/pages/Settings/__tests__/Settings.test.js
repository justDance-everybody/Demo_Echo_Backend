import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../index';
import { ThemeContext } from '../../../contexts/ThemeContext';

// 模拟主题上下文
const mockThemeContext = {
  theme: { isDark: true },
  toggleTheme: jest.fn(),
  updateThemeVariable: jest.fn()
};

// 设置测试环境
beforeAll(() => {
  // 模拟getComputedStyle方法获取CSS变量
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: (prop) => {
        if (prop === '--primary-color') return '#4FD1C5';
        if (prop === '--secondary-color') return '#805AD5';
        if (prop === '--border-radius') return '8px';
        return '';
      }
    })
  });
});

// 重置模拟
afterEach(() => {
  jest.clearAllMocks();
});

describe('Settings页面', () => {
  test('正确渲染Settings页面', () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <Settings />
      </ThemeContext.Provider>
    );
    
    // 验证标题
    expect(screen.getByText('设置')).toBeInTheDocument();
    
    // 验证选项卡
    expect(screen.getByText('外观和主题')).toBeInTheDocument();
    expect(screen.getByText('高级设置')).toBeInTheDocument();
    expect(screen.getByText('账户设置')).toBeInTheDocument();
    
    // 验证默认显示的外观选项卡内容
    expect(screen.getByText('主题模式')).toBeInTheDocument();
    expect(screen.getByText('字体设置')).toBeInTheDocument();
  });
  
  test('切换选项卡应该显示不同内容', async () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <Settings />
      </ThemeContext.Provider>
    );
    
    // 默认显示外观选项卡内容
    expect(screen.getByText('主题模式')).toBeInTheDocument();
    
    // 点击高级设置选项卡
    fireEvent.click(screen.getByText('高级设置'));
    
    // 验证高级设置内容显示
    expect(screen.getByText('高级功能')).toBeInTheDocument();
    expect(screen.getByText('开发者模式')).toBeInTheDocument();
    
    // 点击账户设置选项卡
    fireEvent.click(screen.getByText('账户设置'));
    
    // 验证账户设置内容显示
    expect(screen.getByText('账户信息')).toBeInTheDocument();
    expect(screen.getByText('更改密码')).toBeInTheDocument();
  });
  
  test('点击显示设置按钮应该显示主题设置', async () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <Settings />
      </ThemeContext.Provider>
    );
    
    // 默认主题设置是隐藏的
    expect(screen.queryByText('主题设置', { selector: 'h2' })).not.toBeInTheDocument();
    
    // 点击显示设置按钮
    fireEvent.click(screen.getByText('显示设置'));
    
    // 验证主题设置显示
    expect(screen.getByText('主题设置', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('主题色')).toBeInTheDocument();
    expect(screen.getByText('辅助色')).toBeInTheDocument();
    
    // 点击隐藏设置按钮
    fireEvent.click(screen.getByText('隐藏设置'));
    
    // 验证主题设置隐藏
    expect(screen.queryByText('主题设置', { selector: 'h2' })).not.toBeInTheDocument();
  });
  
  test('开发者模式开关应该显示样式调试器', async () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <Settings />
      </ThemeContext.Provider>
    );
    
    // 切换到高级设置选项卡
    fireEvent.click(screen.getByText('高级设置'));
    
    // 默认样式调试器是隐藏的
    expect(screen.queryByText('样式调试器')).not.toBeInTheDocument();
    
    // 开启开发者模式
    const devModeCheckbox = screen.getByLabelText('开发者模式');
    fireEvent.click(devModeCheckbox);
    
    // 验证样式调试器显示
    expect(screen.getByText('样式调试器')).toBeInTheDocument();
    expect(screen.getByText('样式调试面板')).toBeInTheDocument();
  });
}); 