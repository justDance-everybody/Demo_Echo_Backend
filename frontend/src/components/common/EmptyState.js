import React from 'react';
import { Button } from 'antd-mobile';
import styled from 'styled-components';
import { SearchOutline, ExclamationOutline, ContentOutline } from 'antd-mobile-icons';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
  min-height: ${props => props.fullPage ? 'calc(100vh - 100px)' : '200px'};
`;

const IconWrapper = styled.div`
  font-size: 48px;
  margin-bottom: var(--spacing-4);
  color: var(--text-secondary);
`;

const Title = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--text);
  margin-bottom: var(--spacing-2);
`;

const Description = styled.p`
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-4);
  max-width: 300px;
`;

const ActionButton = styled(Button)`
  margin-top: var(--spacing-2);
`;

/**
 * 空状态组件
 * @param {Object} props
 * @param {'no-data' | 'no-results' | 'error' | 'empty'} props.type 空状态类型
 * @param {string} props.title 标题
 * @param {string} props.description 描述
 * @param {string} props.buttonText 按钮文字
 * @param {Function} props.onButtonClick 按钮点击事件
 * @param {boolean} props.fullPage 是否全页面展示
 */
const EmptyState = ({
  type = 'empty',
  title,
  description,
  buttonText,
  onButtonClick,
  fullPage = false
}) => {
  // 根据类型设置默认值
  let defaultTitle = '';
  let defaultDescription = '';
  let icon = null;

  switch (type) {
    case 'no-data':
      defaultTitle = '暂无数据';
      defaultDescription = '当前还没有数据，请稍后再试';
      icon = <ContentOutline />;
      break;
    case 'no-results':
      defaultTitle = '无搜索结果';
      defaultDescription = '没有找到匹配的结果，请尝试其他搜索条件';
      icon = <SearchOutline />;
      break;
    case 'error':
      defaultTitle = '出错了';
      defaultDescription = '加载数据时发生错误，请重试';
      icon = <ExclamationOutline />;
      break;
    case 'empty':
    default:
      defaultTitle = '这里是空的';
      defaultDescription = '暂时没有内容可以显示';
      icon = <ContentOutline />;
      break;
  }

  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;

  return (
    <Container fullPage={fullPage}>
      <IconWrapper>{icon}</IconWrapper>
      <Title>{finalTitle}</Title>
      <Description>{finalDescription}</Description>
      {buttonText && (
        <ActionButton color="primary" onClick={onButtonClick}>
          {buttonText}
        </ActionButton>
      )}
    </Container>
  );
};

export default EmptyState; 