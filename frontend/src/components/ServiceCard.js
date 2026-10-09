import React from 'react';
import styled from 'styled-components';
import { TranslationOutlined, DollarOutlined, WalletOutlined, LineChartOutlined, PictureOutlined, EllipsisOutlined } from '@ant-design/icons';

const CardContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px ${props => props.theme.shadowColor};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px ${props => props.theme.shadowColor};
  }
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: ${props => props.color || props.theme.iconBackground};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  
  svg {
    font-size: 28px;
    color: white;
  }
`;

const ServiceTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
  color: ${props => props.theme.textColor};
`;

const ServiceDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textColor}99;
  margin: 0;
  line-height: 1.4;
`;

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'translate':
      return <TranslationOutlined />;
    case 'money':
      return <DollarOutlined />;
    case 'wallet':
      return <WalletOutlined />;
    case 'chart':
      return <LineChartOutlined />;
    case 'picture':
      return <PictureOutlined />;
    case 'more':
      return <EllipsisOutlined />;
    default:
      return <EllipsisOutlined />;
  }
};

const ServiceCard = ({ service, onClick }) => {
  return (
    <CardContainer onClick={() => onClick && onClick(service)}>
      <IconWrapper color={service.color}>
        {getIconComponent(service.icon)}
      </IconWrapper>
      <ServiceTitle>{service.name}</ServiceTitle>
      <ServiceDescription>{service.description}</ServiceDescription>
    </CardContainer>
  );
};

export default ServiceCard; 