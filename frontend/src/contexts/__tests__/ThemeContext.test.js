import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '../ThemeContext';

// 创建一个测试组件，使用useTheme钩子
const TestComponent = () => {
  const { theme, toggleTheme, updateThemeVariable } = useTheme();
  
  return (
    <div>
      <div data-testid="theme-info">
        {theme.isDark ? 'Dark Theme' : 'Light Theme'}
      </div>
      <button 
        data-testid="toggle-button" 
        onClick={toggleTheme}
      >
        Toggle Theme
      </button>
      <button 
        data-testid="update-button" 
        onClick={() => updateThemeVariable('--color-primary', '#FF0000')}
      >
        Change Primary Color
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  // 模拟localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: jest.fn(key => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      removeItem: jest.fn(key => {
        delete store[key];
      }),
    };
  })();
  
  // 模拟document.documentElement
  const originalDocumentElement = document.documentElement;
  let mockDocumentElement;
  
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // 创建一个模拟的documentElement
    mockDocumentElement = {
      style: {
        setProperty: jest.fn(),
      },
      setAttribute: jest.fn(),
    };
    
    // 替换document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
    });
  });
  
  afterAll(() => {
    // 恢复原始documentElement
    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
    });
  });
  
  beforeEach(() => {
    // 清除localStorage模拟
    localStorageMock.clear();
    jest.clearAllMocks();
  });
  
  test('provides dark theme by default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme-info')).toHaveTextContent('Dark Theme');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
  
  test('toggles between dark and light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // 初始是暗色主题
    expect(screen.getByTestId('theme-info')).toHaveTextContent('Dark Theme');
    
    // 切换主题
    fireEvent.click(screen.getByTestId('toggle-button'));
    
    // 验证切换后是亮色主题
    expect(screen.getByTestId('theme-info')).toHaveTextContent('Light Theme');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    
    // 再次切换回暗色主题
    fireEvent.click(screen.getByTestId('toggle-button'));
    
    // 验证切换后是暗色主题
    expect(screen.getByTestId('theme-info')).toHaveTextContent('Dark Theme');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
  
  test('uses saved theme from localStorage', () => {
    // 设置localStorage中保存的主题为light
    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'theme') return 'light';
      return null;
    });
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // 验证使用了保存的亮色主题
    expect(screen.getByTestId('theme-info')).toHaveTextContent('Light Theme');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });
  
  test('updates theme variables and saves to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // 更新主题变量
    fireEvent.click(screen.getByTestId('update-button'));
    
    // 验证变量被更新
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-primary', 
      '#FF0000'
    );
    
    // 验证自定义主题被保存到localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'customTheme',
      expect.stringContaining('color-primary')
    );
  });
  
  test('applies saved custom theme variables from localStorage', () => {
    // 设置localStorage中保存的自定义主题
    const customTheme = { 'color-primary': '#00FF00' };
    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'customTheme') return JSON.stringify(customTheme);
      return null;
    });
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // 验证自定义主题变量被应用
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-primary', 
      '#00FF00'
    );
  });
  
  test('handles errors when parsing custom theme from localStorage', () => {
    // 设置无效的JSON
    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'customTheme') return 'invalid-json';
      return null;
    });
    
    // 模拟console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // 验证错误被记录
    expect(consoleSpy).toHaveBeenCalled();
    
    // 清理
    consoleSpy.mockRestore();
  });
}); 