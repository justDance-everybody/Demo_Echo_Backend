/**
 * UI状态管理相关的Action Creators
 */

import { UI_ACTIONS } from '../reducers/uiReducer';

// 主题相关actions
export const setTheme = (theme) => ({
  type: UI_ACTIONS.SET_THEME,
  payload: { theme },
});

export const toggleTheme = () => (dispatch, getState) => {
  const currentTheme = getState().ui.theme;
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  dispatch(setTheme(newTheme));
  return newTheme;
};

// 侧边栏相关actions
export const toggleSidebar = () => ({
  type: UI_ACTIONS.TOGGLE_SIDEBAR,
});

export const setSidebarCollapsed = (collapsed) => ({
  type: UI_ACTIONS.SET_SIDEBAR_COLLAPSED,
  payload: { collapsed },
});

// 面板相关actions
export const setActivePanel = (panel) => ({
  type: UI_ACTIONS.SET_ACTIVE_PANEL,
  payload: { panel },
});

// 模态框相关actions
export const openModal = (modalName) => ({
  type: UI_ACTIONS.OPEN_MODAL,
  payload: { modalName },
});

export const closeModal = (modalName) => ({
  type: UI_ACTIONS.CLOSE_MODAL,
  payload: { modalName },
});

export const closeAllModals = () => ({
  type: UI_ACTIONS.CLOSE_ALL_MODALS,
});

// 通知相关actions
export const addNotification = (notification) => ({
  type: UI_ACTIONS.ADD_NOTIFICATION,
  payload: { notification },
});

export const removeNotification = (notificationId) => ({
  type: UI_ACTIONS.REMOVE_NOTIFICATION,
  payload: { notificationId },
});

export const clearNotifications = () => ({
  type: UI_ACTIONS.CLEAR_NOTIFICATIONS,
});

// 加载状态相关actions
export const setGlobalLoading = (loading) => ({
  type: UI_ACTIONS.SET_GLOBAL_LOADING,
  payload: { loading },
});

export const setComponentLoading = (componentName, loading) => ({
  type: UI_ACTIONS.SET_COMPONENT_LOADING,
  payload: { componentName, loading },
});

// 布局相关actions
export const updateLayout = (layout) => ({
  type: UI_ACTIONS.UPDATE_LAYOUT,
  payload: { layout },
});

// 偏好设置相关actions
export const updatePreferences = (preferences) => ({
  type: UI_ACTIONS.UPDATE_PREFERENCES,
  payload: { preferences },
});

export const resetUIState = () => ({
  type: UI_ACTIONS.RESET_UI_STATE,
});

// 便捷的通知创建函数
export const showSuccessNotification = (message, duration = 3000) => (dispatch) => {
  const notification = {
    type: 'success',
    message,
    duration,
    autoClose: true,
  };
  dispatch(addNotification(notification));
  
  // 自动移除通知
  if (duration > 0) {
    setTimeout(() => {
      dispatch(removeNotification(notification.id));
    }, duration);
  }
};

export const showErrorNotification = (message, duration = 5000) => (dispatch) => {
  const notification = {
    type: 'error',
    message,
    duration,
    autoClose: true,
  };
  dispatch(addNotification(notification));
  
  if (duration > 0) {
    setTimeout(() => {
      dispatch(removeNotification(notification.id));
    }, duration);
  }
};

export const showWarningNotification = (message, duration = 4000) => (dispatch) => {
  const notification = {
    type: 'warning',
    message,
    duration,
    autoClose: true,
  };
  dispatch(addNotification(notification));
  
  if (duration > 0) {
    setTimeout(() => {
      dispatch(removeNotification(notification.id));
    }, duration);
  }
};

export const showInfoNotification = (message, duration = 3000) => (dispatch) => {
  const notification = {
    type: 'info',
    message,
    duration,
    autoClose: true,
  };
  dispatch(addNotification(notification));
  
  if (duration > 0) {
    setTimeout(() => {
      dispatch(removeNotification(notification.id));
    }, duration);
  }
};

// 响应式布局检测
export const detectScreenSize = () => (dispatch) => {
  const width = window.innerWidth;
  let screenSize = 'desktop';
  let isMobile = false;
  
  if (width < 768) {
    screenSize = 'mobile';
    isMobile = true;
  } else if (width < 1024) {
    screenSize = 'tablet';
  }
  
  const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  
  dispatch(updateLayout({
    screenSize,
    isMobile,
    orientation,
  }));
  
  return { screenSize, isMobile, orientation };
};

// 初始化UI状态
export const initializeUI = () => (dispatch) => {
  // 检测屏幕尺寸
  dispatch(detectScreenSize());
  
  // 从本地存储加载偏好设置
  try {
    const savedPreferences = localStorage.getItem('ui-preferences');
    if (savedPreferences) {
      const preferences = JSON.parse(savedPreferences);
      dispatch(updatePreferences(preferences));
      
      // 应用主题
      if (preferences.theme) {
        dispatch(setTheme(preferences.theme));
      }
    }
  } catch (error) {
    console.warn('Failed to load UI preferences from localStorage:', error);
  }
  
  // 监听窗口大小变化
  const handleResize = () => dispatch(detectScreenSize());
  window.addEventListener('resize', handleResize);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};

// 保存偏好设置到本地存储
export const savePreferences = (preferences) => (dispatch, getState) => {
  dispatch(updatePreferences(preferences));
  
  try {
    const state = getState();
    localStorage.setItem('ui-preferences', JSON.stringify(state.ui.preferences));
  } catch (error) {
    console.warn('Failed to save UI preferences to localStorage:', error);
  }
};