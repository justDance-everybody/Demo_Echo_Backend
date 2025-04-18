import React, { useState, useEffect, useContext } from 'react';
import { Typography, Button, Space, Card, Row, Col, Spin, Layout, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ReloadOutlined, SearchOutlined, RobotOutlined, GlobalOutlined, ThunderboltOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import axios from 'axios';
import VoiceDialog from '../../components/VoiceDialog';
import { ThemeContext } from '../../theme/ThemeProvider';

const { Title } = Typography;
const { Content } = Layout;

// 样式组件
const HomeContainer = styled(Content)`
  padding: 20px;
  min-height: calc(100vh - 64px);
`;

const Banner = styled.div`
  padding: 20px 24px;
  background: ${props => props.theme.secondary};
  border-radius: 8px;
  margin-bottom: 24px;
  color: white;
`;

const StyledCard = styled(Card)`
  height: 100%;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
  background: ${props => props.theme === 'dark' ? '#1f1f1f' : 'white'};
  border-color: ${props => props.theme === 'dark' ? '#303030' : '#f0f0f0'};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const IconContainer = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: white;
  font-size: 24px;
`;

const CardTitle = styled(Typography.Title)`
  margin-bottom: 8px !important;
`;

const CardDescription = styled(Typography.Paragraph)`
  color: ${props => props.theme === 'dark' ? '#aaa' : '#666'};
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
      const response = await axios.get('/api/test-service/mcp-servers');
      setMcpServers(response.data.servers);
      
      // 成功获取到服务器列表
      if (response.data.servers && response.data.servers.length > 0) {
        console.log('成功获取MCP服务器列表:', response.data.servers);
      } else {
        console.warn('获取到的MCP服务器列表为空');
        message.warning('没有可用的服务，部分功能可能无法使用');
      }
    } catch (error) {
      console.error('获取MCP服务列表失败:', error);
      
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
        color: '#1890ff',
        title: '浏览器助手',
        description: '智能网页浏览与交互服务'
      },
      'MiniMax': {
        icon: <RobotOutlined />,
        color: '#722ed1',
        title: '智能聊天',
        description: '基于MiniMax大模型的智能对话'
      },
      'amap-maps': {
        icon: <GlobalOutlined />,
        color: '#52c41a',
        title: '地图服务',
        description: '提供地点查询与导航功能'
      },
      'web3-rpc': {
        icon: <ThunderboltOutlined />,
        color: '#fa8c16',
        title: '区块链服务',
        description: '区块链钱包交互与管理'
      }
    };

    return services[serviceId] || {
      icon: <SearchOutlined />,
      color: '#f5222d',
      title: serviceId,
      description: '通用AI服务'
    };
  };

  return (
    <HomeContainer>
      <Banner theme={theme.mode}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>Echo智能助手</Title>
            <Typography.Paragraph style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: 0 }}>
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
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>正在加载服务...</p>
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
                  <div style={{ textAlign: 'center' }}>
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