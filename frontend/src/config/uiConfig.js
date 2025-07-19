// UI配置文件 - 统一管理界面配置

// 动画配置
export const ANIMATIONS = {
  // 页面过渡动画
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  
  // 消息动画
  messageSlide: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  
  // 模态框动画
  modalFade: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeInOut' }
  },
  
  // 按钮动画
  buttonHover: {
    whileHover: { scale: 1.05, y: -2 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 }
  },
  
  // 状态指示器动画
  statusPulse: {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// 布局配置
export const LAYOUT = {
  // 容器配置
  container: {
    maxWidth: '1200px',
    padding: '20px',
    margin: '0 auto'
  },
  
  // 侧边栏配置
  sidebar: {
    width: '300px',
    minWidth: '250px',
    maxWidth: '350px'
  },
  
  // 主内容区配置
  content: {
    maxWidth: '800px',
    padding: '24px',
    gap: '20px'
  },
  
  // 间距配置
  spacing: {
    none: '0',
    xs: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px'
  },
  
  // 组件尺寸
  components: {
    button: {
      small: { width: '80px', height: '32px' },
      medium: { width: '120px', height: '40px' },
      large: { width: '160px', height: '48px' },
      sizes: {
        sm: '32px',
        md: '40px',
        lg: '60px',
        xl: '80px',
      },
    },
    modal: {
      small: { width: '400px', maxHeight: '300px' },
      medium: { width: '600px', maxHeight: '500px' },
      large: { width: '800px', maxHeight: '700px' },
    },
    input: {
      height: '40px',
      borderRadius: '6px',
    },
  },
  
  // 消息容器配置
  messages: {
    maxHeight: '60vh',
    padding: '16px',
    gap: '12px'
  },
  
  // 模态框配置
  modal: {
    maxWidth: '480px',
    padding: '24px',
    borderRadius: '12px'
  }
};

// 交互配置
export const INTERACTIONS = {
  // 语音配置
  voice: {
    language: 'zh-CN',
    activationDelay: 300,
    confirmationTimeout: 5000,
    errorTimeout: 3000,
    retryDelay: 1000,
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
  },
  // 语音确认超时时间
  voiceConfirmTimeout: 15000, // 15秒
  
  // TTS播放完成后等待时间
  ttsToSttDelay: 800, // 800毫秒
  
  // 错误消息显示时间
  errorDisplayTime: 5000, // 5秒
  
  // 自动重置时间
  autoResetTime: 30000, // 30秒
  
  // 语音识别重试次数
  voiceRetryCount: 3,
  
  // 语音识别重试间隔
  voiceRetryDelay: 2000 // 2秒
};

// 消息配置
export const MESSAGES = {
  // 确认提示
  confirmPrompts: {
    default: '确认执行此操作吗？',
    voiceTimeout: '抱歉，我没听清楚您的回答，请说确认、取消或重试。',
    voiceError: '抱歉，我没听清，请说确认或取消。',
    authRequired: '请先登录后再使用语音功能。',
    sessionError: '会话初始化失败，请刷新页面重试。'
  },
  
  // 状态提示
  statusMessages: {
    listening: '正在聆听您的指令...',
    thinking: '正在理解您的指令...',
    confirming: '请确认是否执行此操作',
    executing: '正在执行操作...',
    speaking: '正在播放回复...',
    error: '出现错误，请重试'
  },
  
  // 操作反馈
  actionFeedback: {
    confirmed: '操作已确认',
    cancelled: '操作已取消',
    retrying: '正在重试...',
    completed: '操作已完成',
    failed: '操作失败'
  }
};

// 响应式断点
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
  wide: '1600px'
};

// Z-index层级
export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  sticky: 20,
  modal: 1000,
  overlay: 1001,
  tooltip: 1002,
  notification: 1003
};

// CSS变量映射
export const CSS_VARIABLES = {
  // 按钮尺寸
  '--button-size-sm': '32px',
  '--button-size-md': '40px', 
  '--button-size-lg': '48px',
  
  // 组件高度
  '--component-height-sm': '32px',
  '--component-height-md': '40px',
  '--component-height-lg': '48px',
  
  // 边框圆角
  '--border-radius-xs': '2px',
  '--border-radius-sm': '4px',
  '--border-radius-md': '8px',
  '--border-radius-lg': '12px',
  '--border-radius-xl': '16px',
  '--border-radius-full': '50%',
  
  // 边框宽度
  '--border-width-thin': '1px',
  '--border-width-thick': '2px',
  
  // 变换效果
  '--transform-scale-hover': 'scale(1.05)',
  '--transform-scale-active': 'scale(0.95)',
  
  // 过渡动画
  '--transition-fast': '0.15s ease',
  '--transition-default': '0.3s ease',
  '--transition-slow': '0.5s ease',
  
  // 透明度
  '--opacity-disabled': '0.6',
  '--opacity-hover': '0.8',
  '--opacity-active': '0.9',
  
  // 图标尺寸
  '--icon-size-xs': '12px',
  '--icon-size-sm': '16px',
  '--icon-size-md': '20px',
  '--icon-size-lg': '24px',
  '--icon-size-xl': '32px',
  '--icon-size-xxl': '48px',

  // 按钮尺寸
  '--button-size-sm': '32px',
  '--button-size-md': '40px',
  '--button-size-lg': '48px',
  '--button-size-xl': '70px',

  // 页面布局
  '--header-height': '64px',
  '--status-bar-height': '40px',
  '--sidebar-width': '240px',
  '--sidebar-width-mobile': '300px',
  '--content-max-width': '800px',
  '--content-width': '1200px',

  // 输入框宽度
  '--input-width-sm': '80px',
  '--input-width-md': '180px',
  '--input-width-lg': '240px',

  // 录音按钮
  '--recorder-button-size': '70px',

  // 动画
  '--animation-duration-slow': '1.5s',
  '--pulse-ring-size': '15px',

  // 响应式断点
  '--breakpoint-mobile': '768px',
  '--breakpoint-tablet': '1024px',
  '--breakpoint-desktop': '1200px',

  // 间距扩展
  '--spacing-xxl': '60px',
  '--spacing-xxxl': '90px',
  
  // 对话框
  '--dialog-max-width': '500px',
  '--dialog-width-md': '400px',
  '--dialog-max-height': '400px',
  '--dialog-text-min-height': '60px',
  '--dialog-text-max-height': '200px',

  // 字重
  '--font-weight-light': '300',
  '--font-weight-normal': '400',
  '--font-weight-medium': '500',
  '--font-weight-semibold': '600',
  '--font-weight-bold': '700',

  // 字体大小
  '--font-size-xs': '12px',
  '--font-size-sm': '14px',
  '--font-size-base': '16px',
  '--font-size-lg': '18px',
  '--font-size-xl': '20px',
  '--font-size-xxl': '24px',

  // 行高
  '--line-height-tight': '1.25',
  '--line-height-normal': '1.5',
  '--line-height-relaxed': '1.6',

  // 层级
  '--z-index-dropdown': '10',
  '--z-index-overlay': '50',
  '--z-index-modal': '1000',

  // 变换效果
  '--transform-translate-hover': 'translateY(-2px)',
  '--transform-scale-hover': 'scale(1.05)',
  
  // 间距变量
  '--spacing-none': '0',
  '--spacing-xxs': '2px',
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-small': '8px',
  '--spacing-md': '12px',
  '--spacing-medium': '16px',
  '--spacing-lg': '16px',
  '--spacing-large': '24px',
  '--spacing-xl': '20px',
  '--spacing-xlarge': '32px',
  '--spacing-xxl': '24px',
  '--spacing-xxlarge': '48px',
  
  // 文本对齐
  '--text-align-left': 'left',
  '--text-align-center': 'center',
  '--text-align-right': 'right',
  '--text-align-justify': 'justify',
  
  // 颜色透明度变体
  '--color-primary-alpha': 'rgba(79, 209, 197, 0.1)',
  '--color-error-alpha': 'rgba(255, 82, 82, 0.1)',
  '--color-error-bg': 'rgba(220, 53, 69, 0.1)',
  '--color-warning-bg': 'rgba(255, 193, 7, 0.1)',
  '--color-success-bg': 'rgba(40, 167, 69, 0.1)',
  '--color-info-bg': 'rgba(23, 162, 184, 0.1)',
  
  // 错误相关颜色
  '--color-error': '#ff4d4f',
  '--color-error-background': '#fff1f0',
  '--color-on-primary': '#ffffff',
  
  // 状态指示器颜色
  '--color-success-background': '#d4edda',
  '--color-success-border': '#c3e6cb',
  '--color-primary-background': '#d1ecf1',
  '--color-primary-border': '#bee5eb',
  '--color-warning-background': '#fff3cd',
  '--color-warning-border': '#ffeaa7',
  '--color-info': '#17a2b8',
  '--color-info-background': '#d1ecf1',
  '--color-info-border': '#b8daff',
  '--color-orange': '#fd7e14',
  '--color-orange-background': '#ffeaa7',
  '--color-orange-border': '#ffd93d',
  '--color-error-border': '#f5c6cb',
  
  // 主题颜色变体
  '--color-primary-light': '#80c3ff',
  '--color-background-secondary': '#f0f0f0',
  '--color-background-light': '#f9f9f9',
  '--color-neutral': '#d9d9d9',
  
  // Z-index层级
  '--z-index-sticky': '50',
  '--z-index-modal': '100',
  '--z-index-tooltip': '200',
  
  // 动画持续时间
  '--animation-duration-fast': '0.15s',
  '--animation-duration-normal': '0.3s',
  '--animation-duration-slow': '1.5s',
  
  // 断点
  '--breakpoint-mobile': '768px',
  '--breakpoint-tablet': '1024px',
  '--breakpoint-desktop': '1200px'
};

// 组件默认属性
export const COMPONENT_DEFAULTS = {
  // 按钮默认属性
  button: {
    size: 'medium',
    variant: 'primary',
    disabled: false,
    loading: false
  },
  
  // 输入框默认属性
  input: {
    size: 'medium',
    variant: 'outlined',
    disabled: false,
    required: false
  },
  
  // 模态框默认属性
  modal: {
    closable: true,
    maskClosable: false,
    centered: true,
    destroyOnClose: true
  }
};

// 图标尺寸配置
export const ICON_SIZES = {
  xs: '12px',
  small: '16px',
  medium: '20px',
  large: '24px',
  xl: '32px',
  xxl: '48px'
};

// 字体排版配置
export const TYPOGRAPHY = {
  sizes: {
    xsmall: '12px',
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px',
    xxlarge: '24px'
  },
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.6'
  }
};

// 间距配置
export const SPACING = {
  none: '0',
  xsmall: '4px',
  small: '8px',
  medium: '16px',
  large: '24px',
  xlarge: '32px',
  xxlarge: '48px'
};

// 边框圆角配置
export const BORDER_RADIUS = {
  small: '4px',
  medium: '8px',
  large: '12px',
  full: '50%'
};

// 过渡动画配置
export const TRANSITIONS = {
  fast: '0.15s ease',
  medium: '0.3s ease',
  slow: '0.5s ease'
};

// 延迟配置
export const DELAYS = {
  voiceActivation: 300, // 语音激活延迟
  confirmation: 5000,   // 确认超时
  error: 3000,         // 错误显示时间
  retry: 1000,         // 重试延迟
  autoReset: 30000,    // 自动重置时间
  ttsToStt: 800        // TTS到STT延迟
};

// 导出统一配置对象
export const UI_CONFIG = {
  animations: ANIMATIONS,
  layout: LAYOUT,
  interactions: INTERACTIONS,
  messages: MESSAGES,
  breakpoints: BREAKPOINTS,
  zIndex: Z_INDEX,
  delays: DELAYS,
  componentDefaults: COMPONENT_DEFAULTS,
  cssVariables: CSS_VARIABLES,
  iconSizes: ICON_SIZES,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  transitions: TRANSITIONS
};

export default UI_CONFIG;