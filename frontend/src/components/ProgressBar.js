import React from 'react';
import styled from 'styled-components';
import { 
  SoundOutlined, 
  BulbOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { SessionStages } from '../contexts/SessionContext';

// 基础进度条容器
const BaseProgressContainer = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${props => props.theme === 'dark' ? '#333' : '#e0e0e0'};
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
  position: relative;
`;

// 进度填充
const ProgressFill = styled.div`
  height: 100%;
  background-color: ${props => props.color || '#1890ff'};
  width: ${props => `${Math.min(Math.max(props.percent, 0), 100)}%`};
  border-radius: 4px;
  transition: width 0.3s ease;
  
  &.animated {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 1rem 1rem;
    animation: progress-bar-stripes 1s linear infinite;
  }
  
  @keyframes progress-bar-stripes {
    from { background-position: 1rem 0; }
    to { background-position: 0 0; }
  }
`;

// 标签
const ProgressLabel = styled.span`
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: ${props => props.textColor || '#000'};
  font-weight: bold;
`;

// 进度容器 (多步进度流程)
const ProgressContainer = styled.div`
  display: flex;
  width: 100%;
  margin: 20px 0;
  position: relative;
`;

// 进度线
const ProgressLine = styled.div`
  position: absolute;
  top: 16px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: ${props => props.theme.border};
  z-index: 0;
`;

// 进度完成线
const ProgressCompleteLine = styled.div`
  position: absolute;
  top: 16px;
  left: 0;
  height: 3px;
  background-color: ${props => props.theme.primary};
  z-index: 1;
  transition: width 0.3s ease;
  width: ${props => {
    switch (props.stage) {
      case SessionStages.LISTENING:
        return '25%';
      case SessionStages.INTERPRETING:
        return '50%';
      case SessionStages.CONFIRMING:
      case SessionStages.EXECUTING:
        return '75%';
      case SessionStages.RESULT:
        return '100%';
      default:
        return '0%';
    }
  }};
`;

// 进度阶段项
const StageItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  z-index: 2;
`;

// 进度阶段图标
const StageIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: ${props => 
    props.active 
      ? props.theme.primary 
      : props.completed 
        ? props.theme.success 
        : props.theme.surface
  };
  color: ${props => 
    props.active || props.completed 
      ? props.theme.buttonText 
      : props.theme.textSecondary
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  box-shadow: ${props => 
    props.active 
      ? `0 0 0 4px ${props.theme.primary}33` 
      : 'none'
  };
`;

// 进度阶段标签
const StageLabel = styled.span`
  font-size: 12px;
  color: ${props => 
    props.active 
      ? props.theme.primary 
      : props.completed
        ? props.theme.success
        : props.theme.textSecondary
  };
  transition: color 0.3s ease;
  white-space: nowrap;
`;

/**
 * 进度条组件 - 支持简单进度条和多步流程条
 * 
 * @param {Object} props - 组件属性
 * @param {number} props.value - 当前进度值
 * @param {number} props.max - 最大进度值
 * @param {boolean} props.indeterminate - 是否为不确定进度
 * @param {boolean} props.showLabel - 是否显示百分比标签
 * @param {string} props.color - 进度条颜色
 * @param {boolean} props.animated - 是否显示动画效果
 * @param {string} props.stage - 当前阶段 (用于多步流程条)
 */
const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  indeterminate = false,
  showLabel = false,
  color = null,
  animated = false,
  stage = null
}) => {
  const { theme, isDark } = useTheme();
  
  // 如果有stage参数，显示多步流程进度条
  if (stage && Object.values(SessionStages).includes(stage)) {
    // 定义阶段
    const stages = [
      { 
        key: 'listening', 
        label: '识别中', 
        icon: <SoundOutlined />,
        active: stage === SessionStages.LISTENING,
        completed: stage === SessionStages.INTERPRETING || 
                  stage === SessionStages.CONFIRMING || 
                  stage === SessionStages.EXECUTING || 
                  stage === SessionStages.RESULT
      },
      { 
        key: 'interpreting', 
        label: '理解中', 
        icon: <BulbOutlined />,
        active: stage === SessionStages.INTERPRETING,
        completed: stage === SessionStages.CONFIRMING || 
                  stage === SessionStages.EXECUTING || 
                  stage === SessionStages.RESULT
      },
      { 
        key: 'executing', 
        label: '执行中', 
        icon: <PlayCircleOutlined />,
        active: stage === SessionStages.CONFIRMING || 
                stage === SessionStages.EXECUTING,
        completed: stage === SessionStages.RESULT
      },
      { 
        key: 'completed', 
        label: '完成', 
        icon: <CheckCircleOutlined />,
        active: stage === SessionStages.RESULT,
        completed: false
      }
    ];
    
    return (
      <ProgressContainer>
        <ProgressLine theme={theme} />
        <ProgressCompleteLine theme={theme} stage={stage} />
        
        {stages.map((stageItem) => (
          <StageItem key={stageItem.key}>
            <StageIcon 
              theme={theme} 
              active={stageItem.active} 
              completed={stageItem.completed}
            >
              {stageItem.icon}
            </StageIcon>
            <StageLabel 
              theme={theme}
              active={stageItem.active}
              completed={stageItem.completed}
            >
              {stageItem.label}
            </StageLabel>
          </StageItem>
        ))}
      </ProgressContainer>
    );
  }
  
  // 计算百分比
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);
  const textColor = isDark ? '#fff' : '#000';
  
  // 简单进度条
  return (
    <BaseProgressContainer 
      theme={isDark ? 'dark' : 'light'}
      className={indeterminate ? 'indeterminate' : ''}
      data-testid="progress-bar"
    >
      <ProgressFill 
        percent={indeterminate ? 100 : percent}
        color={color}
        className={`${animated ? 'animated' : ''} ${indeterminate ? 'indeterminate' : ''}`}
        data-testid="progress-fill"
      />
      {showLabel && !indeterminate && (
        <ProgressLabel textColor={textColor}>
          {Math.round(percent)}%
        </ProgressLabel>
      )}
    </BaseProgressContainer>
  );
};

export default ProgressBar; 