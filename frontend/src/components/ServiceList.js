import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Row, Col, Spin } from 'antd';
import ServiceCard from './ServiceCard';
import { serviceAPI } from '../service/api';

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
        const response = await serviceAPI.getServiceList();
        setServices(response.data.services || []);
      } catch (error) {
        console.error('获取服务列表失败:', error);
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