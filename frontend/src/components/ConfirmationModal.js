import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { QuestionCircleOutlined, CheckOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons';
import useVoice from '../hooks/useVoice';
import useIntent from '../hooks/useIntent';
import { useTheme } from '../contexts/ThemeContext';

// 模态框容器
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.dialogOverlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// 模态框内容
const ModalContent = styled.div`
  background-color: ${props => props.theme.dialogBackground};
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  padding: 24px;
  box-shadow: 0 4px 20px ${props => props.theme.shadowColor};
  position: relative;
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

// 模态框图标
const ModalIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary}22;
  color: ${props => props.theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
`;

// 模态框标题
const ModalTitle = styled.h3`
  color: ${props => props.theme.text};
  text-align: center;
  margin-bottom: 16px;
  font-size: 18px;
`;

// 模态框文本
const ModalText = styled.div`
  color: ${props => props.theme.text};
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 16px;
`;

// 按钮容器
const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
`;

// 按钮
const Button = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px ${props => props.theme.shadowColor};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// 确认按钮
const ConfirmButton = styled(Button)`
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.buttonText};
  border: none;
`;

// 取消按钮
const CancelButton = styled(Button)`
  background-color: transparent;
  color: ${props => props.theme.textSecondary};
  border: 1px solid ${props => props.theme.border};
`;

// 重试按钮
const RetryButton = styled(Button)`
  background-color: ${props => props.theme.secondary};
  color: ${props => props.theme.buttonText};
  border: none;
`;

// 语音识别状态
const ListeningStatus = styled.div`
  color: ${props => props.theme.primary};
  text-align: center;
  font-size: 14px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.theme.primary};
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.8); opacity: 0.5; }
  }
`;

/**
 * 确认对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否显示对话框
 * @param {string} props.confirmText - 确认文本
 * @param {Function} props.onConfirm - 确认回调
 * @param {Function} props.onRetry - 重试回调
 * @param {Function} props.onCancel - 取消回调
 * @param {boolean} props.useVoiceConfirmation - 是否使用语音确认
 */
const ConfirmationModal = ({
  isOpen,
  confirmText,
  onConfirm,
  onRetry,
  onCancel,
  useVoiceConfirmation = true
}) => {
  const { theme } = useTheme();
  const { 
    isListening, 
    transcript, 
    isSpeaking,
    startListening, 
    stopListening,
    speak,
    stopSpeaking
  } = useVoice();
  const { classifyIntent } = useIntent();
  
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [showButtons, setShowButtons] = useState(!useVoiceConfirmation);
  
  // 对话框打开时朗读确认文本
  useEffect(() => {
    if (isOpen && confirmText && !isSpeaking) {
      // 添加小延迟确保对话框已渲染
      const timer = setTimeout(() => {
        speak(confirmText);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, confirmText, isSpeaking, speak]);
  
  // 语音播报结束后开始监听用户确认
  useEffect(() => {
    if (isOpen && useVoiceConfirmation && !isSpeaking && !isVoiceListening) {
      // 语音播报结束后，开始监听用户确认
      const timer = setTimeout(() => {
        setIsVoiceListening(true);
        startListening();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, useVoiceConfirmation, isSpeaking, isVoiceListening, startListening]);
  
  // 检测用户语音输入并分类意图
  useEffect(() => {
    if (isVoiceListening && !isListening && transcript) {
      // 用户已停止说话，分析意图
      const intent = classifyIntent(transcript);
      
      // 根据意图执行相应操作
      if (intent === 'CONFIRM') {
        handleConfirm();
      } else if (intent === 'RETRY') {
        handleRetry();
      } else if (intent === 'CANCEL') {
        handleCancel();
      } else {
        // 默认显示按钮让用户手动选择
        setShowButtons(true);
      }
      
      setIsVoiceListening(false);
    }
  }, [isVoiceListening, isListening, transcript]);
  
  // 处理确认
  const handleConfirm = () => {
    stopSpeaking();
    stopListening();
    if (onConfirm) onConfirm();
  };
  
  // 处理重试
  const handleRetry = () => {
    stopSpeaking();
    stopListening();
    if (onRetry) onRetry();
  };
  
  // 处理取消
  const handleCancel = () => {
    stopSpeaking();
    stopListening();
    if (onCancel) onCancel();
  };
  
  // 如果对话框未打开，不渲染任何内容
  if (!isOpen) return null;
  
  return (
    <ModalOverlay theme={theme}>
      <ModalContent theme={theme}>
        <ModalIcon theme={theme}>
          <QuestionCircleOutlined />
        </ModalIcon>
        
        <ModalTitle theme={theme}>确认您的请求</ModalTitle>
        
        <ModalText theme={theme}>
          {confirmText || '您是否确认此操作？'}
        </ModalText>
        
        {isVoiceListening && (
          <ListeningStatus theme={theme}>
            <span></span> 请说"确认"、"重试"或"取消"
          </ListeningStatus>
        )}
        
        {(showButtons || !useVoiceConfirmation) && (
          <ButtonGroup>
            <CancelButton theme={theme} onClick={handleCancel}>
              <CloseOutlined /> 取消
            </CancelButton>
            
            <RetryButton theme={theme} onClick={handleRetry}>
              <UndoOutlined /> 重试
            </RetryButton>
            
            <ConfirmButton theme={theme} onClick={handleConfirm}>
              <CheckOutlined /> 确认
            </ConfirmButton>
          </ButtonGroup>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ConfirmationModal; 