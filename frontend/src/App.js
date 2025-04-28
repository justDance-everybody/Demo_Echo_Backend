import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import { ThemeProvider } from './contexts/ThemeContext';
import { SessionProvider } from './contexts/SessionContext';
import { UserConfigProvider } from './contexts/UserConfigContext';
import VoiceAssistant from './pages/user/VoiceAssistant';
import UserCenter from './pages/user/UserCenter';
import Settings from './pages/Settings';
import NavBar from './components/NavBar';
import './App.css';

const { Content, Footer } = Layout;

function App() {
  return (
    <Router>
      <ThemeProvider>
        <SessionProvider>
          <UserConfigProvider>
            <Layout className="layout" style={{ minHeight: '100vh' }}>
              <NavBar />
              <Content style={{ padding: '0 50px' }}>
                <div className="site-layout-content" style={{ padding: '24px 0' }}>
                  <Routes>
                    <Route path="/" element={<VoiceAssistant />} />
                    <Route path="/voice-assistant" element={<VoiceAssistant />} />
                    <Route path="/user" element={<UserCenter />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </div>
              </Content>
              <Footer style={{ textAlign: 'center' }}>
                智能语音AI-Agent平台 ©{new Date().getFullYear()} 由MCP框架驱动
              </Footer>
            </Layout>
          </UserConfigProvider>
        </SessionProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;