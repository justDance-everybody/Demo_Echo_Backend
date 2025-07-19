// 主题配置文件 - 统一管理主题样式

// 基础颜色调色板
const COLORS = {
  // 主色调
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe', 
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },
  
  // 辅助色
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff', 
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87'
  },
  
  // 成功色
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  
  // 警告色
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  
  // 错误色
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  
  // 中性色
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// 亮色主题
export const lightTheme = {
  name: 'light',
  
  // 基础颜色
  colors: {
    primary: COLORS.primary[600],
    primaryHover: COLORS.primary[700],
    primaryActive: COLORS.primary[800],
    primaryLight: COLORS.primary[100],
    
    secondary: COLORS.secondary[600],
    secondaryHover: COLORS.secondary[700],
    secondaryActive: COLORS.secondary[800],
    secondaryLight: COLORS.secondary[100],
    
    success: COLORS.success[600],
    successHover: COLORS.success[700],
    successLight: COLORS.success[100],
    
    warning: COLORS.warning[600],
    warningHover: COLORS.warning[700],
    warningLight: COLORS.warning[100],
    
    error: COLORS.error[600],
    errorHover: COLORS.error[700],
    errorLight: COLORS.error[100],
    
    // 文本颜色
    text: COLORS.gray[900],
    textSecondary: COLORS.gray[600],
    textMuted: COLORS.gray[500],
    textInverse: '#ffffff',
    
    // 背景颜色
    background: '#ffffff',
    backgroundSecondary: COLORS.gray[50],
    backgroundMuted: COLORS.gray[100],
    
    // 表面颜色
    surface: '#ffffff',
    disabled: COLORS.gray[400],
    
    // 边框颜色
    border: COLORS.gray[200],
    borderHover: COLORS.gray[300],
    borderActive: COLORS.primary[600],
    
    // 阴影颜色
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowHover: 'rgba(0, 0, 0, 0.15)',
    
    // 覆盖层颜色
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // 按钮颜色
    buttonText: '#ffffff',
    buttonSecondaryText: COLORS.gray[700],
    
    // 对话框颜色
    dialogBackground: '#ffffff',
    dialogOverlay: 'rgba(0, 0, 0, 0.5)'
  },
  
  // 字体配置
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  
  // 字体大小
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem'     // 48px
  },
  
  // 字体粗细
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  
  // 行高
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  },
  
  // 间距
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem'      // 96px
  },
  
  // 圆角
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px'
  },
  
  // 阴影
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  
  // 过渡动画
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out'
  }
};

// 暗色主题
export const darkTheme = {
  ...lightTheme,
  name: 'dark',
  
  colors: {
    ...lightTheme.colors,
    
    primary: COLORS.primary[400],
    primaryHover: COLORS.primary[300],
    primaryActive: COLORS.primary[200],
    primaryLight: COLORS.primary[900],
    
    secondary: COLORS.secondary[400],
    secondaryHover: COLORS.secondary[300],
    secondaryActive: COLORS.secondary[200],
    secondaryLight: COLORS.secondary[900],
    
    success: COLORS.success[400],
    successHover: COLORS.success[300],
    successLight: COLORS.success[900],
    
    warning: COLORS.warning[400],
    warningHover: COLORS.warning[300],
    warningLight: COLORS.warning[900],
    
    error: COLORS.error[400],
    errorHover: COLORS.error[300],
    errorLight: COLORS.error[900],
    
    // 文本颜色
    text: COLORS.gray[100],
    textSecondary: COLORS.gray[300],
    textMuted: COLORS.gray[400],
    textInverse: COLORS.gray[900],
    
    // 背景颜色
    background: COLORS.gray[900],
    backgroundSecondary: COLORS.gray[800],
    backgroundMuted: COLORS.gray[700],
    
    // 表面颜色
    surface: COLORS.gray[800],
    disabled: COLORS.gray[600],
    
    // 边框颜色
    border: COLORS.gray[700],
    borderHover: COLORS.gray[600],
    borderActive: COLORS.primary[400],
    
    // 阴影颜色
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowHover: 'rgba(0, 0, 0, 0.4)',
    
    // 覆盖层颜色
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // 按钮颜色
    buttonText: COLORS.gray[900],
    buttonSecondaryText: COLORS.gray[200],
    
    // 对话框颜色
    dialogBackground: COLORS.gray[800],
    dialogOverlay: 'rgba(0, 0, 0, 0.7)'
  }
};

// 主题映射
export const themes = {
  light: lightTheme,
  dark: darkTheme
};

// 获取主题的工具函数
export const getTheme = (themeName = 'light') => {
  return themes[themeName] || themes.light;
};

// 主题切换工具函数
export const getOppositeTheme = (currentTheme) => {
  return currentTheme === 'light' ? 'dark' : 'light';
};

// 检测系统主题偏好
export const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 主题相关的CSS变量生成器
export const generateCSSVariables = (theme) => {
  const variables = {};
  
  // 颜色变量
  Object.entries(theme.colors).forEach(([key, value]) => {
    variables[`--color-${key}`] = value;
  });
  
  // StatusBar组件所需的语义化颜色
  variables['--color-info'] = COLORS.primary[500];
  variables['--color-on-primary'] = '#ffffff';
  variables['--color-on-secondary'] = '#ffffff';
  variables['--color-on-success'] = '#ffffff';
  variables['--color-on-warning'] = '#ffffff';
  variables['--color-on-error'] = '#ffffff';
  variables['--color-on-info'] = '#ffffff';
  
  // HomePage组件所需的额外颜色变量
  variables['--color-surface'] = theme.name === 'dark' ? '#1a1a1a' : '#ffffff';
  variables['--color-surface-dark'] = theme.name === 'dark' ? '#0f0f0f' : '#1f1f1f';
  variables['--color-surface-secondary'] = '#2A2A40';
  variables['--color-border-dark'] = theme.name === 'dark' ? '#404040' : '#303030';
  variables['--color-text-secondary-dark'] = theme.name === 'dark' ? '#888888' : '#aaaaaa';
  variables['--color-on-primary-secondary'] = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)';
  
  // 状态颜色
  variables['--color-info'] = '#4F90FF';
  variables['--color-warning'] = '#FF9900';
  
  // 阴影扩展
  variables['--shadow-primary'] = '0 4px 12px rgba(79, 209, 197, 0.3)';
  variables['--shadow-primary-hover'] = '0 6px 16px rgba(79, 209, 197, 0.4)';
  
  // 透明度颜色
  variables['--color-error-alpha-high'] = 'rgba(255, 82, 82, 0.7)';
  variables['--color-error-alpha-low'] = 'rgba(255, 82, 82, 0)';
  
  // 带透明度的颜色
  variables['--color-primary-alpha'] = theme.name === 'dark' ? 'rgba(79, 209, 197, 0.9)' : 'rgba(0, 123, 255, 0.9)';
  variables['--color-secondary-alpha'] = 'rgba(108, 117, 125, 0.9)';
  variables['--color-success-alpha'] = 'rgba(40, 167, 69, 0.9)';
  variables['--color-warning-alpha'] = 'rgba(255, 193, 7, 0.9)';
  variables['--color-error-alpha'] = 'rgba(220, 53, 69, 0.9)';
  variables['--color-info-alpha'] = theme.name === 'dark' ? 'rgba(79, 144, 255, 0.9)' : 'rgba(23, 162, 184, 0.9)';
  
  // 状态颜色的对比色
   variables['--color-on-success'] = '#FFFFFF';
   variables['--color-on-warning'] = '#212529';
   variables['--color-on-error'] = '#FFFFFF';
   variables['--color-on-info'] = '#FFFFFF';
   
   // 深色主题相关颜色
   variables['--color-background-dark'] = theme.name === 'dark' ? '#1f1f1f' : '#ffffff';
   variables['--color-text-dark'] = theme.name === 'dark' ? '#f5f5f5' : '#333333';
  
  // 字体大小变量
  Object.entries(theme.fontSizes).forEach(([key, value]) => {
    variables[`--font-size-${key}`] = value;
  });
  
  // 间距变量
  Object.entries(theme.spacing).forEach(([key, value]) => {
    variables[`--spacing-${key}`] = value;
  });
  
  // 圆角变量
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    variables[`--border-radius-${key}`] = value;
  });
  
  // 阴影变量
  Object.entries(theme.shadows).forEach(([key, value]) => {
    variables[`--shadow-${key}`] = value;
  });
  
  return variables;
};

export default themes;