import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StyleEditor from '../StyleEditor';
import { ThemeContext } from '../../contexts/ThemeContext';

// 模拟ThemeContext
const mockThemeContext = {
  theme: {
    isDark: true,
    primary: '#4FD1C5',
    background: '#1E1E2F',
    text: '#F8F8F8'
  },
  updateThemeVariable: jest.fn(),
  toggleTheme: jest.fn()
};

// 模拟document.documentElement.style的getPropertyValue方法
Object.defineProperty(window.document.documentElement.style, 'getPropertyValue', {
  value: jest.fn().mockImplementation((prop) => {
    const mockValues = {
      '--color-primary': '#4FD1C5',
      '--color-secondary': '#805AD5',
      '--background': '#1E1E2F',
      '--surface': '#27293D',
      '--text': '#F8F8F8',
      '--radius-md': '8px',
      '--radius-lg': '12px',
    };
    return mockValues[prop] || '';
  }),
  configurable: true
});

// 模拟计算样式的getComputedStyle
window.getComputedStyle = jest.fn().mockImplementation(() => ({
  getPropertyValue: (prop) => {
    const mockValues = {
      '--color-primary': '#4FD1C5',
      '--color-secondary': '#805AD5',
      '--background': '#1E1E2F',
      '--surface': '#27293D',
      '--text': '#F8F8F8',
      '--radius-md': '8px',
      '--radius-lg': '12px',
    };
    return mockValues[prop] || '';
  }
}));

describe('StyleEditor组件', () => {
  const mockUpdateThemeVariable = jest.fn();
  const mockThemeContext = {
    theme: { 
      isDark: true,
      variables: {
        '--primary-color': '#3498db',
        '--secondary-color': '#2ecc71',
        '--text-color': '#ffffff'
      }
    },
    toggleTheme: jest.fn(),
    updateThemeVariable: mockUpdateThemeVariable
  };

  beforeEach(() => {
    mockUpdateThemeVariable.mockClear();
  });

  test('正确渲染主题变量', () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <StyleEditor />
      </ThemeContext.Provider>
    );

    // 检查标题存在
    expect(screen.getByText('样式编辑器')).toBeInTheDocument();
    
    // 检查颜色变量是否显示
    expect(screen.getByText('--primary-color')).toBeInTheDocument();
    expect(screen.getByText('--secondary-color')).toBeInTheDocument();
    expect(screen.getByText('--text-color')).toBeInTheDocument();
    
    // 检查颜色输入框
    const colorInputs = screen.getAllByRole('textbox');
    expect(colorInputs.length).toBe(3); // 应该有3个颜色变量输入框
  });

  test('修改颜色变量时调用updateThemeVariable', async () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <StyleEditor />
      </ThemeContext.Provider>
    );

    // 获取第一个变量的输入框（--primary-color）
    const inputs = screen.getAllByRole('textbox');
    const primaryColorInput = inputs[0];
    
    // 修改颜色值
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });
    
    // 检查updateThemeVariable是否被调用
    await waitFor(() => {
      expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--primary-color', '#ff0000');
    });
  });

  test('重置按钮功能', () => {
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <StyleEditor />
      </ThemeContext.Provider>
    );

    // 查找并点击重置按钮
    const resetButton = screen.getByText('重置为默认值');
    fireEvent.click(resetButton);
    
    // 验证所有默认颜色被重置
    expect(mockUpdateThemeVariable).toHaveBeenCalledTimes(3); // 应该重置三个颜色变量
  });

  test('导出主题配置', () => {
    // 模拟window.URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    
    render(
      <ThemeContext.Provider value={mockThemeContext}>
        <StyleEditor />
      </ThemeContext.Provider>
    );

    // 查找并点击导出按钮
    const exportButton = screen.getByText('导出主题配置');
    fireEvent.click(exportButton);
    
    // 检查是否创建了下载链接
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
}); 