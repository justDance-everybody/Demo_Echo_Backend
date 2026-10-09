import React, { useState } from 'react';
import styled from 'styled-components';
import { Typography } from 'antd';
import Card from '../components/ui/card';
import Space from '../components/ui/space';
import Divider from '../components/ui/divider';
import Alert from '../components/ui/alert';
import Button from '../components/ui/button';
import { AudioOutlined, ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import VoiceInterface from '../components/VoiceInterface';

const { Title, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const TestCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 12px;
  background: ${props => props.theme.surface};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const FlowContainer = styled.div`
  background: ${props => props.theme.background};
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
`;

const InstructionsList = styled.ul`
  list-style: none;
  padding: 0;
  
  li {
    padding: 8px 0;
    border-bottom: 1px solid ${props => props.theme.border};
    
    &:last-child {
      border-bottom: none;
    }
    
    &::before {
      content: "→";
      color: ${props => props.theme.primary};
      margin-right: 8px;
      font-weight: bold;
    }
  }
`;

/**
 * 语音交互流程测试页面
 * 用于测试和演示完整的语音交互功能
 */
const VoiceFlowTestPage = () => {
  const { theme } = useTheme();
  const [testResults, setTestResults] = useState([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // 处理语音交互流程结果
  const handleFlowResult = (result) => {
    console.log('语音交互流程完成:', result);
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, {
      timestamp,
      type: 'success',
      message: '语音交互流程成功完成',
      data: result
    }]);
    setIsTestRunning(false);
  };

  // 处理语音交互流程错误
  const handleFlowError = (error) => {
    console.error('语音交互流程错误:', error);
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, {
      timestamp,
      type: 'error',
      message: `语音交互流程错误: ${error}`,
      data: null
    }]);
    setIsTestRunning(false);
  };

  // 开始测试
  const startTest = () => {
    setIsTestRunning(true);
    setTestResults([]);
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
  };

  const testInstructions = [
    "点击下方的开始测试按钮启动语音交互流程",
    "当看到'正在聆听您的指令...'时，请说话",
    "例如说：'查询今天的天气'或'发送消息给张三'",
    "系统会复述您的指令并询问确认",
    "请说'确认'、'取消'或'重试'来响应",
    "如果确认，系统会执行操作并播报结果"
  ];

  return (
    <PageContainer>
      <Title level={2}>
        <ExperimentOutlined style={{ marginRight: 8 }} />
        语音交互流程测试
      </Title>
      
      <Paragraph type="secondary">
        此页面用于测试完整的语音交互流程："一句话→解析→复述确认→执行→播报"
      </Paragraph>

      <TestCard theme={theme} title="测试说明">
        <Alert
          message="测试前准备"
          description="请确保您的浏览器已授权麦克风权限，并在安静的环境中进行测试。"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Title level={4}>测试流程:</Title>
        <InstructionsList theme={theme}>
          {testInstructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </InstructionsList>
        
        <Divider />
        
        <Space>
          <Button onClick={startTest} disabled={isTestRunning} className="inline-flex items-center gap-2">
            <AudioOutlined />
            {isTestRunning ? '测试进行中...' : '开始语音交互测试'}
          </Button>
          
          {testResults.length > 0 && (
            <Button variant="secondary" onClick={clearResults}>清除测试结果</Button>
          )}
        </Space>
      </TestCard>

      {/* 语音交互流程组件 */}
      {isTestRunning && (
        <TestCard theme={theme} title="语音交互流程">
          <FlowContainer theme={theme}>
            <VoiceInterface
              onResult={handleFlowResult}
              onError={handleFlowError}
              autoStart={true}
              showProgress={true}
              mode="full"
            />
          </FlowContainer>
        </TestCard>
      )}

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <TestCard theme={theme} title="测试结果">
          <Space direction="vertical" style={{ width: '100%' }}>
            {testResults.map((result, index) => (
              <Alert
                key={index}
                type={result.type}
                message={
                  <Space>
                    <CheckCircleOutlined />
                    <span>{result.timestamp}</span>
                    <span>{result.message}</span>
                  </Space>
                }
                description={result.data && (
                  <pre style={{ marginTop: 8, fontSize: '12px' }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
                style={{ marginBottom: 8 }}
              />
            ))}
          </Space>
        </TestCard>
      )}

      {/* 技术说明 */}
      <TestCard theme={theme} title="技术实现说明">
        <Space direction="vertical">
          <div>
            <Title level={5}>核心功能特性:</Title>
            <ul>
              <li><strong>完整流程闭环</strong>: 实现了用户语音输入到结果播报的完整流程</li>
              <li><strong>进度状态展示</strong>: 清晰展示当前处理阶段（聆听→理解→确认→执行→播报）</li>
              <li><strong>语音确认机制</strong>: 支持用户语音确认、取消或重试操作</li>
              <li><strong>错误处理</strong>: 完善的错误处理和用户反馈机制</li>
              <li><strong>统一架构</strong>: 使用统一的useVoice、useTTS、useIntent hooks</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>支持的交互指令:</Title>
            <ul>
              <li>查询类: "查询今天的天气"、"北京的天气怎么样"</li>
              <li>操作类: "发送消息给张三"、"设置明天8点的闹钟"</li>
              <li>确认词: "确认"、"好的"、"是的"、"执行"</li>
              <li>取消词: "取消"、"不要"、"算了"</li>
              <li>重试词: "重试"、"再试一次"、"重新来"</li>
            </ul>
          </div>
        </Space>
      </TestCard>
    </PageContainer>
  );
};

export default VoiceFlowTestPage; 