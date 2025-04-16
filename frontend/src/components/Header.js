import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { Switch, Button } from 'antd';
import { AudioOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import { ThemeContext } from '../theme/ThemeProvider';
import VoiceDialog from './VoiceDialog';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: ${props => props.theme.headerBackground};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.primaryColor};
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ThemeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ThemeIcon = styled.span`
  color: ${props => props.theme.textColor};
  font-size: 16px;
`;

const Header = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  const handleThemeChange = () => {
    toggleTheme();
  };

  const openVoiceDialog = () => {
    setVoiceDialogOpen(true);
  };

  const closeVoiceDialog = () => {
    setVoiceDialogOpen(false);
  };

  return (
    <HeaderContainer>
      <Logo>Echo</Logo>
      <Controls>
        <Button 
          type="primary" 
          icon={<AudioOutlined />}
          shape="circle"
          onClick={openVoiceDialog}
        />
        <ThemeToggle>
          <ThemeIcon>
            {theme === 'dark' ? <BulbOutlined /> : <BulbFilled />}
          </ThemeIcon>
          <Switch 
            checked={theme === 'dark'} 
            onChange={handleThemeChange} 
          />
        </ThemeToggle>
      </Controls>

      {voiceDialogOpen && (
        <VoiceDialog onClose={closeVoiceDialog} />
      )}
    </HeaderContainer>
  );
};

export default Header; 