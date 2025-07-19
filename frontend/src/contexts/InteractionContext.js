import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';

// 交互状态枚举
export const INTERACTION_STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING', 
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  CONFIRMING: 'CONFIRMING',
  ERROR: 'ERROR'
};

// 动作类型
export const INTERACTION_ACTIONS = {
  SET_STATE: 'SET_STATE',
  SET_TRANSCRIPT: 'SET_TRANSCRIPT',
  SET_RESPONSE: 'SET_RESPONSE',
  SET_PENDING_ACTION: 'SET_PENDING_ACTION',
  SET_RESULT_DATA: 'SET_RESULT_DATA',
  SET_ERROR: 'SET_ERROR',
  OPEN_CONFIRM_MODAL: 'OPEN_CONFIRM_MODAL',
  CLOSE_CONFIRM_MODAL: 'CLOSE_CONFIRM_MODAL',
  RESET: 'RESET'
};

// 会话存储键
const SESSION_STORAGE_KEY = 'ai_assistant_session';
const SESSION_HISTORY_KEY = 'ai_assistant_session_history';

// 从本地存储恢复会话状态
function loadSessionFromStorage() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 只恢复安全的状态，不恢复临时状态
      return {
        sessionId: parsed.sessionId,
        lastTranscript: parsed.lastTranscript || '',
        lastResponse: parsed.lastResponse || null,
        // 重置临时状态
        currentState: INTERACTION_STATES.IDLE,
        pendingAction: null,
        resultData: null,
        isConfirmModalOpen: false,
        confirmText: '',
        error: null
      };
    }
  } catch (error) {
    console.warn('Failed to load session from storage:', error);
  }
  return null;
}

// 保存会话状态到本地存储
function saveSessionToStorage(state) {
  try {
    const toSave = {
      sessionId: state.sessionId,
      lastTranscript: state.lastTranscript,
      lastResponse: state.lastResponse,
      timestamp: Date.now()
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn('Failed to save session to storage:', error);
  }
}

// 保存会话历史
function saveSessionHistory(sessionId, transcript, response) {
  try {
    const history = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
    history.push({
      sessionId,
      transcript,
      response,
      timestamp: Date.now()
    });
    
    // 只保留最近50条记录
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save session history:', error);
  }
}

// 初始状态
const initialState = {
  currentState: INTERACTION_STATES.IDLE,
  lastTranscript: '',
  lastResponse: null,
  pendingAction: null,
  resultData: null,
  isConfirmModalOpen: false,
  confirmText: '',
  error: null,
  sessionId: null
};

// 状态转换规则
const stateTransitions = {
  [INTERACTION_STATES.IDLE]: [INTERACTION_STATES.LISTENING, INTERACTION_STATES.ERROR],
  [INTERACTION_STATES.LISTENING]: [INTERACTION_STATES.THINKING, INTERACTION_STATES.IDLE, INTERACTION_STATES.ERROR],
  [INTERACTION_STATES.THINKING]: [INTERACTION_STATES.SPEAKING, INTERACTION_STATES.CONFIRMING, INTERACTION_STATES.IDLE, INTERACTION_STATES.ERROR],
  [INTERACTION_STATES.SPEAKING]: [INTERACTION_STATES.IDLE, INTERACTION_STATES.ERROR],
  [INTERACTION_STATES.CONFIRMING]: [INTERACTION_STATES.THINKING, INTERACTION_STATES.IDLE, INTERACTION_STATES.ERROR],
  [INTERACTION_STATES.ERROR]: [INTERACTION_STATES.IDLE]
};

// Reducer函数
function interactionReducer(state, action) {
  switch (action.type) {
    case INTERACTION_ACTIONS.SET_STATE:
      const newState = action.payload;
      const currentState = state.currentState;
      
      // 验证状态转换是否合法
      if (stateTransitions[currentState] && !stateTransitions[currentState].includes(newState)) {
        console.warn(`Invalid state transition from ${currentState} to ${newState}`);
        return state;
      }
      
      return {
        ...state,
        currentState: newState,
        error: newState === INTERACTION_STATES.ERROR ? state.error : null
      };
      
    case INTERACTION_ACTIONS.SET_TRANSCRIPT:
      return {
        ...state,
        lastTranscript: action.payload
      };
      
    case INTERACTION_ACTIONS.SET_RESPONSE:
      return {
        ...state,
        lastResponse: action.payload
      };
      
    case INTERACTION_ACTIONS.SET_PENDING_ACTION:
      return {
        ...state,
        pendingAction: action.payload
      };
      
    case INTERACTION_ACTIONS.SET_RESULT_DATA:
      return {
        ...state,
        resultData: action.payload
      };
      
    case INTERACTION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        currentState: INTERACTION_STATES.ERROR
      };
      
    case INTERACTION_ACTIONS.OPEN_CONFIRM_MODAL:
      return {
        ...state,
        isConfirmModalOpen: true,
        confirmText: action.payload || '',
        currentState: INTERACTION_STATES.CONFIRMING
      };
      
    case INTERACTION_ACTIONS.CLOSE_CONFIRM_MODAL:
      return {
        ...state,
        isConfirmModalOpen: false,
        confirmText: ''
      };
      
    case INTERACTION_ACTIONS.RESET:
      return {
        ...initialState,
        sessionId: Date.now().toString() // 创建新的sessionId
      };
      
    default:
      return state;
  }
}

// Context创建
const InteractionContext = createContext();

// Provider组件
export function InteractionProvider({ children }) {
  // 尝试从本地存储恢复会话状态
  const restoredState = loadSessionFromStorage();
  const [state, dispatch] = useReducer(interactionReducer, {
    ...initialState,
    ...restoredState,
    sessionId: restoredState?.sessionId || Date.now().toString()
  });
  
  // 监听状态变化并保存到本地存储
  useEffect(() => {
    saveSessionToStorage(state);
  }, [state.sessionId, state.lastTranscript, state.lastResponse]);
  
  // 保存会话历史
  useEffect(() => {
    if (state.lastTranscript && state.lastResponse && state.sessionId) {
      saveSessionHistory(state.sessionId, state.lastTranscript, state.lastResponse);
    }
  }, [state.lastTranscript, state.lastResponse, state.sessionId]);
  
  // 动作创建器
  const actions = {
    setState: (newState) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_STATE, payload: newState });
    },
    
    setTranscript: (transcript) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_TRANSCRIPT, payload: transcript });
    },
    
    setResponse: (response) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_RESPONSE, payload: response });
    },
    
    setPendingAction: (action) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_PENDING_ACTION, payload: action });
    },
    
    setResultData: (data) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_RESULT_DATA, payload: data });
    },
    
    setError: (error) => {
      dispatch({ type: INTERACTION_ACTIONS.SET_ERROR, payload: error });
    },
    
    openConfirmModal: (text) => {
      dispatch({ type: INTERACTION_ACTIONS.OPEN_CONFIRM_MODAL, payload: text });
    },
    
    closeConfirmModal: () => {
      dispatch({ type: INTERACTION_ACTIONS.CLOSE_CONFIRM_MODAL });
    },
    
    reset: () => {
      dispatch({ type: INTERACTION_ACTIONS.RESET });
    },
    
    // 新增会话管理方法
    createNewSession: () => {
      const newSessionId = Date.now().toString();
      dispatch({ type: INTERACTION_ACTIONS.RESET });
      dispatch({ type: INTERACTION_ACTIONS.SET_STATE, payload: INTERACTION_STATES.IDLE });
      // 更新sessionId会在reducer中处理
    },
    
    getSessionHistory: () => {
      try {
        return JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
      } catch (error) {
        console.warn('Failed to get session history:', error);
        return [];
      }
    },
    
    clearSessionHistory: () => {
      try {
        localStorage.removeItem(SESSION_HISTORY_KEY);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear session history:', error);
      }
    }
  };
  
  const value = {
    ...state,
    ...actions
  };
  
  return (
    <InteractionContext.Provider value={value}>
      {children}
    </InteractionContext.Provider>
  );
}

// Hook for using the context
export function useInteraction() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
}

export default InteractionContext;