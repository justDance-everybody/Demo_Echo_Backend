import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { createPortal } from 'react-dom';

// 动画效果
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// 样式
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: ${props => props.width || '90%'};
  max-width: ${props => props.maxWidth || '500px'};
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.3s ease-out;
  position: relative;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 600px) {
    width: 95%;
    max-height: 85vh;
  }
`;

const ModalHeader = styled.div`
  padding: var(--spacing-4);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--surface-hover);
    color: var(--text);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ModalBody = styled.div`
  padding: var(--spacing-4);
  overflow-y: auto;
  color: var(--text);
`;

const ModalFooter = styled.div`
  padding: var(--spacing-4);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: ${props => props.align || 'flex-end'};
  gap: var(--spacing-3);
`;

// 按钮组件
const Button = styled.button`
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  ${props => props.variant === 'primary' && `
    background: var(--color-primary);
    color: white;
    
    &:hover {
      background: var(--color-primary-dark);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: var(--surface-variant);
    color: var(--text-secondary);
    
    &:hover {
      background: var(--surface-variant-hover);
    }
  `}
  
  ${props => props.variant === 'danger' && `
    background: var(--color-error);
    color: white;
    
    &:hover {
      background: var(--color-error-dark);
    }
  `}
`;

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Modal组件
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  footerAlign = 'flex-end',
  width,
  maxWidth,
  showCloseButton = true
}) => {
  // 处理ESC键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      // 恢复背景滚动
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  // 处理背景点击关闭
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return createPortal(
    <ModalOverlay onClick={handleBackdropClick}>
      <ModalContainer width={width} maxWidth={maxWidth}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {showCloseButton && (
            <CloseButton onClick={onClose}>
              <CloseIcon />
            </CloseButton>
          )}
        </ModalHeader>
        <ModalBody>
          {children}
        </ModalBody>
        {footer && (
          <ModalFooter align={footerAlign}>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

// 确认对话框
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '确认',
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary',
  children,
  width,
  maxWidth 
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      width={width}
      maxWidth={maxWidth}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
};

export { Button, ModalHeader, ModalBody, ModalFooter };
export default Modal; 