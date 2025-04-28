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

// 进度容器
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
 * 进度状态栏组件
 * @param {Object} props - 组件属性
 * @param {string} props.stage - 当前阶段
 */
const ProgressBar = ({ stage = SessionStages.IDLE }) => {
  const { theme } = useTheme();
  
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
};

export default ProgressBar; 