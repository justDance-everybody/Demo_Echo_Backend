import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { AudioOutlined } from '@ant-design/icons';

const WelcomeContainer = styled.div`
  background-color: #e6f7ff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
  position: relative;
  overflow: hidden;
`;

const WelcomeTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  margin-top: 0;
`;

const WelcomeSubtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.5;
`;

const VoiceButton = styled(Button)`
  background-color: #fff;
  color: #1890ff;
  border: none;
  border-radius: 8px;
  padding: 0 32px;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover, &:focus {
    background-color: #f8f8f8;
    color: #1890ff;
  }
`;

const DeviceImages = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 160px;
  height: 100px;
  display: flex;
  justify-content: center;

  @media (max-width: 576px) {
    display: none;
  }
`;

const DeviceImage = styled.div`
  width: 75px;
  height: 75px;
  background-color: #333;
  border-radius: 12px;
  margin: 0 5px;
  opacity: 0.7;

  &:nth-child(2) {
    margin-top: 20px;
  }
`;

const WelcomeCard = ({ onStartVoice }) => {
  return (
    <WelcomeContainer>
      <DeviceImages>
        <DeviceImage />
        <DeviceImage />
      </DeviceImages>
      <WelcomeTitle>您好，我是您的智能助理</WelcomeTitle>
      <WelcomeSubtitle>遇到什么问题了吗？可以直接问我哦～</WelcomeSubtitle>
      <VoiceButton 
        icon={<AudioOutlined />} 
        size="large"
        onClick={onStartVoice}
      >
        开始语音
      </VoiceButton>
    </WelcomeContainer>
  );
};

export default WelcomeCard; 