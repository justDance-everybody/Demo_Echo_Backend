/**
 * 全局状态管理入口
 * 使用 React Context + useReducer 实现轻量级状态管理
 */

import React, { createContext, useContext, useReducer } from 'react';
import { authReducer, initialAuthState } from './reducers/authReducer';
import { voiceReducer, initialVoiceState } from './reducers/voiceReducer';
import { toolsReducer, initialToolsState } from './reducers/toolsReducer';
import { chatReducer, initialChatState } from './reducers/chatReducer';
import { uiReducer, initialUiState } from './reducers/uiReducer';

// 合并所有初始状态
const initialState = {
  auth: initialAuthState,
  voice: initialVoiceState,
  tools: initialToolsState,
  chat: initialChatState,
  ui: initialUiState,
};

// 根reducer - 组合所有子reducer
const rootReducer = (state, action) => {
  return {
    auth: authReducer(state.auth, action),
    voice: voiceReducer(state.voice, action),
    tools: toolsReducer(state.tools, action),
    chat: chatReducer(state.chat, action),
    ui: uiReducer(state.ui, action),
  };
};

// 创建Context
const StoreContext = createContext();

// Store Provider组件
export const StoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(rootReducer, initialState);

  const value = {
    state,
    dispatch,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

// 自定义hook用于访问store
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

// 便捷的selector hooks
export const useAuth = () => {
  const { state } = useStore();
  return state.auth;
};

export const useVoice = () => {
  const { state } = useStore();
  return state.voice;
};

export const useTools = () => {
  const { state } = useStore();
  return state.tools;
};

export const useChat = () => {
  const { state } = useStore();
  return state.chat;
};

export const useUI = () => {
  const { state } = useStore();
  return state.ui;
};

// 导出action types
export * from './actions/authActions';
export * from './actions/voiceActions';
export * from './actions/toolsActions';
export * from './actions/chatActions';
export * from './actions/uiActions';