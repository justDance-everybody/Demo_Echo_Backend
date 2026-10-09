import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; 
import '@testing-library/jest-dom';
import ConfirmationModal from '../ConfirmationModal';
import { ThemeContext } from '../../contexts/ThemeContext';

// 模拟hooks
jest.mock('../../hooks/useVoice', () => () => ({
  isListening: false,
  transcript: '',
  startListening: jest.fn(),
  stopListening: jest.fn()
}));

jest.mock('../../hooks/useIntent', () => () => ({
  classifyIntent: jest.fn((text) => {
    if (text.toLowerCase().includes('好') || text.toLowerCase().includes('确认')) return 'CONFIRM';
    if (text.toLowerCase().includes('重试') || text.toLowerCase().includes('再来')) return 'RETRY';
    if (text.toLowerCase().includes('取消') || text.toLowerCase().includes('不')) return 'CANCEL';
    return 'UNKNOWN';
  })
}));

jest.mock('../../hooks/useTTS', () => () => ({
  speak: jest.fn((text, lang, rate, volume, onFinish) => {
    // 立即调用完成回调，模拟语音完成
    if (onFinish) setTimeout(onFinish, 10);
  }),
  cancel: jest.fn()
}));

// 模拟主题上下文
const mockTheme = {
  primary: '#4FD1C5',
  secondary: '#805AD5',
  text: '#2D3748',
  textSecondary: '#718096',
  background: '#F7FAFC',
  border: '#E2E8F0',
  shadowColor: 'rgba(0,0,0,0.1)',
  dialogBackground: '#FFFFFF',
  dialogOverlay: 'rgba(45, 55, 72, 0.5)',
  buttonText: '#FFFFFF'
};

// 渲染辅助函数
const renderWithTheme = (ui) => {
  return render(
    <ThemeContext.Provider value={{ theme: mockTheme }}>
      {ui}
    </ThemeContext.Provider>
  );
};

describe('ConfirmationModal组件', () => {
  // 基础属性
  const defaultProps = {
    isOpen: true,
    confirmText: '您确定要执行此操作吗？',
    onConfirm: jest.fn(),
    onRetry: jest.fn(),
    onCancel: jest.fn(),
    useVoiceConfirmation: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 基础渲染测试
  test('当isOpen为true时应该渲染对话框', async () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} />);
    
    // 等待TTS完成后按钮显示
    await waitFor(() => {
      expect(screen.getByText('您确定要执行此操作吗？')).toBeInTheDocument();
      expect(screen.getByText('确认')).toBeInTheDocument();
      expect(screen.getByText('重试')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });
  });

  // 测试当isOpen为false时不渲染对话框
  test('当isOpen为false时不应该渲染对话框', () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('您确定要执行此操作吗？')).not.toBeInTheDocument();
  });

  // 点击确认按钮测试
  test('点击确认按钮应调用onConfirm回调', async () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} />);
    
    // 等待TTS完成后按钮显示
    await waitFor(() => {
      expect(screen.getByText('确认')).toBeInTheDocument();
    });
    
    // 点击确认按钮
    userEvent.click(screen.getByText('确认'));
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  // 点击重试按钮测试
  test('点击重试按钮应调用onRetry回调', async () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} />);
    
    // 等待TTS完成后按钮显示
    await waitFor(() => {
      expect(screen.getByText('重试')).toBeInTheDocument();
    });
    
    // 点击重试按钮
    userEvent.click(screen.getByText('重试'));
    
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  // 点击取消按钮测试
  test('点击取消按钮应调用onCancel回调', async () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} />);
    
    // 等待TTS完成后按钮显示
    await waitFor(() => {
      expect(screen.getByText('取消')).toBeInTheDocument();
    });
    
    // 点击取消按钮
    userEvent.click(screen.getByText('取消'));
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  // 测试语音输入按钮
  test('应显示语音输入按钮', async () => {
    renderWithTheme(<ConfirmationModal {...defaultProps} />);
    
    // 等待TTS完成后按钮显示
    await waitFor(() => {
      expect(screen.getByText('点击开始语音输入')).toBeInTheDocument();
    });
  });

  // 测试禁用语音确认
  test('当useVoiceConfirmation=false时不应自动启动语音识别', async () => {
    const mockStartSTTListening = jest.fn();
    
    renderWithTheme(
      <ConfirmationModal 
        {...defaultProps} 
        useVoiceConfirmation={false}
        startSTTListening={mockStartSTTListening}
      />
    );
    
    // 等待一段时间后检查
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 不应自动调用语音识别
    expect(mockStartSTTListening).not.toHaveBeenCalled();
  });
}); 