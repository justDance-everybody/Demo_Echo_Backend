import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spin, message, Space, Row, Col, Typography } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

// 后端API地址
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN'; // 设置语音识别为中文

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
          
        setVoiceText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        setError(`语音识别错误: ${event.error}`);
        message.error(`语音识别错误: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (voiceText) {
          processVoiceText(voiceText);
        }
      };
    } else {
      setError('您的浏览器不支持语音识别功能');
      message.error('您的浏览器不支持语音识别功能');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // 监听voiceText变化，当有内容时自动发送请求
  useEffect(() => {
    if (!isRecording && voiceText && !isProcessing) {
      processVoiceText(voiceText);
    }
  }, [isRecording, voiceText]);

  // 开始录音
  const startRecording = () => {
    setIsRecording(true);
    setVoiceText('');
    setResponse(null);
    setError(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // 处理语音文本
  const processVoiceText = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    
    try {
      console.log('发送请求到:', `${API_URL}/api/test-service/voice`);
      
      const response = await axios.post(`${API_URL}/api/test-service/voice`, {
        voiceText: text,
        userId: 'user123',
        sessionId: `session-${Date.now()}`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false // 跨域请求不发送凭证
      });

      console.log('接收到响应:', response);

      if (response.data && response.data.status === 'success') {
        setResponse(response.data);
        // 播放语音响应
        if (response.data.audioUrl) {
          playAudio(response.data.audioUrl);
        }
      } else {
        setError(response.data?.message || '处理请求时出错');
        message.error(response.data?.message || '处理请求时出错');
      }
    } catch (err) {
      console.error('API调用错误:', err);
      setError(err.response?.data?.message || err.message || '无法连接到服务器');
      message.error(err.response?.data?.message || err.message || '无法连接到服务器');
    } finally {
      setIsProcessing(false);
    }
  };

  // 播放音频
  const playAudio = (url) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    console.log('尝试播放音频URL:', url);
    
    // 测试URL是否可用
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('音频URL有效，开始播放');
          
          audioRef.current = new Audio(url);
          audioRef.current.onplay = () => setAudioPlaying(true);
          audioRef.current.onended = () => setAudioPlaying(false);
          audioRef.current.onerror = (e) => {
            console.error('音频播放错误:', e);
            message.error('无法播放语音响应');
            setAudioPlaying(false);
          };
          
          audioRef.current.play().catch(err => {
            console.error('音频播放失败:', err);
            message.error('无法播放语音响应，可能是浏览器阻止了自动播放');
          });
        } else {
          console.error('音频URL无效:', response.status);
          message.warning('语音合成服务返回的音频URL无效，但文本响应可用');
        }
      })
      .catch(err => {
        console.error('检查音频URL时出错:', err);
        message.warning('无法验证音频URL，可能是跨域限制或网络问题');
      });
  };

  // 重试
  const handleRetry = () => {
    setVoiceText('');
    setResponse(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '30px' }}>
        智能语音助手
      </Title>
      
      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} sm={20} md={16} lg={14} xl={12}>
          <Card 
            title="请说出您的问题" 
            bordered={true}
            style={{ marginBottom: '20px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <Button
                  type="primary"
                  shape="circle"
                  icon={isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
                  size="large"
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{ width: '80px', height: '80px', fontSize: '24px' }}
                  disabled={isProcessing}
                />
                <Paragraph style={{ marginTop: '10px' }}>
                  {isRecording ? '点击停止录音' : '点击开始录音'}
                </Paragraph>
              </div>
              
              {voiceText && (
                <div style={{ margin: '10px 0' }}>
                  <Paragraph strong>您的问题:</Paragraph>
                  <Paragraph>{voiceText}</Paragraph>
                </div>
              )}
              
              {isProcessing && (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <Spin tip="正在处理..." />
                </div>
              )}
              
              {error && (
                <div style={{ margin: '10px 0' }}>
                  <Text type="danger">错误: {error}</Text>
                </div>
              )}
            </Space>
          </Card>
          
          {response && (
            <Card 
              title="助手回答" 
              bordered={true}
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  type="text"
                >
                  重新提问
                </Button>
              }
            >
              <Paragraph>{response.textResponse}</Paragraph>
              
              {response.audioUrl && (
                <div style={{ marginTop: '15px' }}>
                  <Button 
                    type="primary"
                    onClick={() => playAudio(response.audioUrl)}
                    icon={<AudioOutlined />}
                    loading={audioPlaying}
                  >
                    {audioPlaying ? '正在播放...' : '播放语音回答'}
                  </Button>
                </div>
              )}
              
              {response.mapData && response.mapData.pois && response.mapData.pois.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Paragraph strong>位置详情:</Paragraph>
                  <ul>
                    {response.mapData.pois.slice(0, 1).map((poi, index) => (
                      <li key={index}>
                        <div>名称: {poi.name}</div>
                        <div>地址: {poi.address}</div>
                        {poi.type && <div>类型: {poi.type}</div>}
                        {poi.tel && <div>电话: {poi.tel}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default VoiceAssistant; 