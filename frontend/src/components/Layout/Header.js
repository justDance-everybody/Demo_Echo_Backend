import React from 'react';
import styled from 'styled-components';
import { MenuOutlined } from '@ant-design/icons';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: ${props => props.theme.headerBackground};
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.primaryColor};
  font-family: 'SF Pro Display', -apple-system, sans-serif;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: ${props => props.theme.textColor};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  
  &:hover {
    color: ${props => props.theme.primaryColor};
  }
`;

const Header = ({ onMenuClick }) => {
  return (
    <HeaderContainer>
      <Logo>VocVerse AI</Logo>
      <MenuButton onClick={onMenuClick}>
        <MenuOutlined />
      </MenuButton>
    </HeaderContainer>
  );
};

export default Header; 