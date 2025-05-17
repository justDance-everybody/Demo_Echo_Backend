import React, { useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext } from '../contexts/ThemeContext';

// 主题切换按钮样式
const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background-color: ${props => props.isDark 
    ? 'var(--surface, #27293D)' 
    : 'var(--primary-color, #4FD1C5)'};
  color: ${props => props.isDark 
    ? 'var(--text, #F8F8F8)' 
    : 'white'};
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

// 图标容器
const Icon = styled.span`
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 提示文本
const Tooltip = styled.span`
  position: absolute;
  background-color: var(--surface);
  color: var(--text);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px;
    border-style: solid;
    border-color: var(--surface) transparent transparent transparent;
  }
  
  ${ToggleButton}:hover &,
  ${ToggleButton}:focus & {
    opacity: 1;
    visibility: visible;
  }
`;

const ThemeToggle = ({ themeOverride = null, toggleThemeOverride = null, id = null }) => {
  // 优先使用传入的覆盖属性，这样在测试中可以直接传入模拟值
  // 如果没有覆盖属性，则使用上下文中的值
  const contextValue = useContext(ThemeContext);
  const theme = themeOverride || contextValue?.theme;
  const toggleTheme = toggleThemeOverride || contextValue?.toggleTheme;
  
  const isDark = theme?.isDark;
  const tooltipText = isDark ? '切换到亮色模式' : '切换到暗色模式';
  
  return (
    <ToggleButton 
      onClick={toggleTheme}
      aria-label={tooltipText}
      isDark={isDark}
      id={id}
    >
      <Tooltip>{tooltipText}</Tooltip>
      <Icon aria-hidden="true">
        {isDark ? '🌙' : '☀️'}
      </Icon>
    </ToggleButton>
  );
};

export default ThemeToggle; 