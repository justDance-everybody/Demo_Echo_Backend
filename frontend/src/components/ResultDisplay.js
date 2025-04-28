import React, { useEffect } from 'react';
import styled from 'styled-components';
import { 
  CheckCircleOutlined, 
  WarningOutlined, 
  InfoCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import useVoice from '../hooks/useVoice';
import { useTheme } from '../contexts/ThemeContext';

// 结果容器
const ResultContainer = styled.div`
  background-color: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 10px ${props => props.theme.shadowColor};
  animation: fadeIn 0.5s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// 结果标题行
const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

// 结果图标
const ResultIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 12px;
  color: ${props => {
    switch (props.status) {
      case 'success':
        return props.theme.success;
      case 'warning':
        return props.theme.warning;
      case 'error':
        return props.theme.error;
      default:
        return props.theme.primary;
    }
  }};
`;

// 结果标题
const ResultTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 18px;
`;

// 结果内容
const ResultContent = styled.div`
  color: ${props => props.theme.text};
  line-height: 1.6;
  font-size: 15px;
  margin-bottom: 16px;
`;

// 结果详情
const ResultDetails = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.border};
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
  white-space: pre-wrap;
`;

// 动作按钮
const ActionButton = styled.button`
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.buttonText};
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px ${props => props.theme.shadowColor};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

/**
 * 结果显示组件
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 结果数据
 * @param {string} props.status - 结果状态 (success, warning, error, info)
 * @param {string} props.title - 结果标题
 * @param {string} props.message - 结果消息
 * @param {boolean} props.autoSpeak - 是否自动朗读结果
 * @param {Function} props.onDismiss - 关闭结果回调
 * @param {Function} props.onAction - 动作按钮回调
 * @param {string} props.actionText - 动作按钮文本
 */
const ResultDisplay = ({
  data = {},
  status = 'success',
  title,
  message,
  autoSpeak = true,
  onDismiss,
  onAction,
  actionText = '继续'
}) => {
  const { theme } = useTheme();
  const { speak } = useVoice();
  
  // 根据status获取图标
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined />;
      case 'warning':
        return <WarningOutlined />;
      case 'error':
        return <CloseCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };
  
  // 自动朗读结果消息
  useEffect(() => {
    if (autoSpeak && message) {
      speak(message);
    }
  }, [message, autoSpeak, speak]);
  
  // 格式化结果详情
  const formatDetails = () => {
    if (!data) return '无详细数据';
    
    try {
      // 如果已经是字符串，直接返回
      if (typeof data === 'string') return data;
      
      // 格式化JSON对象
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('格式化结果详情失败:', error);
      return '无法显示详细数据';
    }
  };
  
  // 提取标题
  const displayTitle = title || (
    status === 'success' ? '操作成功' :
    status === 'warning' ? '注意' :
    status === 'error' ? '操作失败' : '信息'
  );
  
  // 提取消息
  let displayMessage = message;
  if (!displayMessage) {
    if (typeof data === 'object' && data.message) {
      displayMessage = data.message;
    } else if (typeof data === 'string') {
      displayMessage = data;
    } else {
      displayMessage = status === 'success' 
        ? '您的请求已成功处理。' 
        : status === 'error' 
          ? '处理请求时发生错误，请重试。' 
          : '请求已处理。';
    }
  }
  
  return (
    <ResultContainer theme={theme}>
      <ResultHeader>
        <ResultIcon theme={theme} status={status}>
          {getStatusIcon()}
        </ResultIcon>
        <ResultTitle theme={theme}>{displayTitle}</ResultTitle>
      </ResultHeader>
      
      <ResultContent theme={theme}>
        {displayMessage}
      </ResultContent>
      
      {Object.keys(data).length > 0 && data.details && (
        <ResultDetails theme={theme}>
          {formatDetails()}
        </ResultDetails>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        {onAction && (
          <ActionButton theme={theme} onClick={onAction}>
            {actionText}
          </ActionButton>
        )}
      </div>
    </ResultContainer>
  );
};

export default ResultDisplay; 