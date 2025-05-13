import React from 'react';
import { Layout, Menu, Button, Space, Typography, Tabs } from 'antd';
import { LeftOutlined, RobotOutlined, BarChartOutlined, FundOutlined, SoundOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import TestRunner from './TestRunner';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

/**
 * 测试页面组件
 * 
 * 作为自动化测试界面的入口页面
 */
const TestPage = () => {
  // 定义Tabs项
  const tabItems = [
    {
      key: 'runner',
      label: '测试运行',
      children: <TestRunner />
    },
    {
      key: 'docs',
      label: '测试说明',
      children: (
        <div style={{ padding: '20px' }}>
          <Title level={3}>前端自动化测试说明</Title>
          
          <Typography.Paragraph>
            此测试框架用于自动化测试语音AI代理前端的关键功能，无需手动交互即可验证功能正常性。
          </Typography.Paragraph>
          
          <Title level={4}>测试场景说明</Title>
          
          <Typography.Paragraph>
            <ul>
              <li>
                <Typography.Text strong>基础语音识别测试</Typography.Text>
                <Typography.Paragraph>
                  测试基本的语音输入、语义理解、执行确认和结果展示流程。
                </Typography.Paragraph>
              </li>
              <li>
                <Typography.Text strong>语音确认测试</Typography.Text>
                <Typography.Paragraph>
                  测试用户通过语音确认后执行操作的完整流程。
                </Typography.Paragraph>
              </li>
              <li>
                <Typography.Text strong>语音取消测试</Typography.Text>
                <Typography.Paragraph>
                  测试用户通过语音取消操作的流程处理。
                </Typography.Paragraph>
              </li>
              <li>
                <Typography.Text strong>API错误处理测试</Typography.Text>
                <Typography.Paragraph>
                  测试系统对API调用错误的处理能力。
                </Typography.Paragraph>
              </li>
            </ul>
          </Typography.Paragraph>
          
          <Title level={4}>测试原理</Title>
          
          <Typography.Paragraph>
            测试框架通过以下方式模拟真实用户操作：
            <ul>
              <li>模拟语音识别(STT)：直接注入文本而非实际麦克风输入</li>
              <li>模拟语音合成(TTS)：拦截浏览器的speech synthesis API</li>
              <li>模拟API调用：使用mock数据替代真实后端请求</li>
              <li>模拟用户确认流程：自动注入"确认"或"取消"语音命令</li>
            </ul>
          </Typography.Paragraph>
          
          <Typography.Paragraph type="secondary" style={{ marginTop: 40 }}>
            测试完成后所有测试文件将放置在 /frontend/src/mocks 目录下，可通过直接删除该目录进行清理。
          </Typography.Paragraph>
        </div>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Link to="/">
            <Button icon={<LeftOutlined />}>返回应用</Button>
          </Link>
          <Title level={4} style={{ margin: 0 }}>语音AI代理测试中心</Title>
        </Space>
        <Space>
          <Typography.Text type="secondary">
            环境: 测试模式
          </Typography.Text>
        </Space>
      </Header>
      
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['autotest']}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'autotest',
                icon: <RobotOutlined />,
                label: '自动化测试'
              },
              {
                key: 'voice',
                icon: <SoundOutlined />,
                label: '语音交互测试',
                disabled: true
              },
              {
                key: 'api',
                icon: <FundOutlined />,
                label: 'API调用测试',
                disabled: true
              },
              {
                key: 'reports',
                icon: <BarChartOutlined />,
                label: '测试报告',
                disabled: true
              }
            ]}
          />
        </Sider>
        
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
            }}
          >
            <Tabs defaultActiveKey="runner" items={tabItems} />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default TestPage; 