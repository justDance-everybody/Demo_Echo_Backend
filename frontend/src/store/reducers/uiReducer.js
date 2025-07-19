/**
 * UI状态管理
 */

// 初始状态
export const initialUiState = {
  theme: 'light',
  sidebarOpen: true,
  sidebarCollapsed: false,
  activePanel: 'voice', // voice, tools, chat, settings
  modals: {
    settings: false,
    toolConfig: false,
    confirmation: false,
    error: false,
  },
  notifications: [],
  loading: {
    global: false,
    components: {},
  },
  layout: {
    isMobile: false,
    screenSize: 'desktop', // mobile, tablet, desktop
    orientation: 'landscape',
  },
  preferences: {
    language: 'zh-CN',
    fontSize: 'medium',
    animations: true,
    soundEnabled: true,
  },
};

// Action Types
export const UI_ACTIONS = {
  SET_THEME: 'UI/SET_THEME',
  TOGGLE_SIDEBAR: 'UI/TOGGLE_SIDEBAR',
  SET_SIDEBAR_COLLAPSED: 'UI/SET_SIDEBAR_COLLAPSED',
  SET_ACTIVE_PANEL: 'UI/SET_ACTIVE_PANEL',
  OPEN_MODAL: 'UI/OPEN_MODAL',
  CLOSE_MODAL: 'UI/CLOSE_MODAL',
  CLOSE_ALL_MODALS: 'UI/CLOSE_ALL_MODALS',
  ADD_NOTIFICATION: 'UI/ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'UI/REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'UI/CLEAR_NOTIFICATIONS',
  SET_GLOBAL_LOADING: 'UI/SET_GLOBAL_LOADING',
  SET_COMPONENT_LOADING: 'UI/SET_COMPONENT_LOADING',
  UPDATE_LAYOUT: 'UI/UPDATE_LAYOUT',
  UPDATE_PREFERENCES: 'UI/UPDATE_PREFERENCES',
  RESET_UI_STATE: 'UI/RESET_UI_STATE',
};

// 生成通知ID
const generateNotificationId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Reducer
export const uiReducer = (state = initialUiState, action) => {
  switch (action.type) {
    case UI_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload.theme,
      };

    case UI_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };

    case UI_ACTIONS.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload.collapsed,
      };

    case UI_ACTIONS.SET_ACTIVE_PANEL:
      return {
        ...state,
        activePanel: action.payload.panel,
      };

    case UI_ACTIONS.OPEN_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modalName]: true,
        },
      };

    case UI_ACTIONS.CLOSE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modalName]: false,
        },
      };

    case UI_ACTIONS.CLOSE_ALL_MODALS:
      const closedModals = {};
      Object.keys(state.modals).forEach(key => {
        closedModals[key] = false;
      });
      return {
        ...state,
        modals: closedModals,
      };

    case UI_ACTIONS.ADD_NOTIFICATION:
      const notification = {
        id: generateNotificationId(),
        timestamp: new Date().toISOString(),
        ...action.payload.notification,
      };
      return {
        ...state,
        notifications: [notification, ...state.notifications],
      };

    case UI_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload.notificationId
        ),
      };

    case UI_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
      };

    case UI_ACTIONS.SET_GLOBAL_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          global: action.payload.loading,
        },
      };

    case UI_ACTIONS.SET_COMPONENT_LOADING:
      const { componentName, loading } = action.payload;
      return {
        ...state,
        loading: {
          ...state.loading,
          components: {
            ...state.loading.components,
            [componentName]: loading,
          },
        },
      };

    case UI_ACTIONS.UPDATE_LAYOUT:
      return {
        ...state,
        layout: {
          ...state.layout,
          ...action.payload.layout,
        },
      };

    case UI_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload.preferences,
        },
      };

    case UI_ACTIONS.RESET_UI_STATE:
      return {
        ...initialUiState,
        preferences: state.preferences, // 保留用户偏好设置
      };

    default:
      return state;
  }
};