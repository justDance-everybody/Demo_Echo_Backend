import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import ThemeToggle from './ThemeToggle';
import MobileNavButton from './MobileNavButton';
import { useTheme } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

// 导航栏容器
const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: rgba(15, 22, 41, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 229, 255, 0.15);
  box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.08), 0 6px 24px rgba(124, 77, 255, 0.12);
  position: sticky;
  top: 0;
  z-index: 100;
`;

// Logo样式
const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  
  a {
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  span {
    font-size: 1.8rem;
  }
`;

// 导航链接容器
const NavLinks = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// 导航链接
const NavLink = styled(Link)`
  color: var(--text-color);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem;
  position: relative;
  transition: color 0.2s ease;
  
  &.active, &:hover {
    color: var(--primary-color);
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: 0;
    left: 50%;
    background-color: var(--primary-color);
    transition: width 0.3s ease, left 0.3s ease;
  }
  
  &.active::after, &:hover::after {
    width: 100%;
    left: 0;
  }
`;

// 操作区域
const ActionsArea = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// 按钮样式
const Button = styled(Link)`
  text-decoration: none;
  font-weight: 600;
  color: #7ffcff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0,229,255,.4);
  box-shadow: 0 0 0 1px rgba(0,229,255,.15) inset, 0 0 12px rgba(0,229,255,.12);
  transition: all .2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 0 1px rgba(0,229,255,.25) inset, 0 0 18px rgba(0,229,255,.2);
    background: rgba(0,229,255,.06);
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// 导航栏组件
const NavBar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const { isAuthenticated, role } = useContext(AuthContext);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 创建导航项
  const getNavItems = () => {
    // 基础导航项
    const baseItems = [
      { label: '首页', url: '/', isActive: location.pathname === '/' },
      { label: '服务', url: '/services', isActive: location.pathname === '/services' },
      { label: '关于', url: '/about', isActive: location.pathname === '/about' },
      { label: '设置', url: '/settings', isActive: location.pathname === '/settings' },
    ];
    
    // 根据用户角色添加特定导航项
    if (isAuthenticated && (role === 'developer' || role === 'admin')) {
      baseItems.push({ 
        label: '开发者', 
        url: '/developer', 
        isActive: location.pathname.startsWith('/developer') 
      });
    }
    
    return baseItems;
  };
  
  // 获取导航项
  const navItems = getNavItems();
  
  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 处理导航
  const handleNavigate = (url) => {
    // 此处为MobileNavButton使用，不需要实际处理导航
    // React Router的Link组件会处理导航
  };
  
  return (
    <NavContainer style={{ 
      boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
    }}>
      <Logo>
        <Link to="/">
          <span role="img" aria-label="logo">🔊</span>
          Echo
        </Link>
      </Logo>
      
      <NavLinks>
        {navItems.map((item, index) => (
          <NavLink 
            key={index} 
            to={item.url} 
            className={item.isActive ? 'active' : ''}
          >
            {item.label}
          </NavLink>
        ))}
      </NavLinks>
      
      <ActionsArea>
        <ThemeToggle />
        <Button to="/user">用户中心</Button>
        <MobileNavButton 
          items={navItems.concat({ label: '用户中心', url: '/user', isActive: location.pathname === '/user' })} 
          onNavigate={handleNavigate}
        />
      </ActionsArea>
    </NavContainer>
  );
};

export default NavBar;