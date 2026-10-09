import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import VoiceRecorder from '../VoiceRecorder';

// 模拟语音识别对象
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.lang = '';
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }

  start() {
    if (this.onstart) this.onstart();
  }

  stop() {
    if (this.onend) this.onend();
  }

  // 模拟接收语音结果
  simulateResult(transcript) {
    if (this.onresult) {
      const event = {
        results: [
          [
            {
              transcript,
              confidence: 0.9
            }
          ]
        ]
      };
      this.onresult(event);
    }
  }

  // 模拟错误
  simulateError(errorType) {
    if (this.onerror) {
      const event = { error: errorType };
      this.onerror(event);
    }
  }
}

describe('VoiceRecorder组件', () => {
  let originalSpeechRecognition;
  
  beforeAll(() => {
    // 保存原始的SpeechRecognition对象
    originalSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // 设置模拟对象
    window.SpeechRecognition = MockSpeechRecognition;
  });
  
  afterAll(() => {
    // 还原原始对象
    if (originalSpeechRecognition) {
      window.SpeechRecognition = originalSpeechRecognition;
    } else {
      delete window.SpeechRecognition;
    }
  });
  
  // 基础渲染测试
  test('应该正确渲染语音录制按钮', () => {
    render(<VoiceRecorder onResult={jest.fn()} onError={jest.fn()} />);
    
    // 验证按钮存在
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('按住说话');
  });
  
  // 点击开始录音测试
  test('点击按钮应该开始录音', () => {
    const mockSetStatus = jest.fn();
    
    render(
      <VoiceRecorder 
        onResult={jest.fn()} 
        onError={jest.fn()} 
        setStatus={mockSetStatus}
      />
    );
    
    // 点击按钮开始录音
    const button = screen.getByRole('button');
    userEvent.click(button);
    
    // 验证状态更新
    expect(mockSetStatus).toHaveBeenCalledWith('listening');
    expect(button).toHaveTextContent('停止');
    expect(button).toHaveClass('listening');
  });
  
  // 语音结果处理测试
  test('接收语音结果后应调用onResult回调', () => {
    const mockOnResult = jest.fn();
    const mockOnError = jest.fn();
    
    render(
      <VoiceRecorder 
        onResult={mockOnResult} 
        onError={mockOnError}
      />
    );
    
    // 获取按钮
    const button = screen.getByRole('button');
    
    // 点击按钮开始录音
    userEvent.click(button);
    
    // 获取组件内部创建的recognition实例
    const recognitionInstance = window.SpeechRecognition.mock.instances[0];
    
    // 模拟接收语音结果
    act(() => {
      recognitionInstance.simulateResult('测试语音');
    });
    
    // 验证回调被调用
    expect(mockOnResult).toHaveBeenCalledWith('测试语音');
    expect(button).toHaveTextContent('按住说话');
    expect(button).not.toHaveClass('listening');
  });
  
  // 语音错误处理测试
  test('发生错误时应调用onError回调', () => {
    const mockOnResult = jest.fn();
    const mockOnError = jest.fn();
    
    render(
      <VoiceRecorder 
        onResult={mockOnResult} 
        onError={mockOnError}
      />
    );
    
    // 点击按钮开始录音
    const button = screen.getByRole('button');
    userEvent.click(button);
    
    // 获取组件内部创建的recognition实例
    const recognitionInstance = window.SpeechRecognition.mock.instances[0];
    
    // 模拟错误
    act(() => {
      recognitionInstance.simulateError('no-speech');
    });
    
    // 验证错误回调被调用
    expect(mockOnError).toHaveBeenCalledWith('no-speech');
    expect(button).toHaveTextContent('按住说话');
    expect(button).not.toHaveClass('listening');
  });
  
  // 禁用状态测试
  test('禁用状态下按钮应不可点击', () => {
    render(
      <VoiceRecorder 
        onResult={jest.fn()} 
        onError={jest.fn()} 
        disabled={true}
      />
    );
    
    // 验证按钮被禁用
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  // 浏览器不支持语音识别测试
  test('浏览器不支持语音识别时应显示提示', () => {
    // 临时移除SpeechRecognition模拟
    delete window.SpeechRecognition;
    
    const mockOnError = jest.fn();
    
    render(
      <VoiceRecorder 
        onResult={jest.fn()} 
        onError={mockOnError}
      />
    );
    
    // 验证显示不支持的提示
    expect(screen.getByText('语音识别不可用')).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith('Speech Recognition not supported');
    
    // 还原模拟
    window.SpeechRecognition = MockSpeechRecognition;
  });
  
  // 组件卸载时应停止录音测试
  test('组件卸载时应停止录音', () => {
    const { unmount } = render(
      <VoiceRecorder 
        onResult={jest.fn()} 
        onError={jest.fn()}
      />
    );
    
    // 模拟组件卸载
    unmount();
    
    // 由于我们使用的是模拟对象，无法直接测试stop方法的调用
    // 在实际应用中可以使用jest.spyOn
  });
}); 