// MainPage 样式配置文件
// 将样式相关的配置从业务逻辑中分离出来

import { UI_CONFIG } from '../../config/uiConfig';
import { ANIMATION_LAYOUTS } from '../../styles/layouts';
import { INTERACTION_STATES } from '../../config/constants';

export const MAIN_PAGE_STYLES = {
  // 动画配置 - 使用统一的动画配置
  animations: {
    pageTransition: ANIMATION_LAYOUTS.slideIn,
    resetButton: {
      initial: { scale: 0 },
      animate: { scale: 1 },
      exit: { scale: 0 },
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    messageTransition: ANIMATION_LAYOUTS.slideIn
  },
  
  // 布局配置 - 使用统一的布局配置
  layout: {
    mainContainer: {
      className: "main-page-container",
      role: "main",
      "aria-label": "语音助手主界面",
      padding: UI_CONFIG.spacing.large,
      maxWidth: "800px",
      margin: "0 auto"
    },
    contentWrapper: {
      className: "main-content-wrapper"
    },
    contentArea: {
      className: "content-area",
      minHeight: "400px",
      display: "flex",
      flexDirection: "column",
      gap: UI_CONFIG.spacing.large
    },
    messagesContainer: {
      className: "messages-container",
      padding: UI_CONFIG.spacing.medium,
      borderRadius: UI_CONFIG.borderRadius.medium,
      marginBottom: UI_CONFIG.spacing.small
    }
  },
  
  // 组件配置
  components: {
    statusBar: {
      className: "status-bar",
      showProgress: true,
      showTimer: true,
      position: "top"
    },
    voiceRecorder: {
      className: "voice-recorder",
      size: "large",
      showWaveform: true,
      autoStart: false
    },
    resetButton: {
      className: "reset-button",
      "aria-label": "重置对话状态"
    },
    confirmationModal: {
      className: "confirmation-modal",
      showAnimation: true,
      autoFocus: true,
      closeOnEscape: true
    },
    resultDisplay: {
      className: "result-display"
    }
  },
  
  // 状态相关的样式映射 - 使用统一的状态常量
  stateStyles: {
    [INTERACTION_STATES.IDLE]: {
      containerClass: "state-idle",
      statusText: "准备就绪",
      showResetButton: false
    },
    [INTERACTION_STATES.LISTENING]: {
      containerClass: "state-listening",
      statusText: "正在听取",
      showResetButton: false
    },
    [INTERACTION_STATES.THINKING]: {
      containerClass: "state-thinking",
      statusText: "思考中",
      showResetButton: true
    },
    [INTERACTION_STATES.SPEAKING]: {
      containerClass: "state-speaking",
      statusText: "正在播报",
      showResetButton: true
    },
    [INTERACTION_STATES.CONFIRMING]: {
      containerClass: "state-confirming",
      statusText: "等待确认",
      showResetButton: true
    },
    [INTERACTION_STATES.EXECUTING]: {
      containerClass: "state-executing",
      statusText: "执行中",
      showResetButton: true
    },
    [INTERACTION_STATES.COMPLETED]: {
      containerClass: "state-completed",
      statusText: "已完成",
      showResetButton: true
    },
    [INTERACTION_STATES.ERROR]: {
      containerClass: "state-error",
      statusText: "出现错误",
      showResetButton: true
    }
  },
  
  // 响应式断点
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1200px'
  },
  
  // 主题配置
  theme: {
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#212529'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      full: '50%'
    },
    shadows: {
      sm: '0 1px 3px rgba(0,0,0,0.12)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 25px rgba(0,0,0,0.15)'
    }
  }
};

// 样式工具函数
export const getStateStyle = (currentState) => {
  return MAIN_PAGE_STYLES.stateStyles[currentState] || MAIN_PAGE_STYLES.stateStyles[INTERACTION_STATES.IDLE];
};

export const shouldShowResetButton = (currentState) => {
  const stateStyle = getStateStyle(currentState);
  return stateStyle.showResetButton;
};

export const getContainerClassName = (currentState) => {
  const stateStyle = getStateStyle(currentState);
  return `${MAIN_PAGE_STYLES.layout.mainContainer.className} ${stateStyle.containerClass}`;
};

// 动画预设
export const getAnimationProps = (animationType) => {
  return MAIN_PAGE_STYLES.animations[animationType] || {};
};

// 组件属性生成器
export const getComponentProps = (componentName, additionalProps = {}) => {
  const baseProps = MAIN_PAGE_STYLES.components[componentName] || {};
  return { ...baseProps, ...additionalProps };
};