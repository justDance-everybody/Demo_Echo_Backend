import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  List,
  Avatar,
  Button,
  Dialog,
  Toast
} from 'antd-mobile';
import {
  UserOutline,
  SetOutline,
  SoundOutline,
  LockOutline,
  MessageOutline,
  GlobalOutline
} from 'antd-mobile-icons';
import styled from 'styled-components';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../theme/ThemeProvider';

const UserCenterContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background);
`;

const UserHeader = styled.div`
  padding: var(--spacing-6) var(--spacing-4);
  text-align: center;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
`;

const UserAvatar = styled(Avatar)`
  width: 80px;
  height: 80px;
  margin-bottom: var(--spacing-3);
`;

const Username = styled.div`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text);
  margin-bottom: var(--spacing-1);
`;

const UserEmail = styled.div`
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
`;

const SettingsList = styled(List)`
  margin-top: var(--spacing-4);
  
  .adm-list-item {
    background-color: var(--surface);
    border-bottom-color: var(--border);
  }
  
  .adm-list-item-content-main {
    color: var(--text);
  }
  
  .adm-list-item-description {
    color: var(--text-secondary);
  }
`;

const LogoutButton = styled(Button)`
  margin: var(--spacing-6) var(--spacing-4);
`;

const UserCenter = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Dialog.confirm({
      content: '确定要退出登录吗？',
    });
    
    if (result) {
      logout();
      Toast.show({
        icon: 'success',
        content: '已退出登录',
      });
      navigate('/');
    }
  };

  return (
    <UserCenterContainer>
      <NavBar onBack={() => navigate('/')} backArrow={true}>
        个人中心
      </NavBar>
      
      <UserHeader>
        <UserAvatar src={user?.avatar || ''}>
          {!user?.avatar && <UserOutline fontSize={40} />}
        </UserAvatar>
        <Username>{user?.username || '用户'}</Username>
        <UserEmail>{user?.email || 'user@example.com'}</UserEmail>
      </UserHeader>
      
      <SettingsList header='设置'>
        <List.Item 
          prefix={<SoundOutline />} 
          onClick={() => navigate('/settings/voice')}
          arrow={true}
        >
          语音设置
          <List.Item.Description>调整语音识别和语音合成参数</List.Item.Description>
        </List.Item>
        
        <List.Item 
          prefix={<SetOutline />}
          onClick={toggleTheme}
          extra={theme === 'light' ? '浅色' : '深色'}
        >
          主题模式
          <List.Item.Description>切换浅色/深色主题</List.Item.Description>
        </List.Item>
        
        <List.Item 
          prefix={<LockOutline />}
          onClick={() => navigate('/settings/security')}
          arrow={true}
        >
          账户安全
          <List.Item.Description>修改密码、绑定手机</List.Item.Description>
        </List.Item>
        
        <List.Item 
          prefix={<MessageOutline />}
          onClick={() => navigate('/settings/notifications')}
          arrow={true}
        >
          消息通知
          <List.Item.Description>设置消息提醒方式</List.Item.Description>
        </List.Item>
        
        <List.Item 
          prefix={<GlobalOutline />}
          onClick={() => navigate('/settings/language')}
          arrow={true}
        >
          语言设置
          <List.Item.Description>切换界面语言</List.Item.Description>
        </List.Item>
      </SettingsList>
      
      <LogoutButton 
        block 
        color='danger'
        size='large'
        onClick={handleLogout}
      >
        退出登录
      </LogoutButton>
    </UserCenterContainer>
  );
};

export default UserCenter; 