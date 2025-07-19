import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Row, Col, Spin } from 'antd';
import ServiceCard from './ServiceCard';
import apiClient from '../services/apiClient';

const ServiceListContainer = styled.div`
  margin-top: 24px;
`;

const ServiceTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.textColor};
  margin-bottom: 20px;
  margin-top: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

const ServiceList = ({ onServiceSelect }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getServices();
        setServices(response.data.services || []);
      } catch (error) {
        console.error('获取服务列表失败:', error);
        // 提供默认服务列表作为后备
        setServices([
          {
            id: 'voice-translate',
            name: '同声传译',
            icon: 'translate',
            description: '即时语音翻译，支持多语种',
            color: 'var(--color-primary-light)',
          },
          {
            id: 'blockchain-transfer',
            name: '链上转账',
            icon: 'money',
            description: '语音控制，链上转账更便捷',
            color: 'var(--color-primary-light)',
          },
          {
            id: 'asset-check',
            name: '资产查询',
            icon: 'wallet',
            description: '语音查询余额，交易记录一目了然',
            color: 'var(--color-primary-light)',
          },
          {
            id: 'defi-assistant',
            name: 'DeFi 助手',
            icon: 'chart',
            description: '智能 DeFi 收益管理，语音操控',
            color: 'var(--color-primary-light)',
          },
          {
            id: 'nft-manager',
            name: 'NFT 管家',
            icon: 'picture',
            description: '语音管理 NFT，交易行情查看',
            color: 'var(--color-primary-light)',
          },
          {
            id: 'more-services',
            name: '查看更多',
            icon: 'more',
            description: '更多服务即将上线',
            color: 'var(--color-primary-light)',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleServiceClick = (service) => {
    if (onServiceSelect) {
      onServiceSelect(service);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spin size="large" tip="加载服务列表..." />
      </LoadingContainer>
    );
  }

  return (
    <ServiceListContainer>
      <ServiceTitle>AI-Agent LaunchPad</ServiceTitle>
      <Row gutter={[16, 16]}>
        {services.map((service) => (
          <Col key={service.id} xs={12} sm={8} md={8} lg={8} xl={8}>
            <ServiceCard service={service} onClick={handleServiceClick} />
          </Col>
        ))}
      </Row>
    </ServiceListContainer>
  );
};

export default ServiceList;