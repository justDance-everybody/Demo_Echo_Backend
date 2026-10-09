import React from 'react';
import { DotLoading } from 'antd-mobile';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: ${props => props.fullScreen ? '100vh' : '100px'};
  background-color: var(--background);
  opacity: ${props => props.overlay ? 0.9 : 1};
  position: ${props => props.overlay ? 'fixed' : 'relative'};
  top: ${props => props.overlay ? 0 : 'auto'};
  left: ${props => props.overlay ? 0 : 'auto'};
  right: ${props => props.overlay ? 0 : 'auto'};
  bottom: ${props => props.overlay ? 0 : 'auto'};
  z-index: ${props => props.overlay ? 'var(--z-index-modal)' : 'auto'};
`;

const Text = styled.div`
  font-size: var(--font-size-md);
  color: var(--text);
  margin-top: var(--spacing-2);
`;

/**
 * 加载指示器组件
 * @param {Object} props
 * @param {string} props.text 加载文字
 * @param {boolean} props.fullScreen 是否全屏显示
 * @param {boolean} props.overlay 是否显示为覆盖层
 */
const LoadingSpinner = ({ text = '加载中', fullScreen = false, overlay = false }) => {
  return (
    <LoadingContainer fullScreen={fullScreen} overlay={overlay}>
      <DotLoading color="primary" />
      {text && <Text>{text}</Text>}
    </LoadingContainer>
  );
};

/**
 * 页面级加载指示器
 */
export const PageLoading = ({ text = '页面加载中' }) => (
  <LoadingSpinner text={text} fullScreen={true} />
);

/**
 * 覆盖层加载指示器
 */
export const OverlayLoading = ({ text = '处理中' }) => (
  <LoadingSpinner text={text} fullScreen={true} overlay={true} />
);

export default LoadingSpinner; 