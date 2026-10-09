import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { NavBar, TabBar, SafeArea } from 'antd-mobile';
import { 
  LeftOutline, 
  AppstoreOutline, 
  MessageOutline, 
  UserOutline, 
  CloseOutline,
  AppOutline
} from 'antd-mobile-icons';
import Footer from '../Footer';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--background);
  overflow: hidden;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  
  .adm-nav-bar {
    --height: 56px;
    color: var(--text);
    
    &-title {
      font-weight: var(--font-weight-medium);
      font-size: 18px;
    }
    
    &-back-arrow {
      color: var(--text);
    }
  }
`;

const Content = styled.main`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: ${props => props.hasTabBar ? 'calc(50px + env(safe-area-inset-bottom, 0px))' : '0'};
  
  @media (min-width: 768px) {
    padding-bottom: 0;
  }
`;

const TabBarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  
  .adm-tab-bar {
    --active-color: var(--color-primary);
    height: 50px;
  }
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const SideNav = styled.nav`
  position: fixed;
  left: 0;
  top: 56px;
  bottom: 0;
  width: 240px;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  padding: var(--spacing-4) 0;
  display: none;
  overflow-y: auto;
  
  @media (min-width: 768px) {
    display: block;
  }
`;

const SideNavItem = styled.div`
  display: flex;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  cursor: pointer;
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--text)'};
  font-weight: ${props => props.active ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'};
  transition: background-color 0.2s, color 0.2s;
  
  &:hover {
    background-color: var(--surface-hover);
  }
  
  &:active {
    background-color: var(--surface-active);
  }
  
  .icon {
    margin-right: var(--spacing-3);
    font-size: 20px;
  }
`;

const MainContent = styled.div`
  margin-left: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    margin-left: ${props => props.hasSideNav ? '240px' : '0'};
  }
`;

const MobileMenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: var(--spacing-2);
  color: var(--text);
  min-width: 44px;
  min-height: 44px;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--surface);
  z-index: 200;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--border);
    padding-top: env(safe-area-inset-top, 0px);
  }
  
  .title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
  }
  
  .close-button {
    background: none;
    border: none;
    padding: var(--spacing-2);
    color: var(--text);
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-4) 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

const MobileMenuItem = styled(SideNavItem)`
  padding: var(--spacing-4) var(--spacing-4);
  font-size: var(--font-size-lg);
  
  .icon {
    font-size: 24px;
    margin-right: var(--spacing-4);
  }
`;

// 导航遮罩层（点击关闭导航菜单）
const NavOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 199;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

/**
 * 应用布局组件
 * @param {Object} props
 * @param {React.ReactNode} props.children 子组件
 * @param {string} props.title 页面标题
 * @param {boolean} props.showBack 是否显示返回按钮
 * @param {boolean} props.showTabBar 是否显示底部标签栏
 * @param {boolean} props.showSideNav 是否显示侧边导航
 * @param {Function} props.onBack 返回回调
 */
const AppLayout = ({ 
  children,
  title,
  showBack = false,
  showTabBar = true,
  showSideNav = true,
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 设置当前活动标签
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('/');
    } else if (path.startsWith('/services')) {
      setActiveTab('/services');
    } else if (path.startsWith('/messages')) {
      setActiveTab('/messages');
    } else if (path.startsWith('/user')) {
      setActiveTab('/user');
    }
  }, [location.pathname]);
  
  // 处理导航
  const handleTabChange = (key) => {
    navigate(key);
  };
  
  // 处理返回
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };
  
  // 处理侧边导航项点击
  const handleSideNavItemClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };
  
  // 关闭菜单
  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  // 渲染导航项
  const renderNavItems = (isMobile = false) => {
    const NavItemComponent = isMobile ? MobileMenuItem : SideNavItem;
    
    return (
      <>
        <NavItemComponent 
          active={activeTab === '/'} 
          onClick={() => handleSideNavItemClick('/')}
        >
          <AppOutline className="icon" />
          首页
        </NavItemComponent>
        <NavItemComponent 
          active={activeTab === '/services'} 
          onClick={() => handleSideNavItemClick('/services')}
        >
          <AppstoreOutline className="icon" />
          服务中心
        </NavItemComponent>
        <NavItemComponent 
          active={activeTab === '/messages'} 
          onClick={() => handleSideNavItemClick('/messages')}
        >
          <MessageOutline className="icon" />
          消息
        </NavItemComponent>
        <NavItemComponent 
          active={activeTab === '/user'} 
          onClick={() => handleSideNavItemClick('/user')}
        >
          <UserOutline className="icon" />
          个人中心
        </NavItemComponent>
      </>
    );
  };
  
  return (
    <LayoutContainer>
      <Header className="safe-area-top">
        <NavBar
          back={showBack ? <LeftOutline /> : null}
          onBack={handleBack}
          right={
            <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)} aria-label="菜单">
              <AppstoreOutline fontSize={24} />
            </MobileMenuButton>
          }
        >
          {title}
        </NavBar>
      </Header>
      
      {/* 移动端菜单背景遮罩 */}
      {isMobileMenuOpen && (
        <NavOverlay onClick={closeMenu} />
      )}
      
      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <MobileMenu>
          <div className="header">
            <div className="title">菜单</div>
            <button 
              className="close-button"
              onClick={closeMenu}
              aria-label="关闭菜单"
            >
              <CloseOutline fontSize={24} />
            </button>
          </div>
          <div className="content">
            {renderNavItems(true)}
          </div>
        </MobileMenu>
      )}
      
      {/* 侧边导航 */}
      {showSideNav && (
        <SideNav>
          {renderNavItems()}
        </SideNav>
      )}
      
      <MainContent hasSideNav={showSideNav}>
        <Content hasTabBar={showTabBar} className="scrollable">
          {children}
          <Footer />
          {/* 添加底部安全区域填充（仅桌面端） */}
          {!showTabBar && <SafeArea position="bottom" />}
        </Content>
      </MainContent>
      
      {/* 底部标签栏 */}
      {showTabBar && (
        <TabBarContainer className="safe-area-bottom">
          <TabBar activeKey={activeTab} onChange={handleTabChange}>
            <TabBar.Item key="/" icon={<AppOutline />} title="首页" />
            <TabBar.Item key="/services" icon={<AppstoreOutline />} title="服务" />
            <TabBar.Item key="/messages" icon={<MessageOutline />} title="消息" />
            <TabBar.Item key="/user" icon={<UserOutline />} title="我的" />
          </TabBar>
        </TabBarContainer>
      )}
      <SafeArea position='bottom' />
    </LayoutContainer>
  );
};

export default AppLayout; 