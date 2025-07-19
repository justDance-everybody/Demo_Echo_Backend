// 配置化UI组件库 - 统一管理常用UI组件

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { UI_CONFIG } from '../../config/uiConfig';
import { COMPONENT_LAYOUTS, ANIMATION_LAYOUTS } from '../../styles/layouts';

// 基础按钮组件
export const Button = styled(motion.button)`
  padding: ${props => {
    switch (props.size) {
      case 'small': return `${UI_CONFIG.spacing.xsmall} ${UI_CONFIG.spacing.small}`;
      case 'large': return `${UI_CONFIG.spacing.medium} ${UI_CONFIG.spacing.large}`;
      default: return `${UI_CONFIG.spacing.small} ${UI_CONFIG.spacing.medium}`;
    }
  }};
  
  border: none;
  border-radius: ${UI_CONFIG.borderRadius.medium};
  font-size: ${props => {
    switch (props.size) {
      case 'small': return UI_CONFIG.typography.sizes.small;
      case 'large': return UI_CONFIG.typography.sizes.large;
      default: return UI_CONFIG.typography.sizes.medium;
    }
  }};
  font-weight: ${UI_CONFIG.typography.weights.medium};
  cursor: pointer;
  transition: ${UI_CONFIG.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${UI_CONFIG.spacing.xsmall};
  min-height: 40px;
  
  // 变体样式
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--color-primary);
          color: var(--color-buttonText);
          
          &:hover:not(:disabled) {
            background: var(--color-primaryHover);
            transform: translateY(-1px);
          }
        `;
      case 'secondary':
        return `
          background: var(--color-backgroundSecondary);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          
          &:hover:not(:disabled) {
            background: var(--color-backgroundTertiary);
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background: var(--color-error);
          color: white;
          
          &:hover:not(:disabled) {
            background: var(--color-errorHover);
            transform: translateY(-1px);
          }
        `;
      case 'warning':
        return `
          background: var(--color-warning);
          color: white;
          
          &:hover:not(:disabled) {
            background: var(--color-warningHover);
            transform: translateY(-1px);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          
          &:hover:not(:disabled) {
            background: var(--color-primary);
            color: var(--color-buttonText);
          }
        `;
      default:
        return `
          background: var(--color-backgroundSecondary);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

// 卡片组件
export const Card = styled(motion.div)`
  ${COMPONENT_LAYOUTS.card};
  
  ${props => props.hoverable && `
    cursor: pointer;
    transition: ${UI_CONFIG.transitions.medium};
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
  `}
`;

// 输入框组件
export const Input = styled.input`
  padding: ${UI_CONFIG.spacing.small} ${UI_CONFIG.spacing.medium};
  border: 1px solid var(--color-border);
  border-radius: ${UI_CONFIG.borderRadius.medium};
  background: var(--color-background);
  color: var(--color-text);
  font-size: ${UI_CONFIG.typography.sizes.medium};
  transition: ${UI_CONFIG.transitions.fast};
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--color-backgroundSecondary);
  }
  
  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

// 文本区域组件
export const Textarea = styled.textarea`
  padding: ${UI_CONFIG.spacing.small} ${UI_CONFIG.spacing.medium};
  border: 1px solid var(--color-border);
  border-radius: ${UI_CONFIG.borderRadius.medium};
  background: var(--color-background);
  color: var(--color-text);
  font-size: ${UI_CONFIG.typography.sizes.medium};
  font-family: inherit;
  transition: ${UI_CONFIG.transitions.fast};
  width: 100%;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--color-backgroundSecondary);
  }
  
  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

// 标签组件
export const Label = styled.label`
  display: block;
  font-size: ${UI_CONFIG.typography.sizes.small};
  font-weight: ${UI_CONFIG.typography.weights.medium};
  color: var(--color-text);
  margin-bottom: ${UI_CONFIG.spacing.xsmall};
`;

// 表单字段组件
export const FormField = styled.div`
  ${COMPONENT_LAYOUTS.form.field};
`;

// 表单组件
export const Form = styled.form`
  ${COMPONENT_LAYOUTS.form};
`;

// 模态框覆盖层
export const ModalOverlay = styled(motion.div)`
  ${COMPONENT_LAYOUTS.modal};
  ${COMPONENT_LAYOUTS.modal.overlay};
  backdrop-filter: blur(4px);
`;

// 模态框内容
export const ModalContent = styled(motion.div)`
  ${COMPONENT_LAYOUTS.modal.content};
  max-width: ${props => props.maxWidth || '500px'};
  width: 90%;
`;

// 分隔线组件
export const Divider = styled.hr`
  border: none;
  height: 1px;
  background: var(--color-border);
  margin: ${UI_CONFIG.spacing.medium} 0;
`;

// 加载指示器组件
export const LoadingSpinner = styled(motion.div)`
  width: ${props => props.size || '24px'};
  height: ${props => props.size || '24px'};
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// 徽章组件
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${UI_CONFIG.spacing.xsmall} ${UI_CONFIG.spacing.small};
  font-size: ${UI_CONFIG.typography.sizes.xsmall};
  font-weight: ${UI_CONFIG.typography.weights.medium};
  border-radius: ${UI_CONFIG.borderRadius.full};
  
  ${props => {
    switch (props.variant) {
      case 'success':
        return `
          background: var(--color-success);
          color: white;
        `;
      case 'warning':
        return `
          background: var(--color-warning);
          color: white;
        `;
      case 'error':
        return `
          background: var(--color-error);
          color: white;
        `;
      case 'info':
        return `
          background: var(--color-info);
          color: white;
        `;
      default:
        return `
          background: var(--color-backgroundSecondary);
          color: var(--color-text);
        `;
    }
  }}
`;

// 工具提示组件
export const Tooltip = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-backgroundTertiary);
    color: var(--color-text);
    padding: ${UI_CONFIG.spacing.xsmall} ${UI_CONFIG.spacing.small};
    border-radius: ${UI_CONFIG.borderRadius.small};
    font-size: ${UI_CONFIG.typography.sizes.xsmall};
    white-space: nowrap;
    z-index: 1000;
    box-shadow: var(--shadow-md);
  }
`;

// 状态指示器组件
export const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${UI_CONFIG.spacing.small};
  padding: ${UI_CONFIG.spacing.small} ${UI_CONFIG.spacing.medium};
  border-radius: ${UI_CONFIG.borderRadius.medium};
  font-size: ${UI_CONFIG.typography.sizes.small};
  
  ${props => {
    switch (props.status) {
      case 'success':
        return `
          background: rgba(var(--color-success-rgb), 0.1);
          color: var(--color-success);
          border: 1px solid rgba(var(--color-success-rgb), 0.2);
        `;
      case 'warning':
        return `
          background: rgba(var(--color-warning-rgb), 0.1);
          color: var(--color-warning);
          border: 1px solid rgba(var(--color-warning-rgb), 0.2);
        `;
      case 'error':
        return `
          background: rgba(var(--color-error-rgb), 0.1);
          color: var(--color-error);
          border: 1px solid rgba(var(--color-error-rgb), 0.2);
        `;
      case 'info':
        return `
          background: rgba(var(--color-info-rgb), 0.1);
          color: var(--color-info);
          border: 1px solid rgba(var(--color-info-rgb), 0.2);
        `;
      default:
        return `
          background: var(--color-backgroundSecondary);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        `;
    }
  }}
`;

// 动画容器组件
export const AnimatedContainer = ({ animation = 'slideIn', children, ...props }) => {
  const animationConfig = ANIMATION_LAYOUTS[animation] || ANIMATION_LAYOUTS.slideIn;
  
  return (
    <motion.div
      {...animationConfig}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// 响应式容器组件
export const ResponsiveContainer = styled.div`
  width: 100%;
  padding-left: ${UI_CONFIG.spacing.medium};
  padding-right: ${UI_CONFIG.spacing.medium};
  margin-left: auto;
  margin-right: auto;
  
  @media (min-width: 768px) {
    padding-left: ${UI_CONFIG.spacing.large};
    padding-right: ${UI_CONFIG.spacing.large};
    max-width: 1024px;
  }
  
  @media (min-width: 1024px) {
    padding-left: ${UI_CONFIG.spacing.xlarge};
    padding-right: ${UI_CONFIG.spacing.xlarge};
    max-width: 1200px;
  }
`;

// Flex布局组件
export const Flex = styled.div`
  display: flex;
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  flex-direction: ${props => props.direction || 'row'};
  flex-wrap: ${props => props.wrap || 'nowrap'};
  gap: ${props => props.gap || '0'};
`;

// Grid布局组件
export const Grid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || '1fr'};
  gap: ${props => props.gap || UI_CONFIG.spacing.medium};
  align-items: ${props => props.align || 'stretch'};
  justify-items: ${props => props.justify || 'stretch'};
`;

// 文本组件
export const Text = styled.span`
  color: ${props => {
    switch (props.variant) {
      case 'primary': return 'var(--color-primary)';
      case 'secondary': return 'var(--color-textSecondary)';
      case 'success': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'error': return 'var(--color-error)';
      case 'info': return 'var(--color-info)';
      default: return 'var(--color-text)';
    }
  }};
  
  font-size: ${props => {
    switch (props.size) {
      case 'xsmall': return UI_CONFIG.typography.sizes.xsmall;
      case 'small': return UI_CONFIG.typography.sizes.small;
      case 'large': return UI_CONFIG.typography.sizes.large;
      case 'xlarge': return UI_CONFIG.typography.sizes.xlarge;
      default: return UI_CONFIG.typography.sizes.medium;
    }
  }};
  
  font-weight: ${props => {
    switch (props.weight) {
      case 'light': return UI_CONFIG.typography.weights.light;
      case 'medium': return UI_CONFIG.typography.weights.medium;
      case 'semibold': return UI_CONFIG.typography.weights.semibold;
      case 'bold': return UI_CONFIG.typography.weights.bold;
      default: return UI_CONFIG.typography.weights.normal;
    }
  }};
`;

// 标题组件
export const Heading = styled.h1`
  color: var(--color-text);
  font-weight: ${UI_CONFIG.typography.weights.semibold};
  line-height: ${UI_CONFIG.typography.lineHeights.tight};
  margin: 0;
  
  font-size: ${props => {
    switch (props.level) {
      case 1: return UI_CONFIG.typography.sizes.xxlarge;
      case 2: return UI_CONFIG.typography.sizes.xlarge;
      case 3: return UI_CONFIG.typography.sizes.large;
      case 4: return UI_CONFIG.typography.sizes.medium;
      case 5: return UI_CONFIG.typography.sizes.small;
      case 6: return UI_CONFIG.typography.sizes.xsmall;
      default: return UI_CONFIG.typography.sizes.xlarge;
    }
  }};
`;

// 导出所有组件
export default {
  Button,
  Card,
  Input,
  Textarea,
  Label,
  FormField,
  Form,
  ModalOverlay,
  ModalContent,
  Divider,
  LoadingSpinner,
  Badge,
  Tooltip,
  StatusIndicator,
  AnimatedContainer,
  ResponsiveContainer,
  Flex,
  Grid,
  Text,
  Heading
};