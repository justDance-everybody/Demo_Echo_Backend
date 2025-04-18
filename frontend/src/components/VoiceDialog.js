import React, { useState, useContext, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { message, Spin, Alert, Radio, Card, Space } from 'antd';
import { AudioOutlined, AudioMutedOutlined, CloseOutlined, ApiOutlined, SmileOutlined, BankOutlined, ThunderboltOutlined } from '@ant-design/icons';
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

const StatusAlert = styled(Alert)`
  margin-bottom: 16px;
`;

const MCPServerSelector = styled.div`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
`;

const MCPServerCard = styled(Card)`
  cursor: pointer;
  border: 2px solid ${props => props.selected ? props.theme.buttonBackground : 'transparent'};
  margin-bottom: 8px;
  
  &:hover {
    border-color: ${props => props.theme.buttonBackground};
    opacity: 0.9;
  }
`;

const VoiceDialog = ({ isOpen, onClose, initialService }) => {
  const { theme } = useContext(ThemeContext);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [mcpServers, setMcpServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(initialService);
  const [loadingServers, setLoadingServers] = useState(false);
  const [selectedMapServerId, setSelectedMapServerId] = useState('');
  const [selectedTtsServerId, setSelectedTtsServerId] = useState('');
  const recognitionRef = useRef(null);
  
  // 加载MCP服务器列表
  useEffect(() => {
    if (isOpen) {
      fetchMCPServers();
    }
  }, [isOpen]);
  
  // 获取MCP服务器列表
  const fetchMCPServers = async () => {
    try {
      setLoadingServers(true);
      setError(null);
      
      const response = await axios.get('/api/test-service/mcp-servers');
      
      if (response.data.servers) {
        setMcpServers(response.data.servers);
        
        // 如果有服务器且没有选中的服务器，选择第一个
        if (response.data.servers.length > 0 && !selectedServerId) {
          setSelectedServerId(response.data.servers[0].id);
        }
        
        // 自动选择地图服务和语音服务
        autoSelectServices(response.data.servers);
      } else {
        setError('获取MCP服务器列表失败');
      }
    } catch (error) {
      console.error('获取MCP服务器列表失败:', error);
      setError('无法连接到服务器，请重试');
    } finally {
      setLoadingServers(false);
    }
  };
  
  // 自动选择地图服务和语音服务
  const autoSelectServices = (servers) => {
    if (!servers || servers.length === 0) return;
    
    // 寻找地图服务
    const mapServer = servers.find(server => 
      server.id.includes('amap') || 
      (server.name && server.name.toLowerCase().includes('地图')) ||
      (server.description && server.description.toLowerCase().includes('地图'))
    );
    
    // 寻找语音服务
    const ttsServer = servers.find(server => 
      server.id.includes('minimax') || server.id.includes('MiniMax') || 
      (server.name && server.name.toLowerCase().includes('语音')) ||
      (server.description && server.description.toLowerCase().includes('语音'))
    );
    
    if (mapServer) {
      setSelectedMapServerId(mapServer.id);
    }
    
    if (ttsServer) {
      setSelectedTtsServerId(ttsServer.id);
    }
  };
  
  // 选择MCP服务器
  const handleSelectServer = (serverId) => {
    setSelectedServerId(serverId);
    
    // 根据服务类型更新对应的专用服务ID
    const selectedServer = mcpServers.find(server => server.id === serverId);
    
    if (selectedServer) {
      if (selectedServer.id.includes('amap') || 
          (selectedServer.name && selectedServer.name.toLowerCase().includes('地图')) ||
          (selectedServer.description && selectedServer.description.toLowerCase().includes('地图'))) {
        setSelectedMapServerId(serverId);
      }
      
      if (selectedServer.id.includes('minimax') || selectedServer.id.includes('MiniMax') ||
          (selectedServer.name && selectedServer.name.toLowerCase().includes('语音')) ||
          (selectedServer.description && selectedServer.description.toLowerCase().includes('语音'))) {
        setSelectedTtsServerId(serverId);
      }
    }
  };
  
  // 初始化语音识别
  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;  // 设置持续识别
      recognition.interimResults = true;  // 获取中间结果
      recognition.lang = 'zh-CN';  // 设置语言为中文
      
      // 语音识别开始事件
      recognition.onstart = () => {
        setIsRecording(true);
        setTranscriptText('');
        setResponseText('正在聆听，请说话...');
      };
      
      // 语音识别结果事件
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // 处理识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // 更新最终识别文本
        setTranscriptText(finalTranscript || interimTranscript);
        
        // 如果有最终结果
        if (finalTranscript && !isLoading) {
          console.log('最终识别结果:', finalTranscript);
        }
      };
      
      // 语音识别错误事件
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        if (event.error === 'not-allowed') {
          setError('无法访问麦克风，请确保已授予麦克风访问权限');
        } else {
          setError(`语音识别出错: ${event.error}`);
        }
        setIsRecording(false);
      };
      
      // 语音识别结束事件
      recognition.onend = () => {
        setIsRecording(false);
        console.log('语音识别已结束');
        
        // 如果有文本且不是在加载状态，则发送请求
        if (transcriptText && !isLoading) {
          handleVoiceInput(transcriptText);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setError('您的浏览器不支持语音识别功能');
    }
    
    // 组件卸载时清理
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('停止语音识别失败:', e);
        }
      }
    };
  }, []);
  
  // 处理语音输入请求
  const handleVoiceInput = async (text) => {
    if (!text) return;
    
    // 检查是否选择了MCP服务器
    if (!selectedServerId) {
      setError('请先选择一个MCP服务');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`发送请求: "${text}" 到服务器, 地图服务: ${selectedMapServerId}, 语音服务: ${selectedTtsServerId}`);
      
      // 显示详细的请求信息
      setResponseText(`正在处理: "${text}"，当前使用服务ID: ${selectedServerId}`);
      
      // 调用后端API，传递地图服务ID和语音服务ID
      const response = await axios.post('/api/test-service/voice', {
        voiceText: text,
        mapServerId: selectedMapServerId,
        ttsServerId: selectedTtsServerId
      });
      
      console.log('响应数据:', response.data);
      
      // 处理响应
      if (response.data) {
        let displayText = '';
        let audioUrl = null;
        
        // 提取文本和音频URL
        if (response.data.text) {
          displayText = response.data.text;
        } else if (response.data.textResponse) {
          displayText = response.data.textResponse;
        }
        
        // 提取音频URL
        if (response.data.audioUrl) {
          audioUrl = response.data.audioUrl;
        }
        
        setResponseText(displayText || '收到服务器响应，但无法解析内容');
        
        // 如果有音频URL则播放，否则使用浏览器合成
        if (audioUrl) {
          // 创建音频元素播放音频
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            setIsLoading(false);
          };
          audio.onerror = () => {
            setError('音频播放失败，请重试');
            setIsLoading(false);
          };
          audio.play().catch(error => {
            console.error('音频播放错误:', error);
            setError(`音频播放失败: ${error.message}`);
            setIsLoading(false);
            // 回退到浏览器语音合成
            speak(displayText);
          });
        } else {
          // 使用浏览器API进行语音合成
          speak(displayText);
        }
      } else {
        throw new Error('请求失败，服务器未返回有效响应');
      }
    } catch (error) {
      console.error('处理请求失败:', error);
      // 显示更详细的错误信息
      let errorMessage = `处理请求失败: ${error.message}`;
      
      // 检查错误对象是否包含响应数据
      if (error.response) {
        console.error('错误响应数据:', error.response.data);
        errorMessage += `\n状态码: ${error.response.status}`;
        
        if (error.response.data && error.response.data.message) {
          errorMessage += `\n${error.response.data.message}`;
        }
      } else if (error.request) {
        // 请求已发送但未收到响应
        errorMessage = '无法连接到服务器，请检查网络连接';
      }
      
      setError(errorMessage);
      setResponseText(''); // 清空响应文本
      setIsLoading(false);
    }
  };
  
  // 语音合成函数
  const speak = (text) => {
    // 检查浏览器是否支持语音合成
    if ('speechSynthesis' in window) {
      try {
        // 创建语音合成实例
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        
        // 播放结束事件
        utterance.onend = () => {
          setIsLoading(false);
        };
        
        // 播放错误事件
        utterance.onerror = (event) => {
          console.error('语音合成错误:', event);
          setError(`语音播放失败: ${event.error || '未知错误'}`);
          setIsLoading(false);
        };
        
        // 开始播放
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('语音合成尝试失败:', error);
        setError(`语音合成失败: ${error.message}`);
        setIsLoading(false);
      }
    } else {
      setError('您的浏览器不支持语音合成功能');
      setIsLoading(false);
    }
  };
  
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
  
  // 点击录音按钮
  const handleRecordClick = () => {
    if (isRecording) {
      // 停止录音
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('停止语音识别失败:', e);
        }
      }
    } else {
      // 开始录音
      setError(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('开始语音识别失败:', e);
          setError('启动语音识别失败，请重试');
        }
      }
    }
  };
  
  // 当初始服务变化时更新选择的服务
  useEffect(() => {
    if (initialService) {
      setSelectedServerId(initialService);
    }
  }, [initialService]);
  
  // 渲染服务器卡片的样式改进
  const renderServerCard = (server) => {
    const isSelected = selectedServerId === server.id;
    
    // 为不同服务设置不同图标
    const getServerIcon = (serverId) => {
      const icons = {
        'playwright': <SmileOutlined style={{ fontSize: '20px' }} />,
        'MiniMax': <ApiOutlined style={{ fontSize: '20px' }} />,
        'amap-maps': <BankOutlined style={{ fontSize: '20px' }} />,
        'web3-rpc': <ThunderboltOutlined style={{ fontSize: '20px' }} />
      };
      
      return icons[serverId] || <ApiOutlined style={{ fontSize: '20px' }} />;
    };
    
    return (
      <MCPServerCard
        key={server.id}
        size="small"
        selected={isSelected}
        onClick={() => handleSelectServer(server.id)}
        theme={theme}
      >
        <Space>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: isSelected ? theme.buttonBackground : '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSelected ? 'white' : '#666'
          }}>
            {getServerIcon(server.id)}
          </div>
          <div>
            <strong>{server.name}</strong>
            <div style={{ fontSize: '12px', color: 'gray' }}>{server.description}</div>
          </div>
        </Space>
      </MCPServerCard>
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <DialogOverlay theme={theme}>
      <DialogContent theme={theme}>
        <CloseButton theme={theme} onClick={onClose}>
          <CloseOutlined />
        </CloseButton>
        
        <DialogTitle theme={theme}>智能助手</DialogTitle>
        
        {error && (
          <StatusAlert
            type="error"
            message={error}
            closable
            onClose={() => setError(null)}
          />
        )}
        
        {/* MCP服务器选择区域 */}
        <MCPServerSelector>
          <h3 style={{ marginBottom: '12px' }}>选择AI服务:</h3>
          {loadingServers ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="small" />
              <p>加载服务列表...</p>
            </div>
          ) : mcpServers.length > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {mcpServers.map(server => renderServerCard(server))}
            </Space>
          ) : (
            <p>无可用服务</p>
          )}
        </MCPServerSelector>
        
        <DialogText theme={theme}>
          {isLoading ? (
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <p style={{ marginTop: 16 }}>{responseText || '正在处理...'}</p>
            </div>
          ) : isRecording ? (
            <>
              <p>您说的是：{transcriptText || '...'}</p>
              <p style={{ fontSize: '12px', color: theme.secondaryTextColor }}>
                继续说话或点击按钮结束录音
              </p>
            </>
          ) : (
            responseText || '点击下方按钮开始语音对话'
          )}
        </DialogText>
        
        <RecordButton
          theme={theme}
          isRecording={isRecording}
          onClick={handleRecordClick}
          disabled={isLoading || !selectedServerId}
        >
          {isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
        </RecordButton>
        
        {!isRecording && !isLoading && !responseText && (
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: theme.secondaryTextColor }}>
            点击麦克风图标开始语音对话
          </p>
        )}
      </DialogContent>
    </DialogOverlay>
  );
};

export default VoiceDialog; 