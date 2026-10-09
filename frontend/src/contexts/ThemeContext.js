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
export const ThemeContext = createContext({
  theme: darkTheme,
  toggleTheme: () => {},
  updateThemeVariable: () => {}
});

/**
 * 主题上下文提供者组件
 */
export const ThemeProvider = ({ children, overrideValue }) => {
  // 初始化状态 - 总是在组件顶层调用hooks
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 尝试从本地存储中恢复主题设置
    if (typeof localStorage !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;  // 默认使用深色主题
    }
    return true; // 默认深色主题
  });
  
  // 存储自定义主题变量
  const [customTheme, setCustomTheme] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedCustomTheme = localStorage.getItem('customTheme');
        return savedCustomTheme ? JSON.parse(savedCustomTheme) : {};
      }
      return {};
    } catch (e) {
      console.error('Failed to parse custom theme from localStorage:', e);
      return {};
    }
  });
  
  // 当主题变化时保存到本地存储
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
    
    // 更新文档根元素的数据属性，用于CSS变量
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      
      // 应用自定义主题变量
      Object.entries(customTheme).forEach(([key, value]) => {
        if (key !== 'isDark') {
          document.documentElement.style.setProperty(`--${key}`, value);
        }
      });
    }
  }, [isDarkMode, customTheme]);
  
  // 切换主题
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // 更新主题变量
  const updateThemeVariable = (varName, value) => {
    // 更新CSS变量
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(varName, value);
    }
    
    // 更新自定义主题状态
    setCustomTheme(prev => {
      const newCustomTheme = { 
        ...prev,
        [varName.replace('--', '')]: value 
      };
      
      // 保存到本地存储
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('customTheme', JSON.stringify(newCustomTheme));
      }
      
      return newCustomTheme;
    });
  };
  
  // 如果提供了overrideValue，使用这个值作为上下文值（用于测试）
  // 但仍然确保所有hooks都在顶层调用
  if (overrideValue) {
    return (
      <ThemeContext.Provider value={overrideValue}>
        <GlobalStyles theme={overrideValue.theme} />
        {children}
      </ThemeContext.Provider>
    );
    }
  
  // 合并基础主题和自定义主题变量
  const theme = {
    ...(isDarkMode ? darkTheme : lightTheme),
    ...customTheme
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, updateThemeVariable }}>
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