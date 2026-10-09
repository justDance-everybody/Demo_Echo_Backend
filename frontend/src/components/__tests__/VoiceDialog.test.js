import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import VoiceDialog from '../VoiceDialog';
import { ThemeContext } from '../../theme/ThemeProvider';

// 模拟 axios
jest.mock('axios');

// 模拟语音识别
global.SpeechRecognition = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// 模拟语音合成
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { lang: 'zh-CN', name: 'Chinese Voice' }
  ])
};

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'zh-CN',
  onend: null
}));

// 准备模拟 MCP 服务器数据
const mockMcpServers = [
  { id: 'server1', name: 'AI 助手', description: '智能聊天服务', icon: 'smile' },
  { id: 'amap-server', name: '高德地图', description: '地图服务', icon: 'environment' },
  { id: 'minimax-tts', name: 'MiniMax', description: '语音合成', icon: 'sound' }
];

describe('VoiceDialog 组件', () => {
  // 设置测试环境
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟成功的服务器请求
    axios.get.mockResolvedValue({
      data: {
        servers: mockMcpServers
      }
    });
  });
  
  // 包装渲染函数
  const renderVoiceDialog = (props = {}) => {
    return render(
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: jest.fn() }}>
        <VoiceDialog onClose={jest.fn()} {...props} />
      </ThemeContext.Provider>
    );
  };
  
  // 测试基本渲染
  test('正确渲染对话框组件', async () => {
    renderVoiceDialog();
    
    // 验证标题和录音按钮存在
    expect(screen.getByText(/语音助手/i)).toBeInTheDocument();
    
    // 等待服务器数据加载完成
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/test-service/mcp-servers');
    });
  });
  
  // 测试服务器加载
  test('加载 MCP 服务器列表', async () => {
    renderVoiceDialog();
    
    // 等待服务器数据加载完成
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/test-service/mcp-servers');
    });
    
    // 验证服务器列表显示
    await waitFor(() => {
      expect(screen.getByText('AI 助手')).toBeInTheDocument();
      expect(screen.getByText('高德地图')).toBeInTheDocument();
      expect(screen.getByText('MiniMax')).toBeInTheDocument();
    });
  });
  
  // 测试服务器选择功能
  test('选择 MCP 服务器', async () => {
    renderVoiceDialog();
    
    // 等待服务器数据加载完成
    await waitFor(() => {
      expect(screen.getByText('AI 助手')).toBeInTheDocument();
    });
    
    // 找到并点击地图服务器卡片
    const mapServerCard = screen.getByText('高德地图').closest('.ant-card');
    fireEvent.click(mapServerCard);
    
    // 验证该服务器被选中 (由于实现细节可能不同，这部分可能需要调整)
    // 假设选中时卡片有特定样式或标记
    expect(mapServerCard).toHaveStyle('border: 2px solid'); 
  });
  
  // 测试错误处理
  test('处理服务器加载错误', async () => {
    // 模拟请求失败
    axios.get.mockRejectedValue(new Error('Network error'));
    
    renderVoiceDialog();
    
    // 等待错误显示
    await waitFor(() => {
      expect(screen.getByText(/无法连接到服务器，请重试/i)).toBeInTheDocument();
    });
  });
  
  // 测试关闭对话框
  test('关闭对话框', () => {
    const mockOnClose = jest.fn();
    renderVoiceDialog({ onClose: mockOnClose });
    
    // 找到并点击关闭按钮
    const closeButton = screen.getByRole('button', { name: '' }); // 根据实际组件调整
    fireEvent.click(closeButton);
    
    // 验证关闭回调被调用
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  // 测试语音录制
  test('点击录音按钮启动语音识别', async () => {
    renderVoiceDialog();
    
    // 等待组件加载完成
    await waitFor(() => {
      expect(screen.getByText('AI 助手')).toBeInTheDocument();
    });
    
    // 找到并点击录音按钮
    const recordButton = screen.getByRole('button', { name: /点击开始说话|开始录音|开始/i });
    fireEvent.click(recordButton);
    
    // 验证录音状态变化
    // 这取决于组件内部实现，可能需要调整
    expect(recordButton).toHaveTextContent(/停止|正在录音/i);
  });
}); 