// 主题提供者组件 - 统一管理主题切换和CSS变量注入

import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, themeUtils } from '../styles/themes';
import { UI_CONFIG } from '../config/uiConfig';

// 创建主题上下文
const ThemeContext = createContext({
  currentTheme: 'light',
  theme: themes.light,
  toggleTheme: () => {},
  setTheme: () => {},
  isDarkMode: false
});

// 主题提供者组件
export const ThemeProvider = ({ children, defaultTheme = 'light' }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // 优先从localStorage读取用户偏好
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      return savedTheme;
    }
    
    // 其次检测系统主题偏好
    if (themeUtils.detectSystemTheme() === 'dark' && themes.dark) {
      return 'dark';
    }
    
    // 最后使用默认主题
    return defaultTheme;
  });

  const theme = themes[currentTheme] || themes.light;
  const isDarkMode = currentTheme === 'dark';

  // 切换主题
  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // 设置主题
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('theme', themeName);
    }
  };

  // 注入CSS变量到document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    const cssVariables = themeUtils.generateCSSVariables(theme);
    
    // 清除之前的主题变量
    Object.keys(themes.light.colors).forEach(key => {
      root.style.removeProperty(`--color-${key}`);
    });
    
    // 注入新的主题变量
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // 设置主题类名到body
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim() + ` theme-${currentTheme}`;
    
    console.log(`🎨 主题已切换到: ${currentTheme}`);
  }, [theme, currentTheme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // 只有在用户没有手动设置主题时才跟随系统
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const systemTheme = e.matches ? 'dark' : 'light';
        if (themes[systemTheme]) {
          setCurrentTheme(systemTheme);
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // 提供主题上下文值
  const contextValue = {
    currentTheme,
    theme,
    toggleTheme,
    setTheme,
    isDarkMode,
    // 主题工具函数
    utils: themeUtils
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 使用主题的Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// 主题切换按钮组件
export const ThemeToggleButton = ({ className = '', ...props }) => {
  const { toggleTheme, isDarkMode } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-button ${className}`}
      aria-label={`切换到${isDarkMode ? '亮色' : '暗色'}主题`}
      title={`切换到${isDarkMode ? '亮色' : '暗色'}主题`}
      style={{
        background: 'var(--color-backgroundSecondary)',
        border: '1px solid var(--color-border)',
        borderRadius: UI_CONFIG.borderRadius.medium,
        padding: UI_CONFIG.spacing.small,
        cursor: 'pointer',
        transition: UI_CONFIG.transitions.fast,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--component-height-md)',
    height: 'var(--component-height-md)'
      }}
      {...props}
    >
      {isDarkMode ? '🌙' : '☀️'}
    </button>
  );
};

// 主题选择器组件
export const ThemeSelector = ({ className = '', ...props }) => {
  const { currentTheme, setTheme } = useTheme();
  
  const availableThemes = Object.keys(themes);
  
  return (
    <select
      value={currentTheme}
      onChange={(e) => setTheme(e.target.value)}
      className={`theme-selector ${className}`}
      aria-label="选择主题"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: UI_CONFIG.borderRadius.small,
        padding: UI_CONFIG.spacing.small,
        color: 'var(--color-text)',
        cursor: 'pointer'
      }}
      {...props}
    >
      {availableThemes.map(themeName => (
        <option key={themeName} value={themeName}>
          {themeName === 'light' ? '亮色主题' : 
           themeName === 'dark' ? '暗色主题' : 
           themeName}
        </option>
      ))}
    </select>
  );
};

// 导出主题相关的所有内容
export { themes, themeUtils };
export default ThemeProvider;