import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';
import Settings from '../pages/Settings';
import ThemeSettings from '../components/ThemeSettings';
import ThemeToggle from '../components/ThemeToggle';

// 模拟localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (prop) => {
      const values = {
        '--primary-color': '#4FD1C5',
        '--secondary-color': '#805AD5',
        '--border-radius': '8px',
      };
      return values[prop] || '';
    }
  })
});

// 重置测试环境
beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  window.localStorage.clear();
  jest.clearAllMocks();
});

describe('主题系统集成测试', () => {
  // 单元测试：ThemeToggle组件
  test('ThemeToggle组件应该切换主题', () => {
    // 模拟主题上下文
    const mockToggleTheme = jest.fn();
    const mockTheme = { isDark: true };
    
    render(
      <ThemeProvider overrideValue={{ theme: mockTheme, toggleTheme: mockToggleTheme }}>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    // 找到主题切换按钮并点击
    const themeToggle = screen.getByLabelText('切换到亮色模式');
    fireEvent.click(themeToggle);
    
    // 验证toggleTheme被调用
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  // 单元测试：ThemeSettings组件
  test('ThemeSettings组件应该允许自定义主题色', () => {
    // 模拟主题上下文
    const mockUpdateThemeVariable = jest.fn();
    const mockTheme = { isDark: true };
    
    render(
      <ThemeProvider overrideValue={{ theme: mockTheme, updateThemeVariable: mockUpdateThemeVariable }}>
        <ThemeSettings />
      </ThemeProvider>
    );
    
    // 找到主题色选择器并更改值
    const colorPicker = screen.getByLabelText('主题色');
    fireEvent.change(colorPicker, { target: { value: '#FF5722' } });
    
    // 验证updateThemeVariable被调用
    expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--primary-color', '#FF5722');
  });
  
  // 集成测试：Settings页面
  test('Settings页面应该集成主题设置功能', async () => {
    // 模拟主题上下文
    const mockUpdateThemeVariable = jest.fn();
    const mockToggleTheme = jest.fn();
    const mockTheme = { isDark: true };
    
    render(
      <MemoryRouter>
        <ThemeProvider overrideValue={{ theme: mockTheme, toggleTheme: mockToggleTheme, updateThemeVariable: mockUpdateThemeVariable }}>
          <Settings />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // 检查外观和主题选项卡是否激活
    expect(screen.getByText('外观和主题')).toHaveAttribute('active');
    
    // 检查主题模式卡片是否存在
    expect(screen.getByText('主题模式')).toBeInTheDocument();
    
    // 点击显示设置按钮
    fireEvent.click(screen.getByText('显示设置'));
    
    // 等待主题设置组件显示
    await waitFor(() => {
      expect(screen.getByText('主题色')).toBeInTheDocument();
      expect(screen.getByText('辅助色')).toBeInTheDocument();
    });
    
    // 找到主题色选择器并更改值
    const colorPickers = screen.getAllByLabelText('主题色');  // 可能有多个
    fireEvent.change(colorPickers[0], { target: { value: '#FF5722' } });
    
    // 验证updateThemeVariable被调用
    expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--primary-color', '#FF5722');
    
    // 点击高级设置选项卡
    fireEvent.click(screen.getByText('高级设置'));
    
    // 检查开发者模式选项是否存在
    expect(screen.getByText('开发者模式')).toBeInTheDocument();
  });
  
  // 模拟完整应用中的主题持久化
  test('主题偏好应该保存到localStorage', () => {
    // 预设localStorage模拟
    window.localStorage.setItem('theme', 'light');
    
    // 渲染带有实际ThemeProvider的组件
    render(
      <ThemeProvider>
        <div>Test Component</div>
      </ThemeProvider>
    );
    
    // 获取document根元素的data-theme属性
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
  
  // 测试主题变量更新
  test('更新主题变量应该更新CSS变量', () => {
    // 监控document.documentElement.style.setProperty的调用
    document.documentElement.style.setProperty = jest.fn();
    
    render(
      <ThemeProvider>
        <ThemeSettings />
      </ThemeProvider>
    );
    
    // 找到主题色选择器并更改值
    const colorPicker = screen.getByLabelText('主题色');
    fireEvent.change(colorPicker, { target: { value: '#FF5722' } });
    
    // 验证setProperty被调用来设置CSS变量
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--primary-color', '#FF5722');
  });
}); 