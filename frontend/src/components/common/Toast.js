import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { createPortal } from 'react-dom';

// 消息类型
export const ToastTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

// 动画效果
const slideIn = keyframes`
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-20px);
    opacity: 0;
  }
`;

// 样式
const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
`;

const ToastItem = styled.div`
  min-width: 280px;
  max-width: 80vw;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background-color: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: 12px;
  animation: ${props => props.exiting ? slideOut : slideIn} 0.3s ease-in-out;
  border-left: 4px solid ${props => {
    switch (props.type) {
      case ToastTypes.SUCCESS: 
        return 'var(--color-success)';
      case ToastTypes.ERROR: 
        return 'var(--color-error)';
      case ToastTypes.WARNING: 
        return 'var(--color-warning)';
      case ToastTypes.INFO:
      default: 
        return 'var(--color-info)';
    }
  }};
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: ${props => {
    switch (props.type) {
      case ToastTypes.SUCCESS: 
        return 'var(--color-success)';
      case ToastTypes.ERROR: 
        return 'var(--color-error)';
      case ToastTypes.WARNING: 
        return 'var(--color-warning)';
      case ToastTypes.INFO:
      default: 
        return 'var(--color-info)';
    }
  }};
`;

const MessageContent = styled.div`
  flex-grow: 1;
  font-size: var(--font-size-sm);
  line-height: 1.5;
`;

// 图标组件
const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

// 根据类型返回图标
const getIcon = (type) => {
  switch (type) {
    case ToastTypes.SUCCESS:
      return <SuccessIcon />;
    case ToastTypes.ERROR:
      return <ErrorIcon />;
    case ToastTypes.WARNING:
      return <WarningIcon />;
    case ToastTypes.INFO:
    default:
      return <InfoIcon />;
  }
};

// Toast组件实例
let toastInstance = null;

export const Toast = ({ messages, removeMessage }) => {
  return createPortal(
    <ToastContainer data-testid="toast-container">
      {messages.map((message) => (
        <ToastItem 
          key={message.id} 
          type={message.type} 
          exiting={message.exiting}
          data-testid={`toast-item-${message.id}`}
        >
          <IconContainer type={message.type} data-testid={`toast-icon-${message.type}`}>
            {getIcon(message.type)}
          </IconContainer>
          <MessageContent>{message.content}</MessageContent>
        </ToastItem>
      ))}
    </ToastContainer>,
    document.body
  );
};

// 创建Toast服务
export const ToastService = () => {
  const [messages, setMessages] = useState([]);

  // 标记消息为退出状态
  const markAsExiting = useCallback((id) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === id ? { ...msg, exiting: true } : msg
      )
    );
    
    // 动画结束后移除消息
    setTimeout(() => {
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== id)
      );
    }, 300); // 与动画持续时间匹配
  }, []);
  
  // 移除消息
  const removeMessage = useCallback((id) => {
    markAsExiting(id);
  }, [markAsExiting]);

  // 添加消息
  const addMessage = useCallback((content, type = ToastTypes.INFO, duration = 3000) => {
    const id = Date.now().toString();
    
    setMessages(prevMessages => [
      ...prevMessages,
      { id, content, type, exiting: false }
    ]);
    
    // 自动移除
    if (duration > 0) {
      setTimeout(() => removeMessage(id), duration);
    }
    
    return id;
  }, [removeMessage]);

  // 暴露API方法
  useEffect(() => {
    toastInstance = {
      show: (content, type, duration) => addMessage(content, type, duration),
      success: (content, duration) => addMessage(content, ToastTypes.SUCCESS, duration),
      error: (content, duration) => addMessage(content, ToastTypes.ERROR, duration),
      info: (content, duration) => addMessage(content, ToastTypes.INFO, duration),
      warning: (content, duration) => addMessage(content, ToastTypes.WARNING, duration),
      remove: (id) => removeMessage(id),
    };
    
    return () => {
      toastInstance = null;
    };
  }, [addMessage, removeMessage]);

  return <Toast messages={messages} removeMessage={removeMessage} />;
};

// 导出Toast API
export const toast = {
  show: (content, type, duration) => 
    toastInstance?.show(content, type, duration),
  success: (content, duration) => 
    toastInstance?.success(content, duration),
  error: (content, duration) => 
    toastInstance?.error(content, duration),
  info: (content, duration) => 
    toastInstance?.info(content, duration),
  warning: (content, duration) => 
    toastInstance?.warning(content, duration),
  remove: (id) => 
    toastInstance?.remove(id),
};

export default Toast; 