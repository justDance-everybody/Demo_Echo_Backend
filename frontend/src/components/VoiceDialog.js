import React, { useState, useContext, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { message, Spin } from 'antd';
import { AudioOutlined, AudioMutedOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import { ThemeContext } from '../theme/ThemeProvider';

// 对话框容器
const DialogOverlay = styled.div`
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
`;

const DialogContent = styled.div`
  background-color: ${props => props.theme.dialogBackground};
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 24px;
  box-shadow: 0 4px 20px ${props => props.theme.shadowColor};
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.secondaryTextColor};
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${props => props.theme.textColor};
  }
`;

const DialogTitle = styled.h2`
  color: ${props => props.theme.textColor};
  margin-bottom: 16px;
  font-size: 1.5rem;
  text-align: center;
`;

const DialogText = styled.div`
  color: ${props => props.theme.textColor};
  margin-bottom: 24px;
  min-height: 60px;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
`;

const RecordButton = styled.button`
  background-color: ${props => props.isRecording ? '#ff4d4f' : props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:disabled {
    background-color: ${props => props.theme.borderColor};
    cursor: not-allowed;
  }
`;

const VoiceDialog = ({ isOpen, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // 处理ESC键关闭对话框
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = handleRecordingStop;
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setResponseText('正在聆听，请说话...');
    } catch (error) {
      console.error('无法访问麦克风:', error);
      message.error('无法访问麦克风，请确保已授予麦克风访问权限');
    }
  };
  
  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // 停止所有音频轨道
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  // 处理录音结束
  const handleRecordingStop = async () => {
    setIsLoading(true);
    setResponseText('正在处理您的请求...');
    
    try {
      // 创建音频 Blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      
      // 创建 FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.wav');
      
      // 发送到后端
      const response = await axios.post('/api/test-service/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });
      
      // 处理响应
      if (response.status === 200) {
        // 获取服务器返回的文本响应（从headers中）
        const textResponse = response.headers['x-text-response'];
        setResponseText(textResponse || '已收到您的语音请求');
        
        // 播放返回的音频
        const audioBlob = response.data;
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
        
        // 清理URL对象
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('处理语音请求错误:', error);
      setResponseText('处理您的语音请求时发生错误，请重试');
      message.error('处理语音请求失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 点击录音按钮
  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <DialogOverlay onClick={onClose}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <CloseOutlined />
        </CloseButton>
        
        <DialogTitle>语音助手</DialogTitle>
        
        <DialogText>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '10px' }}>{responseText}</div>
            </div>
          ) : (
            responseText || '点击下方按钮开始语音对话'
          )}
        </DialogText>
        
        <RecordButton 
          onClick={handleRecordClick} 
          isRecording={isRecording}
          disabled={isLoading}
        >
          {isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
        </RecordButton>
      </DialogContent>
    </DialogOverlay>
  );
};

export default VoiceDialog; 