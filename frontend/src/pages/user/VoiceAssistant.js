import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Row, Col, Space, Divider, Spin } from 'antd';
import { SoundOutlined, MenuOutlined } from '@ant-design/icons';
import VoiceRecorder from '../../components/VoiceRecorder';
import ProgressBar from '../../components/ProgressBar';
import ConfirmationModal from '../../components/ConfirmationModal';
import ResultDisplay from '../../components/ResultDisplay';
import { useSession, SessionStages } from '../../contexts/SessionContext';
import { useTheme } from '../../contexts/ThemeContext';

// 页面容器
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

// 标题
const Title = styled.h1`
  color: ${props => props.theme.text};
  text-align: center;
  margin-bottom: 30px;
`;

// 内容卡片
const ContentCard = styled(Card)`
  border-radius: 12px;
  background-color: ${props => props.theme.surface};
  box-shadow: 0 4px 12px ${props => props.theme.shadowColor};
  margin-bottom: 20px;
  
  .ant-card-body {
    padding: 24px;
  }
`;

// 语音助手页面组件
const VoiceAssistant = () => {
  const { theme } = useTheme();
  const { 
    sessionId, 
    stage, 
    currentData, 
    error, 
    interpret, 
    execute, 
    updateStage, 
    resetSession, 
    createNewSession 
  } = useSession();
  
  // 语音输入文本
  const [voiceText, setVoiceText] = useState('');
  
  // 确认对话框状态
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  
  // 结果状态
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [resultStatus, setResultStatus] = useState('success');
  const [resultMessage, setResultMessage] = useState('');

  // 监听session阶段变化
  useEffect(() => {
    if (stage === SessionStages.CONFIRMING && currentData) {
      setConfirmationText(currentData.confirmText || '您是否确认此操作？');
      setShowConfirmation(true);
    } else {
      setShowConfirmation(false);
    }
    
    if (stage === SessionStages.RESULT && currentData) {
      setResultData(currentData);
      setResultStatus(currentData.success ? 'success' : 'error');
      setResultMessage(
        currentData.message || 
        (currentData.success ? '操作已成功完成' : '操作失败，请重试')
      );
      setShowResult(true);
      } else {
      setShowResult(false);
    }
    
    if (stage === SessionStages.ERROR && error) {
      setResultData({ error });
      setResultStatus('error');
      setResultMessage(error);
      setShowResult(true);
    }
  }, [stage, currentData, error]);
        
  // 处理语音输入结果
  const handleVoiceResult = (text) => {
    setVoiceText(text);
    
    if (text && text.trim() !== '') {
      // 更新状态为正在解析
      updateStage(SessionStages.INTERPRETING);
        
      // 发送文本进行解析
      interpret(text);
        }
  };
  
  // 处理确认
  const handleConfirm = () => {
    // 更新状态为正在执行
    updateStage(SessionStages.EXECUTING);
    
    // 执行操作
    execute();
    
    // 关闭确认对话框
    setShowConfirmation(false);
  };

  // 处理重试
  const handleRetry = () => {
    // 重置会话状态
    resetSession();
    
    // 关闭确认对话框
    setShowConfirmation(false);
  };
  
  // 处理取消
  const handleCancel = () => {
    // 重置会话状态
    resetSession();
    
    // 关闭确认对话框
    setShowConfirmation(false);
  };

  // 处理继续操作
  const handleContinue = () => {
    // 创建新会话
    createNewSession();
    
    // 关闭结果显示
    setShowResult(false);
    setVoiceText('');
  };

  return (
    <PageContainer>
      <Title theme={theme}>智能语音AI-Agent平台</Title>
      
      <Row gutter={24}>
        <Col xs={24} md={16} lg={18}>
          <ContentCard 
            theme={theme}
            title={
              <Space>
                <SoundOutlined /> 语音助手
              </Space>
            }
          >
            <ProgressBar stage={stage} />
            
            <Divider />
            
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {stage === SessionStages.EXECUTING && (
                <div style={{ marginBottom: '20px' }}>
                  <Spin size="large" />
                  <p style={{ marginTop: '10px', color: theme.textSecondary }}>
                    正在处理您的请求...
                  </p>
                </div>
              )}
              
              {!showResult && (
                <VoiceRecorder 
                  onResult={handleVoiceResult} 
                  disabled={stage !== SessionStages.IDLE && stage !== SessionStages.LISTENING}
                  maxDuration={15}
                  autoStop={true}
                />
              )}
              
              {showResult && (
                <ResultDisplay 
                  data={resultData}
                  status={resultStatus}
                  message={resultMessage}
                  autoSpeak={true}
                  onAction={handleContinue}
                  actionText="继续"
                />
              )}
            </div>
          </ContentCard>
        </Col>
        
        <Col xs={24} md={8} lg={6}>
          <ContentCard 
            theme={theme}
            title={
              <Space>
                <MenuOutlined /> 可用工具
            </Space>
            }
          >
            <p style={{ color: theme.textSecondary }}>
              您可以通过语音使用以下工具：
            </p>
            
            <ul style={{ color: theme.text, paddingLeft: '20px' }}>
              <li>查询信息</li>
              <li>控制设备</li>
              <li>发送消息</li>
              <li>设置提醒</li>
              <li>播放音乐</li>
              <li>更多工具敬请期待...</li>
            </ul>
            
            <Divider />
            
            <p style={{ color: theme.textSecondary, fontSize: '13px' }}>
              示例：<br />
              "帮我查一下最近的天气情况"<br />
              "给张三发条消息说我晚点到"<br />
              "查询一下我的账户余额"
            </p>
          </ContentCard>
        </Col>
      </Row>
      
      {/* 确认对话框 */}
      <ConfirmationModal 
        isOpen={showConfirmation}
        confirmText={confirmationText}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onCancel={handleCancel}
        useVoiceConfirmation={true}
      />
    </PageContainer>
  );
};

export default VoiceAssistant; 