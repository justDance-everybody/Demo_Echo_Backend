import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Modal, { ConfirmModal, Button } from '../Modal';

// 模拟portal容器
beforeEach(() => {
  // 清理body内容，确保每个测试都有干净的DOM环境
  document.body.innerHTML = '';
});

describe('Modal组件', () => {
  // 基本渲染测试
  test('当isOpen为true时应该渲染Modal', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={() => {}} 
        title="测试标题"
      >
        <div>测试内容</div>
      </Modal>
    );
    
    expect(screen.getByText('测试标题')).toBeInTheDocument();
    expect(screen.getByText('测试内容')).toBeInTheDocument();
  });
  
  // 不显示测试
  test('当isOpen为false时不应该渲染Modal', () => {
    render(
      <Modal 
        isOpen={false} 
        onClose={() => {}} 
        title="测试标题"
      >
        <div>测试内容</div>
      </Modal>
    );
    
    expect(screen.queryByText('测试标题')).not.toBeInTheDocument();
    expect(screen.queryByText('测试内容')).not.toBeInTheDocument();
  });
  
  // 关闭按钮测试
  test('点击关闭按钮应该调用onClose', async () => {
    const onCloseMock = jest.fn();
    
    render(
      <Modal 
        isOpen={true} 
        onClose={onCloseMock} 
        title="测试标题"
      >
        <div>测试内容</div>
      </Modal>
    );
    
    // 查找并点击关闭按钮
    const closeButton = screen.getByRole('button');
    userEvent.click(closeButton);
    
    // 验证onClose被调用
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
  
  // 点击背景关闭测试
  test('点击背景应该关闭Modal', async () => {
    const onCloseMock = jest.fn();
    
    render(
      <Modal 
        isOpen={true} 
        onClose={onCloseMock} 
        title="测试标题"
      >
        <div>测试内容</div>
      </Modal>
    );
    
    // 获取Modal背景元素并点击
    const overlay = document.querySelector('div[role="dialog"]') || document.querySelector('div:first-child');
    userEvent.click(overlay);
    
    // 验证onClose被调用
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
  
  // ESC键关闭测试
  test('按ESC键应该关闭Modal', async () => {
    const onCloseMock = jest.fn();
    
    render(
      <Modal 
        isOpen={true} 
        onClose={onCloseMock} 
        title="测试标题"
      >
        <div>测试内容</div>
      </Modal>
    );
    
    // 模拟按下ESC键
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // 验证onClose被调用
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
  
  // 页脚渲染测试
  test('应该正确渲染页脚', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={() => {}} 
        title="测试标题"
        footer={<Button>测试按钮</Button>}
      >
        <div>测试内容</div>
      </Modal>
    );
    
    expect(screen.getByText('测试按钮')).toBeInTheDocument();
  });
});

describe('ConfirmModal组件', () => {
  // 基本渲染测试
  test('应该正确渲染确认对话框', () => {
    render(
      <ConfirmModal 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={() => {}}
        title="确认操作"
      >
        <div>是否确认此操作？</div>
      </ConfirmModal>
    );
    
    expect(screen.getByText('确认操作')).toBeInTheDocument();
    expect(screen.getByText('是否确认此操作？')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });
  
  // 确认按钮测试
  test('点击确认按钮应该调用onConfirm', async () => {
    const onConfirmMock = jest.fn();
    
    render(
      <ConfirmModal 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={onConfirmMock}
        title="确认操作"
      >
        <div>是否确认此操作？</div>
      </ConfirmModal>
    );
    
    // 查找并点击确认按钮
    const confirmButton = screen.getByText('确认');
    userEvent.click(confirmButton);
    
    // 验证onConfirm被调用
    await waitFor(() => {
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    });
  });
  
  // 取消按钮测试
  test('点击取消按钮应该调用onClose', async () => {
    const onCloseMock = jest.fn();
    
    render(
      <ConfirmModal 
        isOpen={true} 
        onClose={onCloseMock} 
        onConfirm={() => {}}
        title="确认操作"
      >
        <div>是否确认此操作？</div>
      </ConfirmModal>
    );
    
    // 查找并点击取消按钮
    const cancelButton = screen.getByText('取消');
    userEvent.click(cancelButton);
    
    // 验证onClose被调用
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
  
  // 自定义按钮文本测试
  test('应该正确使用自定义按钮文本', () => {
    render(
      <ConfirmModal 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={() => {}}
        title="确认操作"
        confirmText="同意"
        cancelText="拒绝"
      >
        <div>是否确认此操作？</div>
      </ConfirmModal>
    );
    
    expect(screen.getByText('同意')).toBeInTheDocument();
    expect(screen.getByText('拒绝')).toBeInTheDocument();
  });
}); 