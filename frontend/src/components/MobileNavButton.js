import React from 'react';
import styled from 'styled-components';
import './MobileNavButton.css';

const ButtonContainer = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-primary);
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1060;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const MobileNavButton = ({ isOpen, onClick }) => {
  return (
    <ButtonContainer
      onClick={onClick}
      aria-label={isOpen ? "关闭导航菜单" : "打开导航菜单"}
      className={isOpen ? "open" : ""}
    >
      <div className="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </ButtonContainer>
  );
};

export default MobileNavButton; 