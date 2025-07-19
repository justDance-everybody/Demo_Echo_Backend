/**
 * 对话管理相关的Action Creators
 */

import { CHAT_ACTIONS } from '../reducers/chatReducer';

// 会话管理actions
export const createSession = (sessionData = {}) => ({
  type: CHAT_ACTIONS.CREATE_SESSION,
  payload: sessionData,
});

export const deleteSession = (sessionId) => ({
  type: CHAT_ACTIONS.DELETE_SESSION,
  payload: { sessionId },
});

export const selectSession = (sessionId) => ({
  type: CHAT_ACTIONS.SELECT_SESSION,
  payload: { sessionId },
});

export const updateSession = (sessionId, updates) => ({
  type: CHAT_ACTIONS.UPDATE_SESSION,
  payload: { sessionId, updates },
});

// 消息管理actions
export const addMessage = (message, sessionId = null) => ({
  type: CHAT_ACTIONS.ADD_MESSAGE,
  payload: { message, sessionId },
});

export const updateMessage = (messageId, messageUpdates, sessionId = null) => ({
  type: CHAT_ACTIONS.UPDATE_MESSAGE,
  payload: { messageId, messageUpdates, sessionId },
});

export const deleteMessage = (messageId, sessionId = null) => ({
  type: CHAT_ACTIONS.DELETE_MESSAGE,
  payload: { messageId, sessionId },
});

export const clearMessages = (sessionId = null) => ({
  type: CHAT_ACTIONS.CLEAR_MESSAGES,
  payload: { sessionId },
});

// 状态管理actions
export const setTyping = (typing) => ({
  type: CHAT_ACTIONS.SET_TYPING,
  payload: { typing },
});

export const setChatLoading = (loading) => ({
  type: CHAT_ACTIONS.SET_LOADING,
  payload: { loading },
});

export const setChatError = (error) => ({
  type: CHAT_ACTIONS.SET_ERROR,
  payload: { error },
});

export const clearChatError = () => ({
  type: CHAT_ACTIONS.CLEAR_ERROR,
});

// 未读消息actions
export const updateUnreadCount = (count) => ({
  type: CHAT_ACTIONS.UPDATE_UNREAD_COUNT,
  payload: { count },
});

export const markAsRead = () => ({
  type: CHAT_ACTIONS.MARK_AS_READ,
});

// 设置actions
export const updateChatSettings = (settings) => ({
  type: CHAT_ACTIONS.UPDATE_SETTINGS,
  payload: { settings },
});

// 数据加载actions
export const loadSessions = (sessions) => ({
  type: CHAT_ACTIONS.LOAD_SESSIONS,
  payload: { sessions },
});

export const loadMessages = (sessionId, messages) => ({
  type: CHAT_ACTIONS.LOAD_MESSAGES,
  payload: { sessionId, messages },
});

// 复合actions（异步操作）
export const sendMessage = (content, type = 'user') => async (dispatch, getState, { chatService }) => {
  try {
    const state = getState();
    let sessionId = state.chat.currentSessionId;
    
    // 如果没有当前会话，创建一个新会话
    if (!sessionId) {
      const newSession = dispatch(createSession({ title: content.slice(0, 30) + '...' }));
      sessionId = state.chat.currentSessionId;
    }
    
    // 添加用户消息
    const userMessage = {
      content,
      type,
      sender: 'user',
      status: 'sent',
    };
    dispatch(addMessage(userMessage, sessionId));
    
    // 如果是用户消息，获取AI回复
    if (type === 'user') {
      dispatch(setTyping(true));
      
      try {
        const response = await chatService.sendMessage(content, sessionId);
        
        // 添加AI回复
        const aiMessage = {
          content: response.content,
          type: 'assistant',
          sender: 'assistant',
          status: 'received',
          metadata: response.metadata,
        };
        dispatch(addMessage(aiMessage, sessionId));
        
        return { success: true, response };
      } catch (error) {
        // 添加错误消息
        const errorMessage = {
          content: '抱歉，发生了错误，请稍后重试。',
          type: 'error',
          sender: 'system',
          status: 'error',
          error: error.message,
        };
        dispatch(addMessage(errorMessage, sessionId));
        dispatch(setChatError(error.message));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(setTyping(false));
      }
    }
    
    return { success: true };
  } catch (error) {
    dispatch(setChatError(error.message));
    dispatch(setTyping(false));
    return { success: false, error: error.message };
  }
};

export const loadChatHistory = () => async (dispatch, getState, { chatService }) => {
  try {
    dispatch(setChatLoading(true));
    const sessions = await chatService.getChatSessions();
    dispatch(loadSessions(sessions));
    return { success: true, sessions };
  } catch (error) {
    dispatch(setChatError(error.message));
    return { success: false, error: error.message };
  } finally {
    dispatch(setChatLoading(false));
  }
};

export const loadSessionMessages = (sessionId) => async (dispatch, getState, { chatService }) => {
  try {
    dispatch(setChatLoading(true));
    const messages = await chatService.getSessionMessages(sessionId);
    dispatch(loadMessages(sessionId, messages));
    return { success: true, messages };
  } catch (error) {
    dispatch(setChatError(error.message));
    return { success: false, error: error.message };
  } finally {
    dispatch(setChatLoading(false));
  }
};

export const saveSession = (sessionId) => async (dispatch, getState, { chatService }) => {
  try {
    const state = getState();
    const session = state.chat.sessions.find(s => s.id === sessionId);
    const messages = state.chat.messages[sessionId] || [];
    
    await chatService.saveSession(session, messages);
    return { success: true };
  } catch (error) {
    dispatch(setChatError(error.message));
    return { success: false, error: error.message };
  }
};

export const exportSession = (sessionId, format = 'json') => async (dispatch, getState, { chatService }) => {
  try {
    const state = getState();
    const session = state.chat.sessions.find(s => s.id === sessionId);
    const messages = state.chat.messages[sessionId] || [];
    
    const exportData = await chatService.exportSession(session, messages, format);
    return { success: true, data: exportData };
  } catch (error) {
    dispatch(setChatError(error.message));
    return { success: false, error: error.message };
  }
};

export const regenerateResponse = (messageId) => async (dispatch, getState, { chatService }) => {
  try {
    const state = getState();
    const sessionId = state.chat.currentSessionId;
    const messages = state.chat.messages[sessionId] || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('消息未找到');
    }
    
    // 获取消息之前的上下文
    const context = messages.slice(0, messageIndex);
    const lastUserMessage = context.filter(m => m.sender === 'user').pop();
    
    if (!lastUserMessage) {
      throw new Error('未找到用户消息');
    }
    
    dispatch(setTyping(true));
    
    // 重新生成回复
    const response = await chatService.regenerateResponse(lastUserMessage.content, context);
    
    // 更新消息
    const updatedMessage = {
      content: response.content,
      metadata: response.metadata,
      regenerated: true,
      regeneratedAt: new Date().toISOString(),
    };
    dispatch(updateMessage(messageId, updatedMessage, sessionId));
    
    return { success: true, response };
  } catch (error) {
    dispatch(setChatError(error.message));
    return { success: false, error: error.message };
  } finally {
    dispatch(setTyping(false));
  }
};