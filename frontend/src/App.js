import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import VoiceAssistant from './pages/user/VoiceAssistant';
import './App.css';

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="logo" style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          智能语音AI-Agent平台
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          style={{ marginLeft: '20px', flex: 1 }}
          items={[
            { key: '1', label: '语音助手' },
            { key: '2', label: '服务列表' },
            { key: '3', label: '关于平台' }
          ]}
        />
      </Header>
      <Content style={{ padding: '0 50px' }}>
        <div className="site-layout-content" style={{ padding: '24px 0' }}>
          <Router>
            <Routes>
              <Route path="/" element={<VoiceAssistant />} />
              <Route path="/voice-assistant" element={<VoiceAssistant />} />
            </Routes>
          </Router>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        智能语音AI-Agent平台 ©{new Date().getFullYear()} 由MCP框架驱动
      </Footer>
    </Layout>
  );
}

export default App; 