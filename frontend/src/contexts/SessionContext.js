import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../services/apiClient';

// 创建会话上下文
const SessionContext = createContext(null);

// 会话阶段
export const SessionStages = {
  IDLE: 'idle',
  LISTENING: 'listening',
  INTERPRETING: 'interpreting',
  CONFIRMING: 'confirming',
  EXECUTING: 'executing',
  RESULT: 'result',
  ERROR: 'error'
};

/**
 * 会话上下文提供者组件
 */
export const SessionProvider = ({ children }) => {
  // 会话ID
  const [sessionId, setSessionId] = useState(() => {
    // 尝试从本地存储恢复会话ID
    const savedSessionId = localStorage.getItem('sessionId');
    return savedSessionId || uuidv4();
  });
  
  // 用户ID，实际使用时可从认证服务获取
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('userId') || null;
  });
  
  // 会话阶段
  const [stage, setStage] = useState(SessionStages.IDLE);
  
  // 当前解析/执行的数据
  const [currentData, setCurrentData] = useState(null);
  
  // 错误信息
  const [error, setError] = useState(null);
  
  // 当会话ID变化时保存到本地存储
  useEffect(() => {
    localStorage.setItem('sessionId', sessionId);
  }, [sessionId]);
  
  // 当用户ID变化时保存到本地存储
  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
    } else {
      localStorage.removeItem('userId');
    }
  }, [userId]);
  
  /**
   * 创建新会话
   */
  const createNewSession = async () => {
    try {
      // 生成新的会话ID
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      setStage(SessionStages.IDLE);
      setCurrentData(null);
      setError(null);
      
      // 如果有用户ID，向服务器注册会话
      if (userId) {
        await apiClient.createSession(userId);
      }
      
      return newSessionId;
    } catch (err) {
      console.error('创建会话失败:', err);
      setError('创建会话失败，请重试');
      return null;
    }
  };
  
  /**
   * 发送用户语音文本进行意图解析
   * @param {string} text - 用户语音转文本
   */
  const interpret = async (text) => {
    try {
      setStage(SessionStages.INTERPRETING);
      setError(null);
      
      const response = await apiClient.interpret(text, sessionId, userId);
      
      setCurrentData(response);
      setStage(SessionStages.CONFIRMING);
      
      return response;
    } catch (err) {
      console.error('意图解析失败:', err);
      setError(err.message || '意图解析失败，请重试');
      setStage(SessionStages.ERROR);
      return null;
    }
  };
  
  /**
   * 执行已确认的操作
   */
  const execute = async () => {
    try {
      if (!currentData || !currentData.action) {
        throw new Error('没有可执行的操作');
      }
      
      setStage(SessionStages.EXECUTING);
      setError(null);
      
      const { action, params } = currentData;
      const response = await apiClient.execute(action, params, sessionId, userId);
      
      setCurrentData(response);
      setStage(SessionStages.RESULT);
      
      return response;
    } catch (err) {
      console.error('执行操作失败:', err);
      setError(err.message || '执行操作失败，请重试');
      setStage(SessionStages.ERROR);
      return null;
    }
  };
  
  /**
   * 设置会话阶段
   * @param {string} newStage - 新的会话阶段
   */
  const updateStage = (newStage) => {
    setStage(newStage);
  };
  
  /**
   * 重置会话状态
   */
  const resetSession = () => {
    setStage(SessionStages.IDLE);
    setCurrentData(null);
    setError(null);
  };
  
  // 提供的上下文值
  const contextValue = {
    sessionId,
    userId,
    stage,
    currentData,
    error,
    setUserId,
    createNewSession,
    interpret,
    execute,
    updateStage,
    resetSession
  };
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * 使用会话上下文的自定义hook
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
};

export default SessionContext; 