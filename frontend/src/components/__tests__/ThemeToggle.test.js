import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import ThemeToggle from '../ThemeToggle';
import { ThemeContext } from '../../contexts/ThemeContext';

expect.extend(toHaveNoViolations);

// 简化antd-mobile模拟
jest.mock('antd-mobile', () => ({
  Button: ({ children, onClick }) => (
    <button onClick={onClick} data-testid="theme-toggle-button">{children}</button>
  )
}));

describe('ThemeToggle组件', () => {
  const mockToggleTheme = jest.fn();
  
  // 模拟暗色主题
  const darkThemeContextValue = {
    theme: { isDark: true },
    toggleTheme: mockToggleTheme,
    updateThemeVariable: jest.fn()
  };
  
  // 模拟亮色主题
  const lightThemeContextValue = {
    theme: { isDark: false },
    toggleTheme: mockToggleTheme,
    updateThemeVariable: jest.fn()
  };
  
  beforeEach(() => {
    mockToggleTheme.mockClear();
  });

  test('暗色主题下正确渲染月亮图标且无障碍违规', async () => {
    const { container } = render(
      <ThemeContext.Provider value={darkThemeContextValue}>
        <ThemeToggle id="theme-toggle-dark" />
      </ThemeContext.Provider>
    );
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveTextContent('🌙');
    expect(toggleButton).toHaveAttribute('aria-label', '切换到亮色模式');
    expect(toggleButton).toHaveAttribute('id', 'theme-toggle-dark');

    expect(await axe(container)).toHaveNoViolations();
  });

  test('亮色主题下正确渲染太阳图标且无障碍违规', async () => {
    const { container } = render(
      <ThemeContext.Provider value={lightThemeContextValue}>
        <ThemeToggle id="theme-toggle-light" />
      </ThemeContext.Provider>
    );
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveTextContent('☀️');
    expect(toggleButton).toHaveAttribute('aria-label', '切换到暗色模式');
    expect(toggleButton).toHaveAttribute('id', 'theme-toggle-light');

    expect(await axe(container)).toHaveNoViolations();
  });

  test('点击按钮时调用toggleTheme函数', () => {
    render(
      <ThemeContext.Provider value={darkThemeContextValue}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  test('接受themeOverride和toggleThemeOverride属性且无障碍违规', async () => {
    const customToggle = jest.fn();
    
    const { container } = render(
      <ThemeToggle 
        id="theme-toggle-override" 
        themeOverride={{ isDark: true }} 
        toggleThemeOverride={customToggle} 
      />
    );
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(customToggle).toHaveBeenCalledTimes(1);
    expect(mockToggleTheme).not.toHaveBeenCalled();
    expect(toggleButton).toHaveAttribute('id', 'theme-toggle-override');

    expect(await axe(container)).toHaveNoViolations();
  });
}); 