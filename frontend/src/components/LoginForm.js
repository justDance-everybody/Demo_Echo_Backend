import React, { useState, useContext } from 'react';
import { Form, Input, Button } from 'antd-mobile';
import { UserOutline, LockOutline } from 'antd-mobile-icons';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from './common/Toast';
import styled from 'styled-components';

const FormContainer = styled.div`
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: var(--spacing-4);
`;

const StyledForm = styled(Form)`
  .adm-list-body {
    background-color: var(--surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
  }

  .adm-list-item {
    background-color: var(--surface);
    border-bottom-color: var(--border);
  }

  .adm-list-item-content {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .adm-form-item-label {
    font-weight: var(--font-weight-medium);
    color: var(--text);
  }

  .adm-input {
    color: var(--text);
  }
`;

const ButtonGroup = styled.div`
  margin-top: var(--spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: var(--spacing-6);
  color: var(--text);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-2xl);
`;

const LoginForm = ({ onRegisterClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const { login, loading, error, clearError } = useContext(AuthContext);

  const handleSubmit = async () => {
    // 表单验证
    const errors = {};
    if (!username) errors.username = '请输入用户名';
    if (!password) errors.password = '请输入密码';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // 清除错误
    setFormErrors({});
    clearError();
    
    try {
      const result = await login(username, password);
      if (!result) {
        toast.error('登录失败，请检查用户名和密码');
      }
    } catch (err) {
      toast.error(err.message || '登录失败，请重试');
    }
  };

  return (
    <FormContainer>
      <Title>用户登录</Title>
      <StyledForm
        layout='horizontal'
        footer={
          <ButtonGroup>
            <Button 
              block 
              color='primary' 
              size='large'
              loading={loading}
              onClick={handleSubmit}
            >
              登录
            </Button>
            <Button
              block
              color='default'
              size='large'
              onClick={onRegisterClick}
            >
              没有账号？注册
            </Button>
          </ButtonGroup>
        }
      >
        <Form.Item 
          label='用户名'
          help={formErrors.username} 
          validateStatus={formErrors.username ? 'error' : ''}
        >
          <Input 
            placeholder='请输入用户名' 
            value={username}
            onChange={setUsername}
            prefix={<UserOutline />}
          />
        </Form.Item>
        <Form.Item 
          label='密码'
          help={formErrors.password} 
          validateStatus={formErrors.password ? 'error' : ''}
        >
          <Input 
            placeholder='请输入密码' 
            type='password'
            value={password}
            onChange={setPassword}
            prefix={<LockOutline />}
          />
        </Form.Item>
      </StyledForm>
      
      {error && (
        <div style={{ 
          color: 'var(--color-error)', 
          textAlign: 'center', 
          marginTop: 'var(--spacing-3)' 
        }}>
          {error}
        </div>
      )}
    </FormContainer>
  );
};

export default LoginForm; 