import React, { createContext, useState, useContext, useEffect } from 'react';
import GlobalStyles from '../styles/GlobalStyles';

// 深色主题
const darkTheme = {
  primary: '#4FD1C5',
  secondary: '#805AD5',
  background: '#1E1E2F',
  surface: '#27293D',
  text: '#F8F8F8',
  textSecondary: '#A0AEC0',
  border: '#2D3748',
  error: '#FC8181',
  success: '#68D391',
  warning: '#F6E05E',
  dialogBackground: '#27293D',
  dialogOverlay: 'rgba(0, 0, 0, 0.75)',
  buttonBackground: '#4FD1C5',
  buttonText: '#1A202C',
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  cardBackground: '#2D3748',
  navBackground: '#1E1E2F',
  isDark: true
};

// 浅色主题
const lightTheme = {
  primary: '#4FD1C5',
  secondary: '#805AD5',
  background: '#F7FAFC',
  surface: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#4A5568',
  border: '#E2E8F0',
  error: '#FC8181',
  success: '#68D391',
  warning: '#F6E05E',
  dialogBackground: '#FFFFFF',
  dialogOverlay: 'rgba(0, 0, 0, 0.4)',
  buttonBackground: '#4FD1C5',
  buttonText: '#FFFFFF',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  cardBackground: '#FFFFFF',
  navBackground: '#F7FAFC',
  isDark: false
};

// 创建主题上下文
const ThemeContext = createContext({
  theme: darkTheme,
  toggleTheme: () => {}
});

/**
 * 主题上下文提供者组件
 */
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 尝试从本地存储中恢复主题设置
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;  // 默认使用深色主题
  });
  
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // 切换主题
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // 当主题变化时保存到本地存储
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // 更新文档根元素的数据属性，用于CSS变量
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <GlobalStyles theme={theme} />
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * 使用主题上下文的自定义hook
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext; 