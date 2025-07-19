import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  AudioOutlined, 
  LoadingOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { INTERACTION_STATES } from '../../config/constants';
import { UI_CONFIG } from '../../config/uiConfig';

// 定义交互流程步骤
const INTERACTION_STEPS = [
  {
    key: INTERACTION_STATES.IDLE,
    label: '等待输入',
    icon: AudioOutlined,
    description: '点击麦克风开始语音输入'
  },
  {
    key: INTERACTION_STATES.LISTENING,
    label: '语音识别',
    icon: AudioOutlined,
    description: '正在监听您的语音指令'
  },
  {
    key: INTERACTION_STATES.THINKING,
    label: 'AI分析',
    icon: LoadingOutlined,
    description: 'AI正在理解和分析您的指令'
  },
  {
    key: INTERACTION_STATES.CONFIRMING,
    label: '确认操作',
    icon: QuestionCircleOutlined,
    description: '请确认是否执行此操作'
  },
  {
    key: INTERACTION_STATES.EXECUTING,
    label: '执行中',
    icon: LoadingOutlined,
    description: '正在执行您的指令'
  },
  {
    key: INTERACTION_STATES.SPEAKING,
    label: '结果播报',
    icon: PlayCircleOutlined,
    description: 'AI正在播报执行结果'
  }
];

// 样式组件
const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${UI_CONFIG.spacing.medium};
  background: var(--color-surface);
  border-radius: ${UI_CONFIG.borderRadius.large};
  border: 1px solid var(--color-border);
  margin-bottom: ${UI_CONFIG.spacing.medium};
  box-shadow: var(--shadow-sm);
`;

const StepContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 2px;
    background: ${props => props.isCompleted ? 'var(--color-primary)' : 'var(--color-border)'};
    transition: background-color 0.3s ease;
  }
`;

const StepIcon = styled(motion.div)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 60px;
  position: relative;
  z-index: 1;
  
  background: ${props => {
    if (props.isActive) return 'var(--color-primary)';
    if (props.isCompleted) return 'var(--color-success)';
    return 'var(--color-surface-secondary)';
  }};
  
  color: ${props => {
    if (props.isActive || props.isCompleted) return 'var(--color-on-primary)';
    return 'var(--color-text-secondary)';
  }};
  
  border: 2px solid ${props => {
    if (props.isActive) return 'var(--color-primary)';
    if (props.isCompleted) return 'var(--color-success)';
    return 'var(--color-border)';
  }};
  
  transition: all 0.3s ease;
`;

const StepLabel = styled.div`
  position: absolute;
  top: 45px;
  left: 50%;
  transform: translateX(-50%);
  font-size: ${UI_CONFIG.typography.sizes.small};
  font-weight: ${props => props.isActive ? UI_CONFIG.typography.weights.semibold : UI_CONFIG.typography.weights.normal};
  color: ${props => props.isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
  white-space: nowrap;
  text-align: center;
`;

const CurrentStepInfo = styled(motion.div)`
  margin-top: ${UI_CONFIG.spacing.large};
  text-align: center;
  padding: ${UI_CONFIG.spacing.medium};
  background: var(--color-surface-secondary);
  border-radius: ${UI_CONFIG.borderRadius.medium};
  border-left: 4px solid var(--color-primary);
`;

const CurrentStepTitle = styled.h4`
  margin: 0 0 ${UI_CONFIG.spacing.small} 0;
  color: var(--color-primary);
  font-size: ${UI_CONFIG.typography.sizes.medium};
  font-weight: ${UI_CONFIG.typography.weights.semibold};
`;

const CurrentStepDescription = styled.p`
  margin: 0;
  color: var(--color-text-secondary);
  font-size: ${UI_CONFIG.typography.sizes.small};
  line-height: ${UI_CONFIG.typography.lineHeights.relaxed};
`;

const ErrorIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${UI_CONFIG.spacing.small};
  padding: ${UI_CONFIG.spacing.medium};
  background: var(--color-error-alpha);
  color: var(--color-error);
  border-radius: ${UI_CONFIG.borderRadius.medium};
  border: 1px solid var(--color-error);
  margin-top: ${UI_CONFIG.spacing.medium};
  font-size: ${UI_CONFIG.typography.sizes.small};
`;

/**
 * 交互进度指示器组件
 * 显示当前交互流程的进度和状态
 */
const InteractionProgressIndicator = ({ 
  currentState, 
  showDetailedInfo = true,
  compact = false 
}) => {
  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    return INTERACTION_STEPS.findIndex(step => step.key === currentState);
  };

  // 获取当前步骤信息
  const getCurrentStep = () => {
    return INTERACTION_STEPS.find(step => step.key === currentState) || INTERACTION_STEPS[0];
  };

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = getCurrentStep();
  const isError = currentState === INTERACTION_STATES.ERROR;

  // 如果是紧凑模式，只显示当前状态
  if (compact) {
    return (
      <ProgressContainer>
        <StepIcon
          isActive={!isError}
          isCompleted={false}
          animate={{
            scale: isError ? [1, 1.1, 1] : [1, 1.05, 1],
            rotate: currentState === INTERACTION_STATES.LISTENING ? [0, 5, -5, 0] : 0
          }}
          transition={{
            duration: 1.5,
            repeat: currentState === INTERACTION_STATES.LISTENING ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          {isError ? (
            <ExclamationCircleOutlined />
          ) : (
            React.createElement(currentStep.icon, {
              spin: currentState === INTERACTION_STATES.THINKING || currentState === INTERACTION_STATES.EXECUTING
            })
          )}
        </StepIcon>
        <StepLabel isActive={!isError}>
          {isError ? '出现错误' : currentStep.label}
        </StepLabel>
      </ProgressContainer>
    );
  }

  return (
    <div>
      <ProgressContainer>
        {INTERACTION_STEPS.map((step, index) => {
          const isActive = step.key === currentState;
          const isCompleted = index < currentStepIndex;
          const IconComponent = step.icon;
          
          return (
            <StepContainer key={step.key} isCompleted={isCompleted}>
              <StepIcon
                isActive={isActive}
                isCompleted={isCompleted}
                animate={{
                  scale: isActive ? [1, 1.05, 1] : 1,
                  rotate: isActive && step.key === INTERACTION_STATES.LISTENING ? [0, 5, -5, 0] : 0
                }}
                transition={{
                  duration: 1.5,
                  repeat: isActive && step.key === INTERACTION_STATES.LISTENING ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                {isCompleted ? (
                  <CheckCircleOutlined />
                ) : (
                  <IconComponent 
                    spin={isActive && (step.key === INTERACTION_STATES.THINKING || step.key === INTERACTION_STATES.EXECUTING)}
                  />
                )}
              </StepIcon>
              <StepLabel isActive={isActive}>
                {step.label}
              </StepLabel>
            </StepContainer>
          );
        })}
      </ProgressContainer>

      {/* 错误状态显示 */}
      {isError && (
        <ErrorIndicator
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ExclamationCircleOutlined />
          <span>操作过程中出现错误，请重试</span>
        </ErrorIndicator>
      )}

      {/* 当前步骤详细信息 */}
      {showDetailedInfo && !isError && (
        <CurrentStepInfo
          key={currentState} // 添加key确保状态变化时重新渲染动画
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CurrentStepTitle>{currentStep.label}</CurrentStepTitle>
          <CurrentStepDescription>{currentStep.description}</CurrentStepDescription>
        </CurrentStepInfo>
      )}
    </div>
  );
};

export default InteractionProgressIndicator;