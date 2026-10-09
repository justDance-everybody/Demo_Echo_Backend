import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainPage from '../MainPage';
import apiClient from '../../../services/apiClient';
import { AuthProvider } from '../../../contexts/AuthContext';

// 模拟依赖
jest.mock('../../../services/apiClient');
jest.mock('../../../hooks/useTTS', () => () => ({
  speak: jest.fn((text, callback) => callback && callback()),
  cancel: jest.fn(),
  isSpeaking: false
}));
jest.mock('../../../hooks/useVoice', () => () => ({
  startListening: jest.fn(),
  transcript: '',
  isListening: false,
  error: null,
  reset: jest.fn(),
  stopListening: jest.fn()
}));
jest.mock('../../../hooks/useIntent', () => () => ({
  classifyIntent: jest.fn(() => 'CONFIRM')
}));

describe('MainPage 组件测试', () => {
  // 在所有测试前设置 mock
  beforeEach(() => {
    // 模拟 apiClient 方法
    apiClient.getTools.mockResolvedValue([
      { tool_id: 'weather', name: '天气查询', description: '查询天气', type: 'http' },
      { tool_id: 'calendar', name: '日程管理', description: '管理日程', type: 'http' }
    ]);
    apiClient.interpret.mockResolvedValue({
      action: 'respond',
      content: '这是回复内容'
    });
  });

  // 在所有测试后清理 mock
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('渲染初始状态', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MainPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // 等待工具加载
    await waitFor(() => {
      expect(apiClient.getTools).toHaveBeenCalled();
    });

    // 验证状态栏存在
    expect(screen.getByRole('banner')).toBeInTheDocument();
    
    // 验证语音输入按钮存在
    expect(screen.getByRole('button', { name: /点击开始说话/i })).toBeInTheDocument();
  });

  test('点击侧边栏按钮打开工具列表', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MainPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // 等待工具加载
    await waitFor(() => {
      expect(apiClient.getTools).toHaveBeenCalled();
    });

    // 点击侧边栏切换按钮
    const toggleButton = screen.getByRole('button', { name: /打开工具菜单/i });
    fireEvent.click(toggleButton);

    // 验证工具列表显示
    await waitFor(() => {
      expect(screen.getByText('可用工具')).toBeInTheDocument();
      expect(screen.getByText('天气查询')).toBeInTheDocument();
      expect(screen.getByText('日程管理')).toBeInTheDocument();
    });
  });

  test('语音识别处理逻辑', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <MainPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // 获取语音识别按钮
    const voiceButton = screen.getByRole('button', { name: /点击开始说话/i });
    
    // 模拟语音识别结果
    const mockVoiceResult = jest.fn();
    
    // 手动触发 VoiceRecorder 的 onResult 逻辑
    const component = screen.getByTestId('voice-recorder');
    component.onResult = mockVoiceResult;
    
    // 模拟点击语音按钮
    fireEvent.click(voiceButton);
    
    // 验证 API 调用
    await waitFor(() => {
      expect(apiClient.getTools).toHaveBeenCalled();
    });
  });

  test('显示结果组件', async () => {
    // 修改 interpret 返回假数据
    apiClient.interpret.mockResolvedValueOnce({
      action: 'respond',
      content: '测试结果内容'
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <MainPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // 等待工具加载
    await waitFor(() => {
      expect(apiClient.getTools).toHaveBeenCalled();
    });

    // 手动调用 handleVoiceResult 函数
    const instance = screen.getByTestId('main-page');
    instance.handleVoiceResult && instance.handleVoiceResult('测试语音输入');

    // 验证结果显示
    await waitFor(() => {
      expect(apiClient.interpret).toHaveBeenCalledWith('测试语音输入', expect.any(String), 1);
    });
  });
}); 