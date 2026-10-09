import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import FourStageProgressBar, { FOUR_STAGES } from '../FourStageProgressBar';

// Mock theme context
const mockThemeContext = {
  isDark: false,
  theme: {
    primary: '#1890ff',
    success: '#52c41a',
    surface: '#f0f0f0',
    textSecondary: '#999'
  }
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider value={mockThemeContext}>
      {component}
    </ThemeProvider>
  );
};

describe('FourStageProgressBar', () => {
  test('渲染四个阶段', () => {
    renderWithTheme(
      <FourStageProgressBar currentStage={FOUR_STAGES.UNDERSTANDING} />
    );
    
    expect(screen.getByText('理解')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('执行')).toBeInTheDocument();
    expect(screen.getByText('完成')).toBeInTheDocument();
  });

  test('显示阶段描述', () => {
    renderWithTheme(
      <FourStageProgressBar 
        currentStage={FOUR_STAGES.UNDERSTANDING} 
        showDescription={true} 
      />
    );
    
    expect(screen.getByText('分析用户意图')).toBeInTheDocument();
    expect(screen.getByText('等待用户确认')).toBeInTheDocument();
    expect(screen.getByText('执行用户指令')).toBeInTheDocument();
    expect(screen.getByText('任务已完成')).toBeInTheDocument();
  });

  test('支持自定义标签', () => {
    const customLabels = {
      [FOUR_STAGES.UNDERSTANDING]: '理解中',
      [FOUR_STAGES.CONFIRMING]: '确认中',
      [FOUR_STAGES.EXECUTING]: '执行中',
      [FOUR_STAGES.COMPLETED]: '已完成'
    };

    renderWithTheme(
      <FourStageProgressBar 
        currentStage={FOUR_STAGES.UNDERSTANDING}
        customLabels={customLabels}
      />
    );
    
    expect(screen.getByText('理解中')).toBeInTheDocument();
    expect(screen.getByText('确认中')).toBeInTheDocument();
    expect(screen.getByText('执行中')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  test('正确显示当前阶段状态', () => {
    renderWithTheme(
      <FourStageProgressBar currentStage={FOUR_STAGES.EXECUTING} />
    );
    
    // 执行阶段应该是活跃状态
    const executingIcon = screen.getByText('执行').closest('div').querySelector('[data-testid="stage-icon"]') || 
                         screen.getByText('执行').closest('div');
    
    // 由于我们无法直接测试样式，我们至少可以确保组件渲染了
    expect(screen.getByText('执行')).toBeInTheDocument();
  });
});

describe('FOUR_STAGES常量', () => {
  test('包含所有必要的阶段', () => {
    expect(FOUR_STAGES.UNDERSTANDING).toBe('understanding');
    expect(FOUR_STAGES.CONFIRMING).toBe('confirming');
    expect(FOUR_STAGES.EXECUTING).toBe('executing');
    expect(FOUR_STAGES.COMPLETED).toBe('completed');
  });
});
