import React, { useState } from 'react';
import { Space, Button, Avatar, List, Card, Tag, Typography, Tooltip } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ReloadOutlined } from '@ant-design/icons';
import VoiceDialog from '../../components/VoiceDialog';

const HomePage = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  
  // 打开语音对话框
  const openVoiceDialog = () => {
    setIsVoiceDialogOpen(true);
  };
  
  // 关闭语音对话框
  const closeVoiceDialog = () => {
    setIsVoiceDialogOpen(false);
  };
  
  return (
    <div className="home-container">
      <div className="search-section">
        <div className="search-heading">
          <h1>Echo 智能助手</h1>
          <p>通过语音轻松获取服务</p>
        </div>
        
        <div className="search-box">
          <Space size="middle">
            <Tooltip title="语音助手">
              <Button 
                type="primary" 
                shape="circle" 
                icon={<AudioOutlined />} 
                size="large"
                onClick={openVoiceDialog}
              />
            </Tooltip>
            {/* 其他按钮 */}
          </Space>
        </div>
        
        {/* 其他内容 */}
      </div>
      
      {/* 语音对话组件 */}
      <VoiceDialog isOpen={isVoiceDialogOpen} onClose={closeVoiceDialog} />
      
      {/* 其他内容 */}
    </div>
  );
};

export default HomePage; 