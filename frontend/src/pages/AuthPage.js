import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { AuthContext } from '../contexts/AuthContext';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background);
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
`;

const Logo = styled.div`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-8);
  text-align: center;
`;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 如果已经登录，重定向到来源页面或首页
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };
  
  return (
    <PageContainer>
      <Logo>语音助手</Logo>
      
      {isLogin ? (
        <LoginForm onRegisterClick={toggleAuthMode} />
      ) : (
        <RegisterForm onLoginClick={toggleAuthMode} />
      )}
    </PageContainer>
  );
};

export default AuthPage; 