import React, { useState, useContext } from 'react';
import { Form, Input, Button } from 'antd-mobile';
import { UserOutline, LockOutline, MailOutline } from 'antd-mobile-icons';
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

const RegisterForm = ({ onLoginClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const { register, loading, error, clearError } = useContext(AuthContext);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // 表单验证
    const errors = {};
    if (!username) errors.username = '请输入用户名';
    if (!password) errors.password = '请输入密码';
    if (password.length < 6) errors.password = '密码长度不能少于6位';
    if (password !== confirmPassword) errors.confirmPassword = '两次密码输入不一致';
    if (!email) errors.email = '请输入邮箱';
    if (email && !validateEmail(email)) errors.email = '请输入有效的邮箱地址';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // 清除错误
    setFormErrors({});
    clearError();
    
    try {
      const result = await register(username, password, email);
      if (!result) {
        toast.error('注册失败，请重试');
      }
    } catch (err) {
      toast.error(err.message || '注册失败，请重试');
    }
  };

  return (
    <FormContainer>
      <Title>用户注册</Title>
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
              注册
            </Button>
            <Button
              block
              color='default'
              size='large'
              onClick={onLoginClick}
            >
              已有账号？登录
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
          label='邮箱'
          help={formErrors.email} 
          validateStatus={formErrors.email ? 'error' : ''}
        >
          <Input 
            placeholder='请输入邮箱' 
            type='email'
            value={email}
            onChange={setEmail}
            prefix={<MailOutline />}
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
        <Form.Item 
          label='确认密码'
          help={formErrors.confirmPassword} 
          validateStatus={formErrors.confirmPassword ? 'error' : ''}
        >
          <Input 
            placeholder='请再次输入密码' 
            type='password'
            value={confirmPassword}
            onChange={setConfirmPassword}
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

export default RegisterForm; 