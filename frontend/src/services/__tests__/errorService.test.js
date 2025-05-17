import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorService from '../errorService';
import MessageService from '../../components/common/MessageService';

// 模拟MessageService
jest.mock('../../components/common/MessageService', () => ({
  error: jest.fn(),
  success: jest.fn(),
  loading: jest.fn()
}));

describe('ErrorService', () => {
  beforeEach(() => {
    // 清除所有模拟调用记录
    jest.clearAllMocks();
    // 清除控制台错误模拟
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 恢复控制台错误
    console.error.mockRestore();
  });

  // 测试处理字符串错误
  test('handleError应该正确处理字符串错误', () => {
    const errorMessage = '发生错误';
    const result = ErrorService.handleError(errorMessage);

    expect(result).toBe(errorMessage);
    expect(MessageService.error).toHaveBeenCalledWith(errorMessage);
    expect(console.error).toHaveBeenCalledWith('Error:', errorMessage);
  });

  // 测试处理Error对象
  test('handleError应该正确处理Error对象', () => {
    const error = new Error('测试错误');
    const result = ErrorService.handleError(error);

    expect(result).toBe('测试错误');
    expect(MessageService.error).toHaveBeenCalledWith('测试错误');
    expect(console.error).toHaveBeenCalledWith('Error:', error);
  });

  // 测试处理带message的对象
  test('handleError应该正确处理带message属性的对象', () => {
    const error = { message: '对象错误' };
    const result = ErrorService.handleError(error);

    expect(result).toBe('对象错误');
    expect(MessageService.error).toHaveBeenCalledWith('对象错误');
  });

  // 测试处理带data.message的对象
  test('handleError应该正确处理带data.message的对象', () => {
    const error = { data: { message: '数据错误' } };
    const result = ErrorService.handleError(error);

    expect(result).toBe('数据错误');
    expect(MessageService.error).toHaveBeenCalledWith('数据错误');
  });

  // 测试处理HTTP错误
  test('handleError应该正确处理HTTP错误响应', () => {
    // 401错误
    const error401 = { response: { status: 401 } };
    const result401 = ErrorService.handleError(error401);
    expect(result401).toBe('登录已过期，请重新登录');
    expect(MessageService.error).toHaveBeenCalledWith('登录已过期，请重新登录');
    
    jest.clearAllMocks();
    
    // 403错误
    const error403 = { response: { status: 403 } };
    const result403 = ErrorService.handleError(error403);
    expect(result403).toBe('无权限执行此操作');
    expect(MessageService.error).toHaveBeenCalledWith('无权限执行此操作');
    
    jest.clearAllMocks();
    
    // 404错误
    const error404 = { response: { status: 404 } };
    const result404 = ErrorService.handleError(error404);
    expect(result404).toBe('请求的资源不存在');
    expect(MessageService.error).toHaveBeenCalledWith('请求的资源不存在');
    
    jest.clearAllMocks();
    
    // 500错误
    const error500 = { response: { status: 500 } };
    const result500 = ErrorService.handleError(error500);
    expect(result500).toBe('服务器错误，请稍后再试');
    expect(MessageService.error).toHaveBeenCalledWith('服务器错误，请稍后再试');
    
    jest.clearAllMocks();
    
    // 带有数据消息的错误
    const errorWithData = { response: { status: 400, data: { message: '请求参数错误' } } };
    const resultWithData = ErrorService.handleError(errorWithData);
    expect(resultWithData).toBe('请求参数错误');
    expect(MessageService.error).toHaveBeenCalledWith('请求参数错误');
    
    jest.clearAllMocks();
    
    // 其他状态码
    const errorOther = { response: { status: 429 } };
    const resultOther = ErrorService.handleError(errorOther);
    expect(resultOther).toBe('请求失败 (429)');
    expect(MessageService.error).toHaveBeenCalledWith('请求失败 (429)');
  });

  // 测试不显示Toast
  test('handleError应该在showToast=false时不显示Toast', () => {
    const error = new Error('隐藏错误');
    const result = ErrorService.handleError(error, false);

    expect(result).toBe('隐藏错误');
    expect(MessageService.error).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error:', error);
  });

  // 测试处理表单错误
  test('handleFormErrors应该处理表单错误对象', () => {
    const errors = {
      username: '用户名不能为空',
      password: '密码太短'
    };

    const result = ErrorService.handleFormErrors(errors);

    // 显示第一个错误
    expect(MessageService.error).toHaveBeenCalledWith('用户名不能为空');
    expect(result).toEqual(errors);
  });

  // 测试处理网络错误
  test('handleNetworkError应该处理网络连接错误', () => {
    const networkError = new Error('Network Error');
    const result = ErrorService.handleNetworkError(networkError);

    expect(result).toBe('网络连接失败，请检查网络');
    expect(MessageService.error).toHaveBeenCalledWith('网络连接失败，请检查网络');
  });

  // 测试处理超时错误
  test('handleNetworkError应该处理请求超时错误', () => {
    const timeoutError = { code: 'ECONNABORTED' };
    const result = ErrorService.handleNetworkError(timeoutError);

    expect(result).toBe('请求超时，请稍后重试');
    expect(MessageService.error).toHaveBeenCalledWith('请求超时，请稍后重试');
  });
}); 