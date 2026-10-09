import React, { createContext, useState, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { ThemeProvider as ContextThemeProvider } from '../contexts/ThemeContext';

// 使用基于CSS变量的主题对象
const themeObject = {
  background: 'var(--background)',
  surface: 'var(--surface)',
  text: 'var(--text)',
  textSecondary: 'var(--text-secondary)',
  border: 'var(--border)',
  primary: 'var(--color-primary)',
  primaryLight: 'var(--color-primary-light)',
  primaryDark: 'var(--color-primary-dark)',
  secondary: 'var(--color-secondary)',
  secondaryLight: 'var(--color-secondary-light)',
  secondaryDark: 'var(--color-secondary-dark)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  shadow: 'var(--shadow)'
};

// 创建主题上下文
export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

// 主题提供者组件 - 为了兼容性保留，但我们使用 contexts/ThemeContext 中的实现
const LegacyThemeProvider = ({ children }) => {
  // 从本地存储获取主题设置，默认为亮色主题
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // 切换主题函数
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // 当主题发生变化时，更新文档的data-theme属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 提供当前主题和切换函数
  const themeContextValue = {
    theme,
    toggleTheme,
  };

  // 使用StyledThemeProvider提供主题对象，这样styled-components可以访问主题变量
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <StyledThemeProvider theme={themeObject}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// 为了向后兼容性，我们导出contexts/ThemeContext中的ThemeProvider
export default ContextThemeProvider; 