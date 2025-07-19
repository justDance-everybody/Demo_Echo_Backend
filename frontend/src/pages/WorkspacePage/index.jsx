/**
 * 主工作台页面 - 替换原来的MainPage
 * 提供清晰的用户交互界面，包含语音、工具、对话等功能模块
 */

import React, { useEffect } from 'react';
import { useStore, useUI, setActivePanel, initializeUI } from '../../store';
import Layout from '../../components/layout/Layout';
import VoicePanel from './components/VoicePanel';
import ToolPanel from './components/ToolPanel';
import ChatPanel from './components/ChatPanel';
import StatusPanel from './components/StatusPanel';
import './WorkspacePage.css';

const WorkspacePage = () => {
  const { dispatch } = useStore();
  const ui = useUI();
  const { activePanel, layout } = ui;

  useEffect(() => {
    // 初始化UI状态
    const cleanup = dispatch(initializeUI());
    return cleanup;
  }, [dispatch]);

  const handlePanelChange = (panel) => {
    dispatch(setActivePanel(panel));
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'voice':
        return <VoicePanel />;
      case 'tools':
        return <ToolPanel />;
      case 'chat':
        return <ChatPanel />;
      case 'status':
        return <StatusPanel />;
      default:
        return <VoicePanel />;
    }
  };

  return (
    <Layout>
      <div className="workspace-page">
        {/* 主要内容区域 */}
        <div className="workspace-main">
          {/* 面板切换导航 */}
          <div className="workspace-nav">
            <nav className="panel-tabs">
              <button
                className={`tab-button ${activePanel === 'voice' ? 'active' : ''}`}
                onClick={() => handlePanelChange('voice')}
                aria-label="语音交互"
              >
                <span className="tab-icon">🎤</span>
                <span className="tab-text">语音助手</span>
              </button>
              
              <button
                className={`tab-button ${activePanel === 'tools' ? 'active' : ''}`}
                onClick={() => handlePanelChange('tools')}
                aria-label="工具管理"
              >
                <span className="tab-icon">🛠️</span>
                <span className="tab-text">工具箱</span>
              </button>
              
              <button
                className={`tab-button ${activePanel === 'chat' ? 'active' : ''}`}
                onClick={() => handlePanelChange('chat')}
                aria-label="对话历史"
              >
                <span className="tab-icon">💬</span>
                <span className="tab-text">对话</span>
              </button>
              
              {!layout.isMobile && (
                <button
                  className={`tab-button ${activePanel === 'status' ? 'active' : ''}`}
                  onClick={() => handlePanelChange('status')}
                  aria-label="状态监控"
                >
                  <span className="tab-icon">📊</span>
                  <span className="tab-text">状态</span>
                </button>
              )}
            </nav>
          </div>

          {/* 面板内容区域 */}
          <div className="workspace-content">
            <div className="panel-container">
              {renderActivePanel()}
            </div>
          </div>
        </div>

        {/* 移动端状态栏 */}
        {layout.isMobile && (
          <div className="mobile-status-bar">
            <StatusPanel compact />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WorkspacePage;