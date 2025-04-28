import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Drawer, Menu, Switch } from 'antd';
import { 
  MenuOutlined, 
  CloseOutlined, 
  HomeOutlined, 
  UserOutlined, 
  SettingOutlined, 
  AudioOutlined,
  BulbOutlined, 
  BulbFilled 
} from '@ant-design/icons';
import { ThemeContext } from '../theme/ThemeProvider';
import { Link } from 'react-router-dom';

// 响应式断点
const BREAKPOINTS = {
  xs: '480px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
};

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background-color: ${props => props.theme.headerBackground};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: all 0.3s ease;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.primaryColor};
  font-family: 'SF Pro Display', -apple-system, sans-serif;
`;

const MenuItems = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: ${BREAKPOINTS.md}) {
    display: none;
  }
`;

const MenuItem = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  color: ${props => props.theme.textColor};
  transition: color 0.3s ease;
  
  &:hover {
    color: ${props => props.theme.primaryColor};
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: ${BREAKPOINTS.md}) {
    display: none;
  }
`;

const ThemeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ThemeIcon = styled.span`
  color: ${props => props.theme.textColor};
  font-size: 16px;
`;

const MobileMenuButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: ${props => props.theme.textColor};
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 4px;
  
  @media (max-width: ${BREAKPOINTS.md}) {
    display: flex;
  }
  
  &:hover {
    color: ${props => props.theme.primaryColor};
  }
`;

const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    padding: 0;
    background-color: ${props => props.theme.background};
  }
  
  .ant-menu {
    background-color: ${props => props.theme.background};
    color: ${props => props.theme.textColor};
    border-right: none;
  }
  
  .ant-menu-item:hover {
    color: ${props => props.theme.primaryColor};
  }
  
  .ant-menu-item-selected {
    background-color: ${props => props.theme.primaryColorLight};
    color: ${props => props.theme.primaryColor};
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
`;

const DrawerThemeToggle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid ${props => props.theme.borderColor};
`;

const NavBar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleThemeChange = () => {
    toggleTheme();
  };

  const openVoiceDialog = () => {
    setVoiceDialogOpen(true);
    if (drawerVisible) {
      setDrawerVisible(false);
    }
  };

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  // 定义菜单项对应的路径
  const menuItems = [
    { key: 'home', icon: <HomeOutlined />, label: '首页', path: '/' },
    { key: 'profile', icon: <UserOutlined />, label: '个人中心', path: '/user' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置', path: '/settings' },
  ];

  return (
    <NavContainer theme={theme}>
      <Logo theme={theme}>Echo AI</Logo>
      
      <MenuItems>
        {menuItems.map(item => (
          <Link to={item.path} key={item.key} style={{ textDecoration: 'none' }}>
            <MenuItem theme={theme}>
              {item.icon} {item.label}
            </MenuItem>
          </Link>
        ))}
      </MenuItems>
      
      <Controls>
        <Button 
          type="primary" 
          icon={<AudioOutlined />} 
          onClick={openVoiceDialog}
        >
          语音助手
        </Button>
        
        <ThemeToggle theme={theme}>
          <ThemeIcon theme={theme}>
            {theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
          </ThemeIcon>
          <Switch 
            checked={theme === 'dark'} 
            onChange={handleThemeChange} 
            size="small"
          />
        </ThemeToggle>
      </Controls>
      
      <MobileMenuButton theme={theme} onClick={showDrawer}>
        <MenuOutlined />
      </MobileMenuButton>
      
      <StyledDrawer 
        theme={theme}
        title={null}
        placement="right"
        closable={false}
        onClose={closeDrawer}
        open={drawerVisible}
        width={280}
      >
        <DrawerHeader theme={theme}>
          <Logo theme={theme}>Echo AI</Logo>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={closeDrawer}
          />
        </DrawerHeader>
        
        <Menu mode="vertical" theme={theme === 'dark' ? 'dark' : 'light'} selectable={false}>
          {menuItems.map(item => (
            <Menu.Item key={item.key} icon={item.icon} onClick={closeDrawer}>
              <Link to={item.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                {item.label}
              </Link>
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item key="voice" icon={<AudioOutlined />} onClick={() => { openVoiceDialog(); closeDrawer(); }}>
            语音助手
          </Menu.Item>
        </Menu>
        
        <DrawerThemeToggle theme={theme}>
          <span>深色模式</span>
          <Switch 
            checked={theme === 'dark'} 
            onChange={handleThemeChange}
          />
        </DrawerThemeToggle>
      </StyledDrawer>
      
      {/* 这里可以添加VoiceDialog组件 */}
      {/* {voiceDialogOpen && <VoiceDialog onClose={() => setVoiceDialogOpen(false)} />} */}
    </NavContainer>
  );
};

export default NavBar;