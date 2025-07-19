import React from 'react';
import styled, { keyframes } from 'styled-components';
import { LoadingOutlined, AudioOutlined, SoundOutlined, QuestionCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { INTERACTION_STATES } from '../contexts/InteractionContext';

// 动画定义
const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.6; transform: scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const wave = keyframes`
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
`;

// 状态指示器容器
const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: ${props => props.bgColor || '#f8f9fa'};
  border-radius: 12px;
  margin: 10px 0;
  border: 2px solid ${props => props.borderColor || '#e9ecef'};
  transition: all 0.3s ease;
  min-height: 60px;
`;

// 图标容器
const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  color: ${props => props.color || '#6c757d'};
  font-size: 20px;
  
  ${props => props.animated && `animation: ${props.animation} 1.5s infinite;`}
`;

// 状态文本
const StatusText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color || '#495057'};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

// 子状态文本
const SubStatusText = styled.div`
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
`;

// 音频波形动画
const AudioWave = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
`;

const WaveBar = styled.div`
  width: 3px;
  height: 12px;
  background: #007bff;
  border-radius: 2px;
  animation: ${wave} 1s infinite;
  animation-delay: ${props => props.delay || '0s'};
`;

// 状态配置
const STATUS_CONFIG = {
  [INTERACTION_STATES.IDLE]: {
    icon: CheckCircleOutlined,
    text: '准备就绪',
    subText: '点击开始语音交互',
    color: 'var(--color-success)',
      bgColor: 'var(--color-success-background)',
      borderColor: 'var(--color-success-border)',
    animated: false
  },
  [INTERACTION_STATES.LISTENING]: {
    icon: AudioOutlined,
    text: '正在聆听',
    subText: '请说出您的指令',
    color: 'var(--color-primary)',
      bgColor: 'var(--color-primary-background)',
      borderColor: 'var(--color-primary-border)',
    animated: true,
    animation: pulse,
    showWave: true
  },
  [INTERACTION_STATES.THINKING]: {
    icon: LoadingOutlined,
    text: '正在思考',
    subText: '分析您的指令中...',
    color: 'var(--color-warning)',
      bgColor: 'var(--color-warning-background)',
      borderColor: 'var(--color-warning-border)',
    animated: true,
    animation: spin
  },
  [INTERACTION_STATES.SPEAKING]: {
    icon: SoundOutlined,
    text: '正在回复',
    subText: '播放语音回复中...',
    color: 'var(--color-info)',
      bgColor: 'var(--color-info-background)',
      borderColor: 'var(--color-info-border)',
    animated: true,
    animation: pulse
  },
  [INTERACTION_STATES.CONFIRMING]: {
    icon: QuestionCircleOutlined,
    text: '等待确认',
    subText: '请确认、取消或重试操作',
    color: 'var(--color-orange)',
      bgColor: 'var(--color-orange-background)',
      borderColor: 'var(--color-orange-border)',
    animated: true,
    animation: pulse
  },
  [INTERACTION_STATES.ERROR]: {
    icon: () => '⚠️',
    text: '出现错误',
    subText: '请重试或检查网络连接',
    color: 'var(--color-error)',
      bgColor: 'var(--color-error-background)',
      borderColor: 'var(--color-error-border)',
    animated: false
  }
};

/**
 * 交互状态指示器组件
 * @param {Object} props
 * @param {string} props.currentState - 当前交互状态
 * @param {string} props.customText - 自定义状态文本
 * @param {string} props.customSubText - 自定义子状态文本
 * @param {boolean} props.compact - 紧凑模式
 */
const InteractionStatusIndicator = ({ 
  currentState = INTERACTION_STATES.IDLE, 
  customText, 
  customSubText, 
  compact = false 
}) => {
  const config = STATUS_CONFIG[currentState] || STATUS_CONFIG[INTERACTION_STATES.IDLE];
  const IconComponent = config.icon;

  return (
    <StatusContainer
      bgColor={config.bgColor}
      borderColor={config.borderColor}
      style={{ padding: compact ? 'var(--spacing-xs) var(--spacing-md)' : 'var(--spacing-sm) var(--spacing-lg)', minHeight: compact ? 'var(--component-height-md)' : 'var(--component-height-lg)' }}
    >
      <IconContainer
        color={config.color}
        animated={config.animated}
        animation={config.animation}
      >
        {typeof IconComponent === 'function' ? <IconComponent /> : IconComponent}
      </IconContainer>
      
      <StatusText color={config.color}>
        <div>{customText || config.text}</div>
        {!compact && (
          <SubStatusText>
            {customSubText || config.subText}
          </SubStatusText>
        )}
      </StatusText>
      
      {config.showWave && (
        <AudioWave>
          <WaveBar delay="0s" />
          <WaveBar delay="0.2s" />
          <WaveBar delay="0.4s" />
          <WaveBar delay="0.6s" />
        </AudioWave>
      )}
    </StatusContainer>
  );
};

export default InteractionStatusIndicator;