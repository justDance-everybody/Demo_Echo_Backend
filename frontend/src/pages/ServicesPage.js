import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import ServiceList from '../components/common/ServiceList';
import { PageLoading } from '../components/common/LoadingSpinner';
import { toast } from '../components/common/Toast';
import AppLayout from '../components/Layout/AppLayout';
import apiClient from '../services/apiClient';

const Content = styled.div`
  padding: var(--spacing-4);
`;

// 本地存储key
const ViewPreferencesKey = 'service_view_preferences';

/**
 * 服务页面
 */
const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // 从本地存储中获取视图偏好
  const loadViewPreferences = () => {
    try {
      const saved = localStorage.getItem(ViewPreferencesKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('无法加载视图偏好:', err);
    }
    
    // 默认偏好
    return {
      viewMode: 'grid',
      sortBy: 'newest'
    };
  };
  
  // 保存视图偏好到本地存储
  const saveViewPreferences = (preferences) => {
    try {
      localStorage.setItem(ViewPreferencesKey, JSON.stringify(preferences));
    } catch (err) {
      console.error('无法保存视图偏好:', err);
    }
  };
  
  // 初始视图偏好
  const [viewPreferences, setViewPreferences] = useState(loadViewPreferences());
  
  // 更新视图偏好
  const updateViewPreferences = (updates) => {
    const newPreferences = { ...viewPreferences, ...updates };
    setViewPreferences(newPreferences);
    saveViewPreferences(newPreferences);
  };
  
  // 加载服务
  const loadServices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const tools = await apiClient.getTools();
      
      // 将工具数据转换为服务格式
      const mappedServices = tools.map(tool => ({
        id: tool.id || tool.tool_id,
        title: tool.name || tool.title,
        description: tool.description,
        tags: tool.tags || [],
        type: tool.type || 'default',
        provider: tool.provider || '系统',
        createdAt: tool.created_at || new Date().toISOString(),
        rating: tool.rating || (Math.random() * 2 + 3).toFixed(1) // 仅用于演示，实际中应使用工具的真实评分
      }));
      
      setServices(mappedServices);
    } catch (err) {
      console.error('加载服务失败:', err);
      setError('获取服务列表失败，请稍后重试');
      toast.error('获取服务列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理服务点击
  const handleServiceClick = (serviceId) => {
    // 导航到服务详情页
    navigate(`/services/${serviceId}`);
  };
  
  // 处理视图模式变更
  const handleViewModeChange = (mode) => {
    updateViewPreferences({ viewMode: mode });
  };
  
  // 初始加载
  useEffect(() => {
    loadServices();
  }, []);
  
  return (
    <AppLayout
      title="服务中心"
      showTabBar={true}
      showSideNav={true}
    >
      <ServiceList 
        services={services}
        loading={loading}
        error={error}
        onServiceClick={handleServiceClick}
        onRetry={loadServices}
        defaultView={viewPreferences.viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </AppLayout>
  );
};

export default ServicesPage; 