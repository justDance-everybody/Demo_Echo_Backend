/**
 * 对话管理状态管理
 */

// 初始状态
export const initialChatState = {
  sessions: [],
  currentSessionId: null,
  messages: {},
  loading: false,
  error: null,
  typing: false,
  lastMessageId: null,
  unreadCount: 0,
  settings: {
    autoSave: true,
    maxMessages: 1000,
    enableNotifications: true,
  },
};

// Action Types
export const CHAT_ACTIONS = {
  CREATE_SESSION: 'CHAT/CREATE_SESSION',
  DELETE_SESSION: 'CHAT/DELETE_SESSION',
  SELECT_SESSION: 'CHAT/SELECT_SESSION',
  UPDATE_SESSION: 'CHAT/UPDATE_SESSION',
  ADD_MESSAGE: 'CHAT/ADD_MESSAGE',
  UPDATE_MESSAGE: 'CHAT/UPDATE_MESSAGE',
  DELETE_MESSAGE: 'CHAT/DELETE_MESSAGE',
  CLEAR_MESSAGES: 'CHAT/CLEAR_MESSAGES',
  SET_TYPING: 'CHAT/SET_TYPING',
  SET_LOADING: 'CHAT/SET_LOADING',
  SET_ERROR: 'CHAT/SET_ERROR',
  CLEAR_ERROR: 'CHAT/CLEAR_ERROR',
  UPDATE_UNREAD_COUNT: 'CHAT/UPDATE_UNREAD_COUNT',
  MARK_AS_READ: 'CHAT/MARK_AS_READ',
  UPDATE_SETTINGS: 'CHAT/UPDATE_SETTINGS',
  LOAD_SESSIONS: 'CHAT/LOAD_SESSIONS',
  LOAD_MESSAGES: 'CHAT/LOAD_MESSAGES',
};

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Reducer
export const chatReducer = (state = initialChatState, action) => {
  switch (action.type) {
    case CHAT_ACTIONS.CREATE_SESSION:
      const newSession = {
        id: generateId(),
        title: action.payload.title || '新对话',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        ...action.payload,
      };
      return {
        ...state,
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession.id,
        messages: {
          ...state.messages,
          [newSession.id]: [],
        },
      };

    case CHAT_ACTIONS.DELETE_SESSION:
      const sessionIdToDelete = action.payload.sessionId;
      const updatedMessages = { ...state.messages };
      delete updatedMessages[sessionIdToDelete];
      
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== sessionIdToDelete),
        currentSessionId: state.currentSessionId === sessionIdToDelete ? null : state.currentSessionId,
        messages: updatedMessages,
      };

    case CHAT_ACTIONS.SELECT_SESSION:
      return {
        ...state,
        currentSessionId: action.payload.sessionId,
        unreadCount: 0,
      };

    case CHAT_ACTIONS.UPDATE_SESSION:
      const { sessionId, updates } = action.payload;
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === sessionId
            ? { ...session, ...updates, updatedAt: new Date().toISOString() }
            : session
        ),
      };

    case CHAT_ACTIONS.ADD_MESSAGE:
      const message = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...action.payload.message,
      };
      const targetSessionId = action.payload.sessionId || state.currentSessionId;
      
      if (!targetSessionId) return state;
      
      const currentMessages = state.messages[targetSessionId] || [];
      const updatedSessionMessages = [...currentMessages, message];
      
      // 限制消息数量
      const maxMessages = state.settings.maxMessages;
      const trimmedMessages = updatedSessionMessages.length > maxMessages
        ? updatedSessionMessages.slice(-maxMessages)
        : updatedSessionMessages;
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [targetSessionId]: trimmedMessages,
        },
        sessions: state.sessions.map(session =>
          session.id === targetSessionId
            ? {
                ...session,
                messageCount: trimmedMessages.length,
                updatedAt: new Date().toISOString(),
                lastMessage: message.content,
              }
            : session
        ),
        lastMessageId: message.id,
        unreadCount: targetSessionId !== state.currentSessionId ? state.unreadCount + 1 : 0,
      };

    case CHAT_ACTIONS.UPDATE_MESSAGE:
      const { messageId, messageUpdates } = action.payload;
      const sessionIdForUpdate = action.payload.sessionId || state.currentSessionId;
      
      if (!sessionIdForUpdate) return state;
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionIdForUpdate]: (state.messages[sessionIdForUpdate] || []).map(msg =>
            msg.id === messageId ? { ...msg, ...messageUpdates } : msg
          ),
        },
      };

    case CHAT_ACTIONS.DELETE_MESSAGE:
      const messageIdToDelete = action.payload.messageId;
      const sessionIdForDelete = action.payload.sessionId || state.currentSessionId;
      
      if (!sessionIdForDelete) return state;
      
      const filteredMessages = (state.messages[sessionIdForDelete] || []).filter(
        msg => msg.id !== messageIdToDelete
      );
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionIdForDelete]: filteredMessages,
        },
        sessions: state.sessions.map(session =>
          session.id === sessionIdForDelete
            ? { ...session, messageCount: filteredMessages.length }
            : session
        ),
      };

    case CHAT_ACTIONS.CLEAR_MESSAGES:
      const sessionIdToClear = action.payload.sessionId || state.currentSessionId;
      
      if (!sessionIdToClear) return state;
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionIdToClear]: [],
        },
        sessions: state.sessions.map(session =>
          session.id === sessionIdToClear
            ? { ...session, messageCount: 0, lastMessage: null }
            : session
        ),
      };

    case CHAT_ACTIONS.SET_TYPING:
      return {
        ...state,
        typing: action.payload.typing,
      };

    case CHAT_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
      };

    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        loading: false,
      };

    case CHAT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case CHAT_ACTIONS.UPDATE_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload.count,
      };

    case CHAT_ACTIONS.MARK_AS_READ:
      return {
        ...state,
        unreadCount: 0,
      };

    case CHAT_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload.settings,
        },
      };

    case CHAT_ACTIONS.LOAD_SESSIONS:
      return {
        ...state,
        sessions: action.payload.sessions,
        loading: false,
      };

    case CHAT_ACTIONS.LOAD_MESSAGES:
      const { sessionId: loadSessionId, messages: loadedMessages } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [loadSessionId]: loadedMessages,
        },
        loading: false,
      };

    default:
      return state;
  }
};