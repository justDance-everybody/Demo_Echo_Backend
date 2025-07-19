// 布局配置文件 - 统一管理布局样式

import { BREAKPOINTS } from '../config/uiConfig';

// 基础布局配置
export const LAYOUT_CONFIG = {
  // 容器配置
  container: {
    maxWidth: '1200px',
    padding: {
      mobile: '16px',
      tablet: '24px', 
      desktop: '32px'
    },
    margin: '0 auto'
  },
  
  // 网格系统配置
  grid: {
    columns: 12,
    gap: {
      mobile: '16px',
      tablet: '20px',
      desktop: '24px'
    }
  },
  
  // 页面布局配置
  page: {
    header: {
      height: '64px',
      padding: '0 24px',
      zIndex: 100
    },
    footer: {
      height: '80px',
      padding: 'var(--spacing-xl)',
      zIndex: 10
    },
    sidebar: {
      width: {
        collapsed: '80px',
        expanded: '280px'
      },
      zIndex: 50
    },
    content: {
      padding: {
        mobile: '16px',
        tablet: '24px',
        desktop: '32px'
      },
      maxWidth: '1000px'
    }
  }
};

// Flexbox 布局工具类
export const FLEX_LAYOUTS = {
  // 居中布局
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // 垂直居中
  centerVertical: {
    display: 'flex',
    alignItems: 'center'
  },
  
  // 水平居中
  centerHorizontal: {
    display: 'flex',
    justifyContent: 'center'
  },
  
  // 两端对齐
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  // 均匀分布
  spaceAround: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  
  // 垂直布局
  column: {
    display: 'flex',
    flexDirection: 'column'
  },
  
  // 垂直居中布局
  columnCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // 换行布局
  wrap: {
    display: 'flex',
    flexWrap: 'wrap'
  }
};

// 响应式布局工具
export const RESPONSIVE_LAYOUTS = {
  // 移动端优先的响应式容器
  responsiveContainer: {
    width: '100%',
    paddingLeft: '16px',
    paddingRight: '16px',
    marginLeft: 'auto',
    marginRight: 'auto',
    
    [`@media (min-width: ${BREAKPOINTS.tablet})`]: {
      paddingLeft: '24px',
      paddingRight: '24px',
      maxWidth: '1024px'
    },
    
    [`@media (min-width: ${BREAKPOINTS.desktop})`]: {
      paddingLeft: '32px',
      paddingRight: '32px',
      maxWidth: '1200px'
    }
  },
  
  // 响应式网格
  responsiveGrid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: '1fr',
    
    [`@media (min-width: ${BREAKPOINTS.tablet})`]: {
      gap: '20px',
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    
    [`@media (min-width: ${BREAKPOINTS.desktop})`]: {
      gap: '24px',
      gridTemplateColumns: 'repeat(3, 1fr)'
    }
  },
  
  // 响应式Flex布局
  responsiveFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    
    [`@media (min-width: ${BREAKPOINTS.tablet})`]: {
      flexDirection: 'row',
      gap: '20px'
    },
    
    [`@media (min-width: ${BREAKPOINTS.desktop})`]: {
      gap: '24px'
    }
  }
};

// 组件布局配置
export const COMPONENT_LAYOUTS = {
  // Flex布局（引用FLEX_LAYOUTS）
  flex: FLEX_LAYOUTS,
  
  // 卡片布局
  card: {
    padding: 'var(--spacing-xl)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)'
  },
  
  // 模态框布局
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    
    content: {
      position: 'relative',
      maxWidth: '90vw',
      maxHeight: '90vh',
      padding: 'var(--spacing-xl)',
      borderRadius: '12px',
      backgroundColor: 'var(--color-dialogBackground)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
    },
    
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-overlay)'
    }
  },
  
  // 表单布局
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    
    field: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: 'var(--spacing-xl)'
    }
  },
  
  // 消息布局
  message: {
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: 'var(--spacing-sm)',
    
    user: {
      marginLeft: 'auto',
      marginRight: 0,
      maxWidth: '80%',
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-buttonText)'
    },
    
    system: {
      marginLeft: 0,
      marginRight: 'auto',
      maxWidth: '80%',
      backgroundColor: 'var(--color-backgroundSecondary)',
      color: 'var(--color-text)'
    }
  },
  
  // 状态栏布局
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: 'var(--color-backgroundSecondary)',
    borderBottom: '1px solid var(--color-border)',
    minHeight: '56px'
  },
  
  // 工具栏布局
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  }
};

// 动画布局配置
export const ANIMATION_LAYOUTS = {
  // 淡入淡出
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  
  // 滑入滑出
  slideIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  
  // 缩放动画
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeInOut' }
  },
  
  // 从左滑入
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // 从右滑入
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

// 布局工具函数
export const layoutUtils = {
  // 获取响应式值
  getResponsiveValue: (values, breakpoint) => {
    if (typeof values === 'object' && values !== null) {
      return values[breakpoint] || values.mobile || values.default;
    }
    return values;
  },
  
  // 生成媒体查询
  mediaQuery: (breakpoint) => {
    return `@media (min-width: ${BREAKPOINTS[breakpoint]})`;
  },
  
  // 生成网格列
  gridColumns: (columns) => {
    return `repeat(${columns}, 1fr)`;
  },
  
  // 生成间距
  spacing: (value, unit = 'px') => {
    if (typeof value === 'number') {
      return `${value}${unit}`;
    }
    return value;
  }
};

// 导出所有布局配置
export const LAYOUTS = {
  config: LAYOUT_CONFIG,
  flex: FLEX_LAYOUTS,
  responsive: RESPONSIVE_LAYOUTS,
  components: COMPONENT_LAYOUTS,
  animations: ANIMATION_LAYOUTS,
  utils: layoutUtils
};

export default LAYOUTS;