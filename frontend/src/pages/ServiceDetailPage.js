import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Toast, Skeleton } from 'antd-mobile';
import { 
  ClockCircleOutline,
  StarOutline,
  StarFill,
  HeartOutline,
  HeartFill,
  LeftOutline,
  RightOutline
} from 'antd-mobile-icons';
import AppLayout from '../components/Layout/AppLayout';
import apiClient from '../services/apiClient';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DetailContainer = styled.div`
  padding: var(--spacing-4);
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 767px) {
    padding: var(--spacing-3);
  }
`;

const ServiceHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-6);
  flex-wrap: wrap;
  
  @media (max-width: 767px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const IconContainer = styled.div`
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  background-color: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-4);
  color: var(--color-primary);
  font-size: 40px;
  
  @media (max-width: 767px) {
    margin-bottom: var(--spacing-3);
  }
`;

const ServiceInfo = styled.div`
  flex: 1;
`;

const ServiceTitle = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-2) 0;
  color: var(--text);
`;

const ServiceMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  
  .meta-item {
    display: flex;
    align-items: center;
    
    .icon {
      margin-right: var(--spacing-1);
    }
  }
`;

const ServiceActions = styled.div`
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-3);
  
  @media (min-width: 768px) {
    margin-top: 0;
  }
`;

const ActionButton = styled(Button)`
  &.adm-button {
    --border-radius: var(--radius-md);
    --border-width: 1px;
    
    &.favorite {
      --background-color: var(--color-primary-light);
      --text-color: var(--color-primary);
      --border-color: var(--color-primary);
      
      &.active {
        --background-color: var(--color-primary);
        --text-color: white;
      }
    }
  }
`;

const ContentSection = styled.section`
  margin-bottom: var(--spacing-6);
  
  h2 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-3);
    color: var(--text);
    padding-bottom: var(--spacing-2);
    border-bottom: 1px solid var(--border);
  }
  
  p {
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--text);
    margin-bottom: var(--spacing-3);
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
`;

const Tag = styled.span`
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  background-color: var(--surface-2);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
`;

const FeatureCard = styled.div`
  background-color: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
  
  h3 {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-2);
    color: var(--text);
  }
  
  p {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin: 0;
  }
`;

const RelatedServices = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4);
  
  @media (max-width: 767px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const RelatedServiceCard = styled.div`
  background-color: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  h3 {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-2);
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  p {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: var(--spacing-6);
  
  h2 {
    font-size: var(--font-size-xl);
    color: var(--text);
    margin-bottom: var(--spacing-3);
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-4);
  }
`;

const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedServices, setRelatedServices] = useState([]);
  
  // 获取服务详情
  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getToolById(id);
        setService(data);
        
        // 获取相关服务
        const allTools = await apiClient.getTools();
        // 简单实现：排除当前服务，随机获取2-4个相关服务
        const filtered = allTools.filter(tool => tool.id !== id);
        const randomRelated = filtered
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(4, filtered.length));
        setRelatedServices(randomRelated);
        
        setLoading(false);
      } catch (err) {
        console.error('获取服务详情失败:', err);
        setError(err.message || '获取服务详情失败');
        setLoading(false);
        Toast.show({
          icon: 'fail',
          content: '获取服务详情失败'
        });
      }
    };
    
    fetchServiceDetails();
    
    // 检查是否已收藏（模拟）
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.includes(id));
  }, [id]);
  
  // 处理收藏/取消收藏
  const handleToggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter(favId => favId !== id);
      Toast.show({
        icon: 'success',
        content: '已取消收藏'
      });
    } else {
      newFavorites = [...favorites, id];
      Toast.show({
        icon: 'success',
        content: '已添加到收藏'
      });
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };
  
  // 处理服务启动
  const handleStartService = () => {
    // 这里可以添加启动服务的逻辑
    Toast.show({
      icon: 'success',
      content: '服务启动成功'
    });
  };
  
  // 处理导航到相关服务
  const handleNavigateToRelated = (relatedId) => {
    navigate(`/services/${relatedId}`);
  };
  
  // 处理返回
  const handleBack = () => {
    navigate('/services');
  };
  
  // 渲染加载状态
  if (loading) {
    return (
      <AppLayout title="服务详情" showBack={true} onBack={handleBack}>
        <DetailContainer>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </DetailContainer>
      </AppLayout>
    );
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <AppLayout title="服务详情" showBack={true} onBack={handleBack}>
        <ErrorState>
          <h2>无法加载服务详情</h2>
          <p>{error}</p>
          <Button onClick={handleBack}>返回服务列表</Button>
        </ErrorState>
      </AppLayout>
    );
  }
  
  // 如果没有数据
  if (!service) {
    return (
      <AppLayout title="服务详情" showBack={true} onBack={handleBack}>
        <ErrorState>
          <h2>服务不存在</h2>
          <p>找不到ID为 {id} 的服务。</p>
          <Button onClick={handleBack}>返回服务列表</Button>
        </ErrorState>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title={service.name} showBack={true} onBack={handleBack}>
      <DetailContainer>
        <ServiceHeader>
          <IconContainer>
            {/* 服务图标 */}
            {service.icon}
          </IconContainer>
          
          <ServiceInfo>
            <ServiceTitle>{service.name}</ServiceTitle>
            <ServiceMeta>
              <div className="meta-item">
                <ClockCircleOutline className="icon" />
                <span>上线时间: {service.createdAt || '2025-05-15'}</span>
              </div>
              <div className="meta-item">
                <StarOutline className="icon" />
                <span>评分: {service.rating || '4.8'}</span>
              </div>
            </ServiceMeta>
            
            <TagsContainer>
              {(service.tags || ['AI', '智能服务', '语音交互']).map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </TagsContainer>
          </ServiceInfo>
          
          <ServiceActions>
            <ActionButton 
              className={`favorite ${isFavorite ? 'active' : ''}`}
              onClick={handleToggleFavorite}
            >
              {isFavorite ? <HeartFill /> : <HeartOutline />}
              {isFavorite ? '已收藏' : '收藏'}
            </ActionButton>
            
            <ActionButton color="primary" onClick={handleStartService}>
              开始使用
            </ActionButton>
          </ServiceActions>
        </ServiceHeader>
        
        <ContentSection>
          <h2>服务介绍</h2>
          <p>{service.description || '该服务暂无详细介绍。'}</p>
        </ContentSection>
        
        <ContentSection>
          <h2>功能特点</h2>
          <FeaturesGrid>
            {(service.features || [
              { title: '智能语音识别', description: '支持自然语言处理，准确识别用户意图' },
              { title: '多平台支持', description: '支持网页、移动端等多平台接入' },
              { title: '安全加密', description: '数据传输全程加密，保障用户隐私安全' },
              { title: '定制化服务', description: '支持个性化定制，满足不同场景需求' }
            ]).map((feature, index) => (
              <FeatureCard key={index}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </ContentSection>
        
        {relatedServices.length > 0 && (
          <ContentSection>
            <h2>相关服务</h2>
            <RelatedServices>
              {relatedServices.map((related) => (
                <RelatedServiceCard 
                  key={related.id}
                  onClick={() => handleNavigateToRelated(related.id)}
                >
                  <h3>{related.name}</h3>
                  <p>{related.description}</p>
                </RelatedServiceCard>
              ))}
            </RelatedServices>
          </ContentSection>
        )}
      </DetailContainer>
    </AppLayout>
  );
};

export default ServiceDetailPage; 