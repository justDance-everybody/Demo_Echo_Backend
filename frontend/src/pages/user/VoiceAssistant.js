import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spin, message, Space, Row, Col, Typography, Select, Tabs, Radio } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ReloadOutlined, RobotOutlined, GlobalOutlined, ThunderboltOutlined, ApiOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';
import styled from 'styled-components';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 后端API地址
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 样式化组件
const ServerCard = styled(Card)`
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.3s;
  border: ${props => props.selected ? '2px solid #1890ff' : '1px solid #f0f0f0'};
  background: ${props => props.selected ? '#e6f7ff' : 'white'};
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
`;

const IconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.color || '#1890ff'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
  font-size: 18px;
`;

const VoiceButton = styled(Button)`
  width: 80px;
  height: 80px;
  font-size: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const ResponseCard = styled(Card)`
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
`;

const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [loadingServers, setLoadingServers] = useState(false);
  const [statusMessage, setStatusMessage] = useState('请选择一个服务并点击麦克风开始对话');

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // 初始化并获取MCP服务器列表
  useEffect(() => {
    fetchMcpServers();
    initializeSpeechRecognition();
  }, []);

  // 初始化语音识别
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;  // 修改为持续监听
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN'; // 设置语音识别为中文

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        console.log('语音识别结果:', transcript);  
        setVoiceText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        setError(`语音识别错误: ${event.error}`);
        message.error(`语音识别错误: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        console.log('语音识别结束');
        setIsRecording(false);
        
        // 只有当有文本且不在处理中时才发送请求
        if (voiceText && !isProcessing) {
          console.log('语音识别结束，处理文本:', voiceText);
          processVoiceText(voiceText);
        } else {
          console.log('语音识别结束，但没有捕获到文本或正在处理中');
        }
      };
    } else {
      setError('您的浏览器不支持语音识别功能');
      message.error('您的浏览器不支持语音识别功能');
    }
  };

  // 获取MCP服务器列表
  const fetchMcpServers = async () => {
    setLoadingServers(true);
    try {
      console.log('获取MCP服务器列表');
      const response = await axios.get(`${API_URL}/api/test-service/mcp-servers`);
      
      if (response.data && response.data.status === 'success' && response.data.servers) {
        setMcpServers(response.data.servers);
        console.log('获取到MCP服务器列表:', response.data.servers);
        
        // 如果有服务器且没有选中的服务器，选择第一个
        if (response.data.servers.length > 0 && !selectedServerId) {
          setSelectedServerId(response.data.servers[0].id);
        }
      } else {
        message.warning('未获取到可用的MCP服务器');
        setError('未获取到可用的MCP服务器列表');
      }
    } catch (err) {
      console.error('获取MCP服务器列表错误:', err);
      setError('获取MCP服务器列表失败');
      message.error('无法获取服务器列表');
      
      // 设置默认服务器用于测试
      setMcpServers([
        { id: 'playwright', name: '浏览器助手', description: '提供智能网页浏览功能' },
        { id: 'MiniMax', name: '智能对话', description: '提供自然语言对话功能' },
        { id: 'amap-maps', name: '地图服务', description: '提供地点查询和导航服务' },
        { id: 'web3-rpc', name: '区块链服务', description: '提供区块链交互功能' }
      ]);
    } finally {
      setLoadingServers(false);
    }
  };

  // 开始录音
  const startRecording = () => {
    if (!selectedServerId) {
      message.warning('请先选择一个服务');
      return;
    }
    
    setIsRecording(true);
    setVoiceText('');
    setResponse(null);
    setError(null);
    setStatusMessage('正在录音，请说话...');
    
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
    
    try {
      if (recognitionRef.current) {
        console.log('开始语音识别');
        recognitionRef.current.start();
        message.success('开始录音，请说话...');
      } else {
        throw new Error('语音识别未初始化');
      }
    } catch (err) {
      console.error('启动语音识别失败:', err);
      setIsRecording(false);
      setStatusMessage('语音识别启动失败，请重试');
      setError(`启动语音识别失败: ${err.message}`);
      message.error(`启动语音识别失败: ${err.message}`);
    }
  };

  // 停止录音
  const stopRecording = () => {
    try {
      if (recognitionRef.current) {
        console.log('停止语音识别');
        recognitionRef.current.stop();
        setStatusMessage('录音已停止，正在处理...');
        message.info('录音已停止，正在处理...');
      }
    } catch (err) {
      console.error('停止语音识别失败:', err);
      setIsRecording(false);
      setStatusMessage('语音识别停止失败，请重试');
      setError(`停止语音识别失败: ${err.message}`);
      message.error(`停止语音识别失败: ${err.message}`);
    }
  };

  // 处理语音文本
  const processVoiceText = async (text) => {
    if (!text.trim()) {
      console.log('文本为空，不处理');
      setStatusMessage('未检测到语音内容，请重试');
      return;
    }
    
    if (!selectedServerId) {
      message.warning('请先选择一个服务');
      setStatusMessage('请先选择一个服务');
      return;
    }

    setIsProcessing(true);
    setResponse(null); // 清空之前的响应
    setStatusMessage(`正在处理语音文本: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
    
    try {
      console.log('发送请求到:', `${API_URL}/api/test-service/voice`);
      console.log('请求数据:', { voiceText: text, mcpServerId: selectedServerId });
      
      const response = await axios.post(`${API_URL}/api/test-service/voice`, {
        voiceText: text,
        mcpServerId: selectedServerId,
        userId: 'user123',
        sessionId: `session-${Date.now()}`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('接收到响应:', response.data);

      if (response.data && response.data.status === 'success') {
        // 提取响应内容
        let responseData = {
          ...response.data,
          parsedContent: ''
        };
        
        // 提取文本内容
        if (response.data.textResponse) {
          responseData.parsedContent = response.data.textResponse;
        } else if (response.data.result) {
          // 尝试从result对象中提取文本内容
          if (typeof response.data.result === 'string') {
            responseData.parsedContent = response.data.result;
          } else if (response.data.result.textResponse) {
            responseData.parsedContent = response.data.result.textResponse;
          } else if (response.data.result.data && response.data.result.data.content) {
            responseData.parsedContent = response.data.result.data.content;
          } else {
            try {
              responseData.parsedContent = JSON.stringify(response.data.result, null, 2);
            } catch (e) {
              responseData.parsedContent = '收到响应，但无法解析内容';
            }
          }
        }
        
        // 提取音频URL
        if (!responseData.audioUrl) {
          if (response.data.result && response.data.result.data && response.data.result.data.audio_url) {
            responseData.audioUrl = response.data.result.data.audio_url;
          } else if (response.data.result && response.data.result.audioUrl) {
            responseData.audioUrl = response.data.result.audioUrl;
          } else if (response.data.result && typeof response.data.result === 'string') {
            // 尝试从字符串中匹配URL
            const urlMatch = response.data.result.match(/https?:\/\/[^\s"']+\.(?:mp3|wav|ogg|m4a)/i);
            if (urlMatch) {
              responseData.audioUrl = urlMatch[0];
            }
          }
        }
        
        console.log('解析后的响应:', responseData);
        setResponse(responseData);
        
        // 使用文本到语音转换进行响应播放
        if (responseData.parsedContent) {
          speakText(responseData.parsedContent);
        }
        
        // 如果有音频URL，播放音频
        if (responseData.audioUrl) {
          console.log('发现音频URL，尝试播放:', responseData.audioUrl);
          playAudio(responseData.audioUrl);
        }
      } else {
        setError(response.data?.message || '处理请求时出错');
        message.error(response.data?.message || '处理请求时出错');
      }
    } catch (err) {
      console.error('API调用错误:', err);
      let errorMsg = '无法连接到服务器';
      
      if (err.response) {
        errorMsg = `服务器错误: ${err.response.status} - ${err.response.data?.message || '未知错误'}`;
      } else if (err.request) {
        errorMsg = '请求超时，服务器未响应';
      } else {
        errorMsg = `请求错误: ${err.message}`;
      }
      
      setError(errorMsg);
      message.error(errorMsg);
      setStatusMessage('处理请求失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 使用浏览器TTS API进行语音合成
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      try {
        // 取消之前的语音播放
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        
        utterance.onstart = () => {
          setAudioPlaying(true);
        };
        
        utterance.onend = () => {
          setAudioPlaying(false);
        };
        
        utterance.onerror = (e) => {
          console.error('语音合成错误:', e);
          setAudioPlaying(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('语音合成失败:', error);
        message.error('浏览器不支持语音合成或发生错误');
      }
    } else {
      message.warning('浏览器不支持语音合成');
    }
  };

  // 播放音频
  const playAudio = (url) => {
    if (!url) {
      console.warn('尝试播放音频但没有提供URL');
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    console.log('尝试播放音频URL:', url);
    
    // 检查URL是否为有效格式
    if (!url.match(/^https?:\/\//)) {
      console.error('无效的音频URL格式:', url);
      message.warning('音频URL格式无效');
      return;
    }
    
    // 测试URL是否可用
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('音频URL有效，开始播放');
          
          audioRef.current = new Audio(url);
          audioRef.current.onplay = () => {
            setAudioPlaying(true);
            setStatusMessage('正在播放音频响应...');
          };
          
          audioRef.current.onended = () => {
            setAudioPlaying(false);
            setStatusMessage('音频播放完成');
          };
          
          audioRef.current.onerror = (e) => {
            console.error('音频播放错误:', e);
            message.error('无法播放语音响应');
            setAudioPlaying(false);
            setStatusMessage('音频播放失败，可查看文本响应');
          };
          
          audioRef.current.play().catch(err => {
            console.error('音频播放失败:', err);
            message.error('无法播放语音响应，可能是浏览器阻止了自动播放');
            setStatusMessage('自动播放被阻止，请尝试点击播放按钮');
          });
        } else {
          console.error('音频URL无效:', response.status);
          message.warning('语音合成服务返回的音频URL无效，但文本响应可用');
          setStatusMessage('音频无法访问，查看文本响应');
        }
      })
      .catch(err => {
        console.error('检查音频URL时出错:', err);
        message.warning('无法验证音频URL，可能是跨域限制或网络问题');
        setStatusMessage('音频URL检查失败，查看文本响应');
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
  
  // 选择MCP服务器
  const handleServerSelect = (serverId) => {
    setSelectedServerId(serverId);
    setResponse(null);
    setError(null);
    const server = mcpServers.find(s => s.id === serverId);
    setStatusMessage(`已选择服务: ${server?.name || serverId}`);
  };
  
  // 根据服务类型获取图标和颜色
  const getServerIconAndColor = (serverId) => {
    const services = {
      'playwright': {
        icon: <RobotOutlined />,
        color: '#1890ff',
        title: '浏览器助手',
        description: '智能网页浏览与交互服务'
      },
      'MiniMax': {
        icon: <ApiOutlined />,
        color: '#722ed1',
        title: '智能聊天',
        description: '基于大模型的智能对话'
      },
      'amap-maps': {
        icon: <GlobalOutlined />,
        color: '#52c41a',
        title: '地图服务',
        description: '提供地点查询与导航功能'
      },
      'web3-rpc': {
        icon: <ThunderboltOutlined />,
        color: '#fa8c16',
        title: '区块链服务',
        description: '区块链钱包交互与管理'
      }
    };

    return services[serverId] || {
      icon: <RobotOutlined />,
      color: '#f5222d',
      title: serverId,
      description: '通用AI服务'
    };
  };

  // 渲染服务器卡片
  const renderServerCards = () => {
    if (loadingServers) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p>加载服务列表中...</p>
        </div>
      );
    }
    
    if (mcpServers.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="secondary">暂无可用服务</Text>
        </div>
      );
    }
    
    return (
      <Row gutter={[16, 16]}>
        {mcpServers.map(server => {
          const { icon, color } = getServerIconAndColor(server.id);
          const isSelected = selectedServerId === server.id;
          
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={server.id}>
              <ServerCard
                selected={isSelected}
                onClick={() => handleServerSelect(server.id)}
                hoverable
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <IconContainer color={color}>
                    {icon}
                  </IconContainer>
                  <div>
                    <Text strong>{server.name}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>{server.description}</Text>
                    </div>
                  </div>
                </div>
              </ServerCard>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
        Echo智能助手
      </Title>
      
      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} md={20} lg={18} xl={16}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>选择AI服务</span>
                <Button 
                  type="text" 
                  icon={<SyncOutlined />} 
                  onClick={fetchMcpServers}
                  loading={loadingServers}
                  size="small"
                >
                  刷新
                </Button>
              </div>
            }
            bordered={true}
            style={{ marginBottom: '20px' }}
          >
            {renderServerCards()}
          </Card>
          
          <Card 
            title="语音对话"
            bordered={true}
            style={{ marginBottom: '20px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', margin: '10px 0' }}>
                <Text>{statusMessage}</Text>
              </div>
              
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <VoiceButton
                  type="primary"
                  icon={isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || !selectedServerId}
                />
                <Paragraph style={{ marginTop: '10px' }}>
                  {isRecording ? '点击停止录音' : '点击开始录音'}
                </Paragraph>
                {!selectedServerId && (
                  <Text type="warning">请先选择一个AI服务</Text>
                )}
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
            <ResponseCard 
              title="助手回答" 
              bordered={true}
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  type="primary"
                  ghost
                >
                  重新提问
                </Button>
              }
            >
              <div style={{ padding: '10px' }}>
                {response.parsedContent ? (
                  <Paragraph>{response.parsedContent}</Paragraph>
                ) : (
                  <>
                    {response.textResponse && (
                      <Paragraph>{response.textResponse}</Paragraph>
                    )}
                    
                    {response.result && (
                      <Paragraph>
                        {typeof response.result === 'string' 
                          ? response.result 
                          : response.result.data?.content || JSON.stringify(response.result, null, 2)}
                      </Paragraph>
                    )}
                  </>
                )}
                
                {response.audioUrl && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="secondary">语音回复:</Text>
                    </div>
                    <audio 
                      controls 
                      src={response.audioUrl}
                      style={{ width: '100%' }}
                      onError={(e) => {
                        console.error('音频元素加载错误:', e);
                        message.error('音频加载失败');
                      }}
                    />
                    {audioPlaying && (
                      <div style={{ textAlign: 'center', marginTop: '8px' }}>
                        <Spin size="small" />
                        <Text style={{ marginLeft: '8px' }}>正在播放...</Text>
                      </div>
                    )}
                  </div>
                )}
                
                {response.mapData && (
                  <div style={{ marginTop: '15px' }}>
                    <Title level={5}>地点信息:</Title>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                      {JSON.stringify(response.mapData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ResponseCard>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default VoiceAssistant; 