import React, { useState, useEffect, useContext } from 'react';
import { Typography, Button, Space, Card, Row, Col, Spin, Layout, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ReloadOutlined, SearchOutlined, RobotOutlined, GlobalOutlined, ThunderboltOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import apiClient from '../../services/apiClient';
import VoiceDialog from '../../components/VoiceDialog';
import { ThemeContext } from '../../theme/ThemeProvider';
import { UI_CONFIG } from '../../config/uiConfig';

const { Title } = Typography;
const { Content } = Layout;

// 样式组件
const HomeContainer = styled(Content)`
  padding: var(--spacing-lg);
  min-height: calc(100vh - var(--header-height));
`;

const Banner = styled.div`
  padding: var(--spacing-lg) var(--spacing-xl);
  background: ${props => props.theme.secondary};
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-xl);
  color: var(--color-on-primary);
`;

const StyledCard = styled(Card)`
  height: 100%;
  cursor: pointer;
  border-radius: var(--border-radius-lg);
  transition: var(--transition-default);
  background: ${props => props.theme === 'dark' ? 'var(--color-surface-dark)' : 'var(--color-surface)'};
  border-color: ${props => props.theme === 'dark' ? 'var(--color-border-dark)' : 'var(--color-border)'};
  
  &:hover {
    transform: var(--transform-translate-hover);
    box-shadow: var(--shadow-lg);
  }
`;

const IconContainer = styled.div`
  width: var(--icon-size-xl);
  height: var(--icon-size-xl);
  border-radius: var(--border-radius-full);
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  color: var(--color-on-primary);
  font-size: var(--font-size-xl);
`;

const CardTitle = styled(Typography.Title)`
  margin-bottom: var(--spacing-xs) !important;
`;

const CardDescription = styled(Typography.Paragraph)`
  color: ${props => props.theme === 'dark' ? 'var(--color-text-secondary-dark)' : 'var(--color-text-secondary)'};
`;

const HomePage = () => {
  const { theme } = useContext(ThemeContext);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // 获取MCP服务列表
  useEffect(() => {
    fetchMcpServers();
  }, []);

  const fetchMcpServers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getServices();
      
      // 转换服务格式为MCP服务器格式
      const servers = response.data?.services?.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description
      })) || [];
      
      setMcpServers(servers);
      
      // 成功获取到服务器列表
      if (servers.length > 0) {
        console.log('成功获取服务列表:', servers);
      } else {
        console.warn('获取到的服务列表为空');
        message.warning('没有可用的服务，部分功能可能无法使用');
      }
    } catch (error) {
      console.error('获取服务列表失败:', error);
      
      // 显示更详细的错误信息
      if (error.response) {
        message.error(`获取服务列表失败: ${error.response.status} ${error.response.data?.message || ''}`);
      } else if (error.request) {
        message.error('无法连接到服务器，请检查网络或后端服务是否运行');
      } else {
        message.error(`获取服务列表失败: ${error.message}`);
      }
      
      // 添加测试数据以防后端服务不可用
      setMcpServers([
        {
          id: 'playwright',
          name: 'Playwright浏览器(本地)',
          description: '本地模拟服务 - 提供Web浏览功能'
        },
        {
          id: 'MiniMax',
          name: 'MiniMax API(本地)',
          description: '本地模拟服务 - 提供大语言模型接口'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVoiceDialog = (serviceId) => {
    setSelectedService(serviceId);
    setIsVoiceDialogOpen(true);
  };

  const handleCloseVoiceDialog = () => {
    setIsVoiceDialogOpen(false);
  };

  // 根据服务类型获取图标和颜色
  const getServiceIconAndColor = (serviceId) => {
    const services = {
      'playwright': {
        icon: <RobotOutlined />,
        color: 'var(--color-primary)',
        title: '浏览器助手',
        description: '智能网页浏览与交互服务'
      },
      'MiniMax': {
        icon: <RobotOutlined />,
        color: 'var(--color-secondary)',
        title: '智能聊天',
        description: '基于MiniMax大模型的智能对话'
      },
      'amap-maps': {
        icon: <GlobalOutlined />,
        color: 'var(--color-success)',
        title: '地图服务',
        description: '提供地点查询与导航功能'
      },
      'web3-rpc': {
        icon: <ThunderboltOutlined />,
        color: 'var(--color-warning)',
        title: '区块链服务',
        description: '区块链钱包交互与管理'
      }
    };

    return services[serviceId] || {
      icon: <SearchOutlined />,
      color: 'var(--color-error)',
      title: serviceId,
      description: '通用AI服务'
    };
  };

  return (
    <HomeContainer>
      <Banner theme={theme.mode}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ color: 'var(--color-on-primary)', margin: 'var(--spacing-none)' }}>Echo智能助手</Title>
            <Typography.Paragraph style={{ color: 'var(--color-on-primary-secondary)', marginBottom: 'var(--spacing-none)' }}>
              多功能AI语音助手，为您提供各种智能服务
            </Typography.Paragraph>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<AudioOutlined />}
              size="large"
              shape="round"
              onClick={() => handleOpenVoiceDialog(null)}
              ghost
            >
              开始语音对话
            </Button>
          </Col>
        </Row>
      </Banner>

      {loading ? (
        <div style={{ textAlign: 'var(--text-align-center)', padding: 'var(--spacing-xxl)' }}>
          <Spin size="large" />
          <p style={{ marginTop: 'var(--spacing-md)' }}>正在加载服务...</p>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {mcpServers.map(server => {
            const { icon, color, title, description } = getServiceIconAndColor(server.id);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={server.id}>
                <StyledCard 
                  theme={theme.mode}
                  hoverable
                  onClick={() => handleOpenVoiceDialog(server.id)}
                >
                  <div style={{ textAlign: 'var(--text-align-center)' }}>
                    <IconContainer color={color}>
                      {icon}
                    </IconContainer>
                    <CardTitle level={4} theme={theme.mode}>{title}</CardTitle>
                    <CardDescription theme={theme.mode}>{description}</CardDescription>
                  </div>
                </StyledCard>
              </Col>
            );
          })}
        </Row>
      )}

      <VoiceDialog 
        isOpen={isVoiceDialogOpen} 
        onClose={handleCloseVoiceDialog} 
        initialService={selectedService}
      />
    </HomeContainer>
  );
};

export default HomePage;