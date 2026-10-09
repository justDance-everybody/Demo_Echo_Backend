import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, Dialog } from 'antd-mobile';
import MessageService from '../MessageService';

// 模拟antd-mobile组件
jest.mock('antd-mobile', () => ({
  Toast: {
    show: jest.fn(),
    clear: jest.fn()
  },
  Dialog: {
    confirm: jest.fn(),
    alert: jest.fn()
  }
}));

describe('MessageService', () => {
  beforeEach(() => {
    // 清除所有模拟调用记录
    jest.clearAllMocks();
  });

  // 测试showToast方法
  test('showToast应该调用Toast.show方法并传入正确参数', () => {
    const content = '测试消息';
    const icon = 'success';
    const duration = 3000;

    MessageService.showToast(content, icon, duration);

    expect(Toast.show).toHaveBeenCalledWith({
      content,
      icon,
      duration
    });
  });

  // 测试success方法
  test('success方法应该调用showToast并设置正确图标', () => {
    const content = '成功消息';
    const duration = 2500;

    MessageService.success(content, duration);

    expect(Toast.show).toHaveBeenCalledWith({
      content,
      icon: 'success',
      duration
    });
  });

  // 测试error方法
  test('error方法应该调用showToast并设置正确图标', () => {
    const content = '错误消息';
    const duration = 2500;

    MessageService.error(content, duration);

    expect(Toast.show).toHaveBeenCalledWith({
      content,
      icon: 'fail',
      duration
    });
  });

  // 测试loading方法
  test('loading方法应该调用Toast.show并返回关闭函数', () => {
    const content = '加载中...';
    
    const closeFunc = MessageService.loading(content);
    
    expect(Toast.show).toHaveBeenCalledWith({
      content,
      icon: 'loading',
      duration: 0
    });
    
    // 测试返回的关闭函数
    closeFunc();
    expect(Toast.clear).toHaveBeenCalled();
  });

  // 测试confirm方法
  test('confirm方法应该调用Dialog.confirm并返回结果', async () => {
    const content = '确认操作?';
    const title = '提示';
    const options = { confirmText: '确定', cancelText: '取消' };
    
    // 模拟用户确认
    Dialog.confirm.mockResolvedValueOnce(true);
    
    const result = await MessageService.confirm(content, title, options);
    
    expect(Dialog.confirm).toHaveBeenCalledWith({
      content,
      title,
      ...options
    });
    
    expect(result).toBe(true);
  });

  // 测试confirm方法 - 用户取消
  test('confirm方法在用户取消时应该返回false', async () => {
    const content = '确认操作?';
    
    // 模拟用户取消
    Dialog.confirm.mockRejectedValueOnce(new Error('User canceled'));
    
    const result = await MessageService.confirm(content);
    
    expect(result).toBe(false);
  });

  // 测试alert方法
  test('alert方法应该调用Dialog.alert', async () => {
    const content = '提示信息';
    const title = '提示';
    
    await MessageService.alert(content, title);
    
    expect(Dialog.alert).toHaveBeenCalledWith({
      content,
      title,
      
    });
  });
}); 