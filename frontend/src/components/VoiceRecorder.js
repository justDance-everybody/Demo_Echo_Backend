import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AudioOutlined, AudioMutedOutlined, LoadingOutlined } from '@ant-design/icons';
import useVoice from '../hooks/useVoice';
import { useTheme } from '../contexts/ThemeContext';

// 录音按钮
const RecordButton = styled.button`
  background-color: ${props => props.isRecording ? '#FF4D4F' : props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px ${props => props.theme.shadowColor};
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px ${props => props.theme.shadowColor};
  }
  
  &:disabled {
    background-color: ${props => props.theme.borderColor};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// 录音波纹效果
const RecordRipple = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  opacity: 0.3;
  animation: ripple 1.5s linear infinite;
  z-index: -1;
  
  @keyframes ripple {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.3;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.8);
      opacity: 0;
    }
  }
`;

// 录音状态文本
const StatusText = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  text-align: center;
`;

// 转写文本显示
const TranscriptText = styled.div`
  margin-top: 16px;
  padding: 12px;
  background-color: ${props => props.theme.surface};
  border-radius: 8px;
  color: ${props => props.theme.text};
  min-height: 60px;
  max-height: 120px;
  overflow-y: auto;
  width: 100%;
  opacity: ${props => props.hasContent ? '1' : '0.5'};
  transition: opacity 0.3s ease;
`;

// 错误信息
const ErrorText = styled.div`
  margin-top: 12px;
  color: ${props => props.theme.error};
  font-size: 14px;
  text-align: center;
`;

/**
 * 语音录音组件
 * @param {Object} props - 组件属性
 * @param {Function} props.onResult - 录音结果回调
 * @param {boolean} props.disabled - 是否禁用
 * @param {number} props.maxDuration - 最大录音时长（秒）
 * @param {boolean} props.autoStop - 是否自动停止录音
 */
const VoiceRecorder = ({
  onResult,
  disabled = false,
  maxDuration = 10,
  autoStop = true,
}) => {
  const { theme } = useTheme();
  const { 
    isListening, 
    transcript, 
    error: voiceError, 
    startListening, 
    stopListening 
  } = useVoice();
  
  const [timeRemaining, setTimeRemaining] = useState(maxDuration);
  const [showRipple, setShowRipple] = useState(false);
  const [statusText, setStatusText] = useState('点击录音');
  const [error, setError] = useState(null);
  
  // 处理录音状态和计时
  useEffect(() => {
    let timerId;
    
    if (isListening) {
      setStatusText('正在聆听...');
      setShowRipple(true);
      setTimeRemaining(maxDuration);
      
      // 设置倒计时
      timerId = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 时间到自动停止
            if (autoStop) {
              stopListening();
              clearInterval(timerId);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setStatusText('点击录音');
      setShowRipple(false);
      clearInterval(timerId);
    }
    
    // 清理计时器
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isListening, maxDuration, autoStop, stopListening]);
  
  // 更新错误信息
  useEffect(() => {
    if (voiceError) {
      setError(`语音识别错误: ${voiceError}`);
    } else {
      setError(null);
    }
  }, [voiceError]);
  
  // 当录音停止且有转写文本时，触发结果回调
  useEffect(() => {
    if (!isListening && transcript && onResult) {
      onResult(transcript);
    }
  }, [isListening, transcript, onResult]);
  
  // 处理录音按钮点击
  const handleRecordClick = () => {
    if (disabled) return;
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
      setError(null);
    }
  };
  
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        {showRipple && <RecordRipple theme={theme} />}
        <RecordButton 
          isRecording={isListening} 
          theme={theme} 
          onClick={handleRecordClick}
          disabled={disabled}
          aria-label={isListening ? '停止录音' : '开始录音'}
        >
          {isListening ? <AudioOutlined /> : <AudioMutedOutlined />}
        </RecordButton>
      </div>
      
      <StatusText theme={theme}>
        {isListening 
          ? `${statusText} (${timeRemaining}s)` 
          : statusText
        }
      </StatusText>
      
      {error && <ErrorText theme={theme}>{error}</ErrorText>}
      
      <TranscriptText 
        theme={theme} 
        hasContent={!!transcript}
      >
        {transcript || '您的语音将显示在这里...'}
      </TranscriptText>
    </div>
  );
};

export default VoiceRecorder; 