import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Card, Tag, Button } from 'antd-mobile';
import { SetOutline, SoundOutline, ContentOutline, RightOutline } from 'antd-mobile-icons';

// 共享样式
const cardStyles = css`
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--surface);
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
`;

// 网格卡片样式
const GridCard = styled(Card)`
  ${cardStyles}
  
  .adm-card-header {
    border-bottom: 1px solid var(--border);
  }
  
  .adm-card-header-title {
    font-weight: var(--font-weight-medium);
    color: var(--text);
  }
  
  .adm-card-body {
    padding: var(--spacing-3);
  }
`;

// 列表卡片样式
const ListCardContainer = styled.div`
  ${cardStyles}
  display: flex;
  padding: var(--spacing-3);
  cursor: pointer;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ListIconSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  margin-right: var(--spacing-3);
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-2);
    margin-right: 0;
  }
`;

const ListContentSection = styled.div`
  flex-grow: 1;
`;

const ListActionSection = styled.div`
  display: flex;
  align-items: center;
  margin-left: var(--spacing-3);
  color: var(--text-secondary);
  
  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: var(--spacing-2);
    justify-content: flex-end;
  }
`;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
  font-weight: var(--font-weight-medium);
  color: var(--text);
  
  .icon {
    margin-right: var(--spacing-2);
    color: var(--color-primary);
  }
`;

const Description = styled.div`
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin: var(--spacing-2) 0;
  ${props => props.viewMode === 'list' ? `
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  ` : ''}
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin-top: var(--spacing-2);
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
`;

const ListInfoSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
  
  .provider {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
`;

/**
 * 获取服务图标
 * @param {string} type 服务类型
 * @returns {JSX.Element} 图标组件
 */
const getServiceIcon = (type) => {
  switch (type) {
    case 'voice':
      return <SoundOutline className="icon" />;
    case 'content':
      return <ContentOutline className="icon" />;
    default:
      return <SetOutline className="icon" />;
  }
};

/**
 * 服务卡片组件
 * @param {Object} props
 * @param {string} props.id 服务ID
 * @param {string} props.title 服务标题
 * @param {string} props.description 服务描述
 * @param {Array<string>} props.tags 标签
 * @param {string} props.type 服务类型
 * @param {string} props.provider 服务提供者
 * @param {Function} props.onClick 点击事件
 * @param {string} props.viewMode 视图模式 'grid' 或 'list'
 */
const ServiceCard = ({
  id,
  title,
  description,
  tags = [],
  type = 'default',
  provider = '系统',
  onClick,
  viewMode = 'grid'
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    } else {
      // 默认导航到服务详情页
      navigate(`/services/${id}`);
    }
  };

  if (viewMode === 'list') {
    return (
      <ListCardContainer onClick={handleClick}>
        <ListIconSection>
          {getServiceIcon(type)}
        </ListIconSection>
        
        <ListContentSection>
          <ServiceTitle>{title}</ServiceTitle>
          <Description viewMode={viewMode}>{description}</Description>
          
          <ListInfoSection>
            <div className="provider">提供者: {provider}</div>
            
            {tags && tags.length > 0 && (
              <TagsContainer>
                {tags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} color="primary" fill="outline" size="small">
                    {tag}
                  </Tag>
                ))}
                {tags.length > 3 && (
                  <Tag color="primary" fill="outline" size="small">
                    +{tags.length - 3}
                  </Tag>
                )}
              </TagsContainer>
            )}
          </ListInfoSection>
        </ListContentSection>
        
        <ListActionSection>
          <RightOutline fontSize={20} />
        </ListActionSection>
      </ListCardContainer>
    );
  }

  // Grid 视图
  return (
    <GridCard 
      title={
        <ServiceTitle>
          {getServiceIcon(type)}
          {title}
        </ServiceTitle>
      }
      onClick={handleClick}
    >
      <Description>{description}</Description>
      
      <TagsContainer>
        {tags.map((tag, index) => (
          <Tag key={index} color="primary" fill="outline" size="small">
            {tag}
          </Tag>
        ))}
      </TagsContainer>
      
      <Footer>
        <span>提供者: {provider}</span>
        <Button 
          size="mini" 
          color="primary"
          fill="none"
        >
          查看详情
        </Button>
      </Footer>
    </GridCard>
  );
};

export default ServiceCard; 