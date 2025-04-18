import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import VoiceAssistant from './pages/user/VoiceAssistant';
import NavBar from './components/NavBar';
import './App.css';

const { Content, Footer } = Layout;

function App() {
  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <NavBar />
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