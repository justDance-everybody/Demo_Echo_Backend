import React, { createContext, useState, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

// 定义主题
const lightTheme = {
  bodyBackground: '#f5f5f5',
  headerBackground: '#ffffff',
  cardBackground: '#ffffff',
  primaryColor: '#1890ff',
  textColor: '#333333',
  secondaryTextColor: '#666666',
  borderColor: '#e8e8e8',
  buttonBackground: '#1890ff',
  buttonText: '#ffffff',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  dialogBackground: '#ffffff',
  dialogOverlay: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme = {
  bodyBackground: '#121212',
  headerBackground: '#1f1f1f',
  cardBackground: '#1f1f1f',
  primaryColor: '#1890ff',
  textColor: '#e0e0e0',
  secondaryTextColor: '#a0a0a0',
  borderColor: '#333333',
  buttonBackground: '#1890ff',
  buttonText: '#ffffff',
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  dialogBackground: '#2d2d2d',
  dialogOverlay: 'rgba(0, 0, 0, 0.7)',
};

// 创建主题上下文
export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

// 主题提供者组件
export const ThemeProvider = ({ children }) => {
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

  // 当主题发生变化时，更新文档的类名
  useEffect(() => {
    document.body.className = theme;
    document.body.style.backgroundColor = theme === 'light' 
      ? lightTheme.bodyBackground 
      : darkTheme.bodyBackground;
  }, [theme]);

  // 提供当前主题和切换函数
  const themeContextValue = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <StyledThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 