import React from 'react';
import styled from 'styled-components';
import { 
  BulbOutlined, 
  CheckCircleOutlined, 
  PlayCircleOutlined, 
  FlagOutlined 
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

// 四个阶段定义
const FOUR_STAGES = {
  UNDERSTANDING: 'understanding',    // 理解
  CONFIRMING: 'confirming',         // 确认
  EXECUTING: 'executing',           // 执行
  COMPLETED: 'completed'            // 完成
};

// 进度容器
const ProgressContainer = styled.div`
  display: flex;
  width: 100%;
  margin: 20px 0;
  position: relative;
  padding: 0 10px;
`;

// 进度连接线
const ProgressLine = styled.div`
  position: absolute;
  top: 20px;
  left: 10px;
  right: 10px;
  height: 3px;
  background-color: ${props => props.theme === 'dark' ? '#333' : '#e0e0e0'};
  z-index: 0;
  border-radius: 2px;
`;

// 进度完成线
const ProgressCompleteLine = styled.div`
  position: absolute;
  top: 20px;
  left: 10px;
  height: 3px;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  z-index: 1;
  border-radius: 2px;
  transition: width 0.5s ease;
  width: ${props => {
    switch (props.currentStage) {
      case FOUR_STAGES.UNDERSTANDING:
        return '25%';
      case FOUR_STAGES.CONFIRMING:
        return '50%';
      case FOUR_STAGES.EXECUTING:
        return '75%';
      case FOUR_STAGES.COMPLETED:
        return '100%';
      default:
        return '0%';
    }
  }};
`;

// 阶段项容器
const StageItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  z-index: 2;
  position: relative;
`;

// 阶段图标
const StageIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => {
    if (props.isCompleted) return '#52c41a';
    if (props.isActive) return '#1890ff';
    return props.theme === 'dark' ? '#333' : '#f0f0f0';
  }};
  color: ${props => {
    if (props.isCompleted || props.isActive) return '#fff';
    return props.theme === 'dark' ? '#666' : '#999';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  box-shadow: ${props => 
    props.isActive 
      ? '0 0 0 4px rgba(24, 144, 255, 0.2)' 
      : props.isCompleted
        ? '0 0 0 4px rgba(82, 196, 26, 0.2)'
        : 'none'
  };
  transform: ${props => props.isActive ? 'scale(1.1)' : 'scale(1)'};
`;

// 阶段标签
const StageLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => {
    if (props.isCompleted) return '#52c41a';
    if (props.isActive) return '#1890ff';
    return props.theme === 'dark' ? '#666' : '#999';
  }};
  transition: color 0.3s ease;
  text-align: center;
  white-space: nowrap;
`;

// 阶段描述
const StageDescription = styled.span`
  font-size: 10px;
  color: ${props => props.theme === 'dark' ? '#888' : '#bbb'};
  text-align: center;
  margin-top: 2px;
  opacity: ${props => props.isActive ? 1 : 0.7};
  transition: opacity 0.3s ease;
`;

/**
 * 四阶段进度条组件
 * @param {Object} props - 组件属性
 * @param {string} props.currentStage - 当前阶段
 * @param {Object} props.customLabels - 自定义标签
 * @param {boolean} props.showDescription - 是否显示描述
 * @param {string} props.className - CSS类名
 */
const FourStageProgressBar = ({ 
  currentStage = FOUR_STAGES.UNDERSTANDING,
  customLabels = {},
  showDescription = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  
  // 定义四个阶段
  const stages = [
    { 
      key: FOUR_STAGES.UNDERSTANDING, 
      label: '理解', 
      description: '分析用户意图',
      icon: <BulbOutlined />,
      isActive: currentStage === FOUR_STAGES.UNDERSTANDING,
      isCompleted: [
        FOUR_STAGES.CONFIRMING, 
        FOUR_STAGES.EXECUTING, 
        FOUR_STAGES.COMPLETED
      ].includes(currentStage)
    },
    { 
      key: FOUR_STAGES.CONFIRMING, 
      label: '确认', 
      description: '等待用户确认',
      icon: <CheckCircleOutlined />,
      isActive: currentStage === FOUR_STAGES.CONFIRMING,
      isCompleted: [
        FOUR_STAGES.EXECUTING, 
        FOUR_STAGES.COMPLETED
      ].includes(currentStage)
    },
    { 
      key: FOUR_STAGES.EXECUTING, 
      label: '执行', 
      description: '执行用户指令',
      icon: <PlayCircleOutlined />,
      isActive: currentStage === FOUR_STAGES.EXECUTING,
      isCompleted: currentStage === FOUR_STAGES.COMPLETED
    },
    { 
      key: FOUR_STAGES.COMPLETED, 
      label: '完成', 
      description: '任务已完成',
      icon: <FlagOutlined />,
      isActive: currentStage === FOUR_STAGES.COMPLETED,
      isCompleted: false
    }
  ];
  
  return (
    <ProgressContainer className={className}>
      <ProgressLine theme={isDark ? 'dark' : 'light'} />
      <ProgressCompleteLine currentStage={currentStage} />
      
      {stages.map((stage) => (
        <StageItem key={stage.key}>
          <StageIcon 
            theme={isDark ? 'dark' : 'light'}
            isActive={stage.isActive} 
            isCompleted={stage.isCompleted}
          >
            {stage.isCompleted ? '✓' : stage.icon}
          </StageIcon>
          <StageLabel 
            theme={isDark ? 'dark' : 'light'}
            isActive={stage.isActive}
            isCompleted={stage.isCompleted}
          >
            {customLabels[stage.key] || stage.label}
          </StageLabel>
          {showDescription && (
            <StageDescription 
              theme={isDark ? 'dark' : 'light'}
              isActive={stage.isActive}
            >
              {stage.description}
            </StageDescription>
          )}
        </StageItem>
      ))}
    </ProgressContainer>
  );
};

export default FourStageProgressBar;
export { FOUR_STAGES };
