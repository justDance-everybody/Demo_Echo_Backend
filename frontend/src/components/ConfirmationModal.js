import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionCircleOutlined, CheckOutlined, CloseOutlined, UndoOutlined, AudioOutlined } from '@ant-design/icons';
import useVoice from '../hooks/useVoice';
import useIntent from '../hooks/useIntent';
import { useTheme } from '../contexts/ThemeContext';
import useTTS from '../hooks/useTTS';
import { useInteraction, INTERACTION_STATES } from '../contexts/InteractionContext';
import { UI_CONFIG } from '../config/uiConfig';
import { COMPONENT_LAYOUTS, ANIMATION_LAYOUTS } from '../styles/layouts';
import { TIMEOUTS, CONFIRM_KEYWORDS } from '../config/constants';

// 清理确认文本的函数
const cleanConfirmText = (text) => {
  if (!text) return '';
  
  try {
    // 如果是JSON字符串，尝试解析
    if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('[')) && (text.endsWith('}') || text.endsWith(']'))) {
      const parsed = JSON.parse(text);
      // 从解析的对象中提取有意义的文本
      return parsed.message || parsed.content || parsed.text || parsed.confirm_text || JSON.stringify(parsed, null, 2);
    }
    
    // 处理可能的编码问题
    let cleanedText = text.toString();
    
    // 移除可能的控制字符和不可见字符
    cleanedText = cleanedText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // 处理可能的Unicode编码问题
    try {
      cleanedText = decodeURIComponent(escape(cleanedText));
    } catch (e) {
      // 如果解码失败，使用原文本
      console.warn('文本解码失败，使用原文本:', e);
    }
    
    // 移除多余的空白字符
    cleanedText = cleanedText.trim().replace(/\s+/g, ' ');
    
    // 确保以句号结尾
    if (cleanedText && !cleanedText.match(/[.!?]$/)) {
      cleanedText += '。';
    }
    
    return cleanedText || '确认执行此操作吗？';
  } catch (error) {
    console.error('清理确认文本时出错:', error);
    return '确认执行此操作吗？';
  }
};

// 样式组件
const ModalOverlay = styled(motion.div)`
  ${COMPONENT_LAYOUTS.modal};
  ${COMPONENT_LAYOUTS.modal.overlay};
  backdrop-filter: blur(4px);
`;

const ModalContent = styled(motion.div)`
  ${COMPONENT_LAYOUTS.modal.content};
  max-width: 480px;
  width: 90%;
  text-align: center;
  border: 1px solid var(--color-border);
`;

const ModalIcon = styled.div`
  width: var(--button-size-lg);
  height: var(--button-size-lg);
  border-radius: var(--border-radius-full);
  background-color: var(--color-primary-alpha);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${UI_CONFIG.iconSizes.large};
  margin: 0 auto ${UI_CONFIG.spacing.medium};
`;

const ModalTitle = styled.h3`
  margin: 0 0 ${UI_CONFIG.spacing.medium} 0;
  color: var(--color-text);
  text-align: center;
  font-size: ${UI_CONFIG.typography.sizes.large};
  font-weight: ${UI_CONFIG.typography.weights.semibold};
`;

const ModalText = styled.p`
  margin: 0 0 ${UI_CONFIG.spacing.large} 0;
  color: var(--color-text);
  text-align: center;
  font-size: ${UI_CONFIG.typography.sizes.medium};
  line-height: ${UI_CONFIG.typography.lineHeights.relaxed};
  max-height: 200px;
  overflow-y: auto;
`;

const ButtonGroup = styled.div`
  ${COMPONENT_LAYOUTS.form.actions};
  justify-content: center;
  margin-top: ${UI_CONFIG.spacing.large};
  gap: ${UI_CONFIG.spacing.small};
`;

const Button = styled(motion.button)`
  padding: ${UI_CONFIG.spacing.small} ${UI_CONFIG.spacing.large};
  border: none;
  border-radius: ${UI_CONFIG.borderRadius.medium};
  font-size: ${UI_CONFIG.typography.sizes.small};
  font-weight: ${UI_CONFIG.typography.weights.medium};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: ${UI_CONFIG.transitions.fast};
  min-width: 80px;
  
  &:hover {
    transform: var(--transform-scale-hover);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: var(--transform-scale-active);
  }
  
  &:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled(Button)`
  background: var(--color-primary);
  color: var(--color-on-primary);
  
  &:hover:not(:disabled) {
    background: var(--color-primary-dark);
    transform: var(--transform-scale-hover);
  }
`;

const CancelButton = styled(Button)`
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  
  &:hover:not(:disabled) {
    background: var(--color-surface-secondary);
    transform: var(--transform-scale-hover);
  }
`;

const RetryButton = styled(Button)`
  background: var(--color-secondary);
  color: var(--color-on-secondary);
  
  &:hover:not(:disabled) {
    background: var(--color-secondary-dark);
    transform: var(--transform-scale-hover);
  }
`;

const ListeningStatus = styled(motion.div)`
  ${COMPONENT_LAYOUTS.flex.center};
  gap: ${UI_CONFIG.spacing.small};
  padding: ${UI_CONFIG.spacing.medium};
  background: var(--color-surface-secondary);
  border-radius: ${UI_CONFIG.borderRadius.large};
  margin: ${UI_CONFIG.spacing.medium} 0;
  border: 2px solid ${props => props.isListening ? 'var(--color-primary)' : 'var(--color-border)'};
  color: var(--color-primary);
  text-align: center;
  font-size: var(--font-size-sm);
  
  .listening-icon {
    width: var(--spacing-lg);
    height: var(--spacing-lg);
    border-radius: var(--border-radius-full);
    background: ${props => props.isListening ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
    animation: ${props => props.isListening ? 'pulse var(--transition-slow) infinite' : 'none'};
  }
  
  span {
    display: inline-block;
    width: var(--spacing-xs);
    height: var(--spacing-xs);
    border-radius: var(--border-radius-full);
    background-color: var(--color-primary);
    animation: pulse var(--transition-slow) infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
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
 * @param {boolean} props.isListening - 语音监听状态（从父组件传入）
 * @param {boolean} props.isTTSSpeaking - TTS播放状态（从父组件传入）
 * @param {Function} props.startSTTListening - 开始语音监听的函数（从父组件传入）
 * @param {Function} props.stopSTTListening - 停止语音监听的函数（从父组件传入）
 */
const ConfirmationModal = ({
  isOpen,
  confirmText,
  onConfirm,
  onRetry,
  onCancel,
  useVoiceConfirmation = true,
  voiceCoordinator // 直接接收语音协调器实例
}) => {
  const { theme } = useTheme();
  const { classifyIntent } = useIntent();
  
  // 使用传入的语音协调器，避免独立的语音hook冲突
  const isSTTListening = voiceCoordinator?.isSTTActive || false;
  const isTTSSpeaking = voiceCoordinator?.isTTSActive || false;
  const transcript = voiceCoordinator?.lastTranscript || '';
  const startListening = voiceCoordinator?.startListening;
  const stopListening = voiceCoordinator?.stopListening;
  const speak = voiceCoordinator?.speak;
  const cancelTTS = voiceCoordinator?.forceStopAll;
  
  const [isConfirmListening, setIsConfirmListening] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [ttsFinished, setTtsFinished] = useState(false);
  const { interactionState } = useInteraction();
  
  // 对话框打开时朗读确认文本
  useEffect(() => {
    
    if (isOpen && confirmText) {
      console.log("ConfirmationModal: 准备播放确认文本。isTTSSpeaking:", isTTSSpeaking);
      setTtsFinished(false);
      setShowButtons(false); // 初始不显示按钮
      
      // 使用函数版本设置状态，防止引用旧状态
      const timer = setTimeout(() => {
        console.log("ConfirmationModal: 开始播放确认文本...");
        // 添加回调函数，在TTS结束后设置状态
        voiceCoordinator.speak(confirmText, () => {
          console.log("ConfirmationModal: TTS播放完成，设置ttsFinished=true");
          setTtsFinished(true);
        });
      }, 300);
      
      return () => {
        clearTimeout(timer);
        cancelTTS();
      };
    }
    
    if (!isOpen) {
      console.log("ConfirmationModal: 对话框已关闭，取消TTS和语音识别");
      cancelTTS();
      setIsConfirmListening(false);
      setShowButtons(false);
      setTtsFinished(false);
      // 停止正在进行的语音识别
      if (isSTTListening) {
        stopListening();
      }
    }
    
  }, [isOpen, confirmText, isTTSSpeaking, cancelTTS, isSTTListening, speak, stopListening, useVoiceConfirmation, startListening, interactionState, handleStartVoiceListening, voiceCoordinator]);
  

  
  // 在TTS播放完成后处理后续逻辑
  useEffect(() => {
    if (ttsFinished) {
      console.log("ConfirmationModal: TTS播放完成，处理后续逻辑");
      
      if (useVoiceConfirmation && !isConfirmListening && !isTTSSpeaking) {
        console.log("ConfirmationModal: 语音确认模式，延迟启动语音识别");
        // 延迟启动语音识别，确保TTS完全停止
        const delayTimer = setTimeout(() => {
          handleStartVoiceListening();
        }, TIMEOUTS.TTS_TO_STT_DELAY);
        
        return () => clearTimeout(delayTimer);
      } else if (!useVoiceConfirmation && !showButtons) {
        console.log("ConfirmationModal: 非语音模式，直接显示按钮");
        setShowButtons(true);
      }
    }
  }, [ttsFinished, useVoiceConfirmation, isConfirmListening, isTTSSpeaking, handleStartVoiceListening, showButtons]);
  
  // 安全超时机制，确保即使TTS回调失败也会显示按钮
   useEffect(() => {
     if (isOpen && confirmText && !ttsFinished && !showButtons) {
       const safetyTimer = setTimeout(() => {
         console.log("ConfirmationModal: 安全定时器触发，强制显示按钮");
         setTtsFinished(true);
         setShowButtons(true);
       }, TIMEOUTS.TTS_TO_STT_DELAY * 2); // 使用更长的安全超时时间
       
       return () => clearTimeout(safetyTimer);
     }
   }, [isOpen, confirmText, ttsFinished, showButtons]);
  
  // 监听 STT 结果并进行意图分类
  useEffect(() => {
    // 当接收到语音识别结果时处理
    if (isConfirmListening && transcript && transcript.trim()) {
      console.log("ConfirmationModal: Received transcript for confirmation:", transcript);
      const intent = classifyIntent(transcript);
      console.log("ConfirmationModal: Classified intent:", intent);
      
      // 先停止监听
      stopListening().catch(e => console.warn("停止监听时出错:", e));
      setIsConfirmListening(false);
      
      // 根据意图执行相应操作
      switch (intent) {
        case 'CONFIRM':
          console.log("ConfirmationModal: 用户确认操作");
          onConfirm();
          break;
        case 'RETRY':
          console.log("ConfirmationModal: 用户选择重试");
          onRetry();
          break;
        case 'CANCEL':
          console.log("ConfirmationModal: 用户取消操作");
          onCancel();
          break;
        default:
          console.log("ConfirmationModal: 未识别的意图，显示按钮供用户选择");
          // 未识别意图时，显示按钮让用户手动选择
          setShowButtons(true);
          break;
      }
    }
  }, [isConfirmListening, transcript, classifyIntent, stopListening, onConfirm, onRetry, onCancel]);
  
  // 监听语音识别状态变化，确保在适当时机显示按钮
  useEffect(() => {
    // 如果TTS完成且不在语音识别中，且是语音确认模式，则显示操作按钮
    if (ttsFinished && !isConfirmListening && useVoiceConfirmation && !isTTSSpeaking && !showButtons) {
      console.log("ConfirmationModal: TTS完成且不在语音识别中，显示操作按钮");
      setShowButtons(true);
    }
  }, [ttsFinished, isConfirmListening, useVoiceConfirmation, isTTSSpeaking, showButtons]);
  
  // 监听语音识别错误，确保出错时显示按钮
  useEffect(() => {
    if (voiceCoordinator?.errorMessage && isConfirmListening) {
      console.log("ConfirmationModal: 语音识别出错，显示操作按钮");
      setIsConfirmListening(false);
      setShowButtons(true);
    }
  }, [voiceCoordinator?.errorMessage, isConfirmListening]);
  
  // 手动启动语音识别
  const handleStartVoiceListening = useCallback(async () => {
    console.log("ConfirmationModal: 用户手动点击启动语音识别");
    
    // 防止重复启动或检查交互状态
    if (isConfirmListening || interactionState === INTERACTION_STATES.TTS_SPEAKING) {
      console.log("ConfirmationModal: 已在监听中或TTS正在播放，忽略重复启动");
      return;
    }
    
    setIsConfirmListening(true);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const tryStartListening = async () => {
      try {
        // 确保先停止之前可能在进行的识别
        await stopListening();
        console.log("ConfirmationModal: 已停止之前的识别");
        
        // 短暂延迟后启动新的识别，防止冲突
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (interactionState !== INTERACTION_STATES.TTS_SPEAKING) {
          await startListening();
          console.log("ConfirmationModal: 语音识别已启动");
        } else {
          console.log("ConfirmationModal: TTS正在播放，无法启动STT");
          setIsConfirmListening(false);
          // 如果无法启动语音识别，显示按钮
          setShowButtons(true);
        }
      } catch (e) {
          console.warn(`ConfirmationModal: 第${retryCount + 1}次启动失败:`, e.message);
          
          // 只在特定错误时重试，避免TTS冲突时的无效重试
          if (retryCount < maxRetries && e.message.includes('timeout') && !e.message.includes('TTS')) {
            retryCount++;
            console.log(`ConfirmationModal: 将在2秒后重试 (${retryCount}/${maxRetries})`);
            setTimeout(tryStartListening, 2000);
          } else {
            if (e.message.includes('TTS is currently active')) {
              console.log("ConfirmationModal: TTS正在活跃，稍后会自动处理");
            } else {
              console.error("ConfirmationModal: 启动语音识别最终失败:", e);
            }
            setIsConfirmListening(false);
            // 语音识别失败时，显示按钮供用户手动操作
            setShowButtons(true);
          }
        }
    };
    
    await tryStartListening();
    
    // 使用配置的超时时间自动停止语音识别并显示按钮，避免无限等待
    const timeoutId = setTimeout(() => {
      if (isConfirmListening) {
        console.log("ConfirmationModal: 语音识别超时，显示操作按钮");
        stopListening().catch(e => console.warn("停止监听时出错:", e));
        setIsConfirmListening(false);
        setShowButtons(true); // 超时后显示按钮
      }
    }, TIMEOUTS.VOICE_CONFIRM);
    
    return () => clearTimeout(timeoutId);
  }, [isConfirmListening, stopListening, startListening, interactionState]);
  
  // 手动按钮处理函数
  const handleConfirm = useCallback(async () => {
    console.log("ConfirmationModal: 用户点击确认");
    try {
      cancelTTS();
      if (isConfirmListening) {
        await stopListening();
      }
      setIsConfirmListening(false);
      onConfirm();
    } catch (e) {
      console.error("ConfirmationModal: 处理确认时出错:", e);
      onConfirm(); // 即使出错也要执行确认
    }
  }, [cancelTTS, isConfirmListening, stopListening, onConfirm]);
  
  const handleRetry = useCallback(async () => {
    console.log("ConfirmationModal: 用户点击重试");
    try {
      cancelTTS();
      if (isConfirmListening) {
        await stopListening();
      }
      setIsConfirmListening(false);
      onRetry();
    } catch (e) {
      console.error("ConfirmationModal: 处理重试时出错:", e);
      onRetry(); // 即使出错也要执行重试
    }
  }, [cancelTTS, isConfirmListening, stopListening, onRetry]);
  
  const handleCancel = useCallback(async () => {
    console.log("ConfirmationModal: 用户点击取消");
    try {
      cancelTTS();
      if (isConfirmListening) {
        await stopListening();
      }
      setIsConfirmListening(false);
      onCancel();
    } catch (e) {
      console.error("ConfirmationModal: 处理取消时出错:", e);
      onCancel(); // 即使出错也要执行取消
    }
  }, [cancelTTS, isConfirmListening, stopListening, onCancel]);
  
  // 强制每次渲染时记录状态，便于调试
  console.log(`ConfirmationModal渲染: ttsFinished=${ttsFinished}, showButtons=${showButtons}, isConfirmListening=${isConfirmListening}`);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          theme={theme}
          className="confirmation-dialog"
          data-testid="confirmation-modal"
          {...ANIMATION_LAYOUTS.fadeIn}
        >
          <ModalContent
            theme={theme}
            data-testid="confirmation-modal-content"
            {...ANIMATION_LAYOUTS.scaleIn}
          >
        <ModalIcon theme={theme}>
          <QuestionCircleOutlined />
        </ModalIcon>
        <ModalTitle theme={theme}>确认操作</ModalTitle>
        <ModalText theme={theme} data-testid="confirm-text">
          {cleanConfirmText(confirmText)}
        </ModalText>
        
        {/* 交互状态指示器 */}
        <div style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--color-text-secondary)', 
          margin: 'var(--spacing-md) 0', 
          textAlign: 'center',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--color-border)'
        }}>
          {isTTSSpeaking ? (
            <span style={{ color: 'var(--color-info)' }}>🔊 正在播放确认信息...</span>
          ) : isConfirmListening ? (
            <span style={{ color: 'var(--color-success)' }}>🎤 正在聆听您的回答...</span>
          ) : showButtons ? (
            <span style={{ color: 'var(--color-text-secondary)' }}>💬 请选择您的操作</span>
          ) : (
            <span style={{ color: 'var(--color-warning)' }}>⏳ 准备中...</span>
          )}
        </div>
        
        {/* 语音输入按钮 */}
        {ttsFinished && !isSTTListening && !isConfirmListening && useVoiceConfirmation && interactionState !== INTERACTION_STATES.TTS_SPEAKING && (
          <motion.div
            {...ANIMATION_LAYOUTS.slideIn}
            style={{
              textAlign: 'center',
              margin: 'var(--spacing-lg) 0',
            }}
          >
            <Button
              as={motion.button}
              id="voice-input-button"
              onClick={handleStartVoiceListening}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: 'var(--color-on-secondary)',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-bold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: 'var(--shadow-md)',
                width: '80%',
              }}
            >
              <AudioOutlined style={{ marginRight: 'var(--spacing-xs)', fontSize: 'var(--font-size-lg)' }} /> 
              点击开始语音输入
            </Button>
          </motion.div>
        )}
        
        {isConfirmListening && (
          <ListeningStatus
            theme={theme}
            isListening={true}
            {...ANIMATION_LAYOUTS.slideIn}
          >
            <span></span> 正在聆听您的回答...
          </ListeningStatus>
        )}
        
        {transcript && !isConfirmListening && (
          <ModalText theme={theme} style={{ fontStyle: 'italic', marginTop: 'var(--spacing-md)' }}>
            识别结果: {transcript}
          </ModalText>
        )}
        
        {showButtons && (
          <ButtonGroup
            as={motion.div}
            {...ANIMATION_LAYOUTS.slideIn}
            transition={{ ...ANIMATION_LAYOUTS.slideIn.transition, delay: 0.1 }}
          >
            <ConfirmButton
              theme={theme}
              onClick={handleConfirm}
              data-testid="confirm-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isTTSSpeaking}
            >
              <CheckOutlined /> 确认
            </ConfirmButton>
            <RetryButton
              theme={theme}
              onClick={handleRetry}
              data-testid="retry-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isTTSSpeaking}
            >
              <UndoOutlined /> 重试
            </RetryButton>
            <CancelButton
              theme={theme}
              onClick={handleCancel}
              data-testid="cancel-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isTTSSpeaking}
            >
              <CloseOutlined /> 取消
            </CancelButton>
          </ButtonGroup>
        )}
        
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;