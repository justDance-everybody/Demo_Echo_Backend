import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar 组件测试', () => {
  test('渲染不确定进度条', () => {
    render(<ProgressBar indeterminate />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveClass('indeterminate');
  });

  test('渲染确定进度条', () => {
    render(<ProgressBar value={50} max={100} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).not.toHaveClass('indeterminate');
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle('width: 50%');
  });

  test('渲染带标签的进度条', () => {
    render(<ProgressBar value={75} max={100} showLabel />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('渲染动画进度条', () => {
    jest.useFakeTimers();
    
    render(<ProgressBar animated value={30} max={100} />);
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('animated');
    
    jest.useRealTimers();
  });

  test('通过参数改变颜色', () => {
    render(<ProgressBar value={50} max={100} color="#ff0000" />);
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle('background-color: #ff0000');
  });

  test('处理边界值', () => {
    render(<ProgressBar value={0} max={100} />);
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle('width: 0%');
    
    // 重新渲染，值为 100
    act(() => {
      render(<ProgressBar value={100} max={100} />);
    });
    
    const progressFill100 = screen.getByTestId('progress-fill');
    expect(progressFill100).toHaveStyle('width: 100%');
  });

  test('异常值处理', () => {
    // 测试负值
    render(<ProgressBar value={-10} max={100} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle('width: 0%');
    
    // 测试超过最大值
    act(() => {
      render(<ProgressBar value={150} max={100} />);
    });
    expect(screen.getByTestId('progress-fill')).toHaveStyle('width: 100%');
  });
}); 