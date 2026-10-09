import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { DotLoading } from 'antd-mobile';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background);
  color: var(--text);
  font-size: var(--font-size-lg);
`;

/**
 * 保护路由组件，确保用户已登录才能访问
 * @param {Object} props
 * @param {React.ReactNode} props.children 子组件
 * @param {boolean} props.requireAdmin 是否需要管理员权限
 * @param {string} props.requireRole 需要的用户角色，可选值：'user', 'developer', 'admin'
 */
const ProtectedRoute = ({ children, requireAdmin = false, requireRole = null }) => {
  const { isAuthenticated, user, loading, role } = useContext(AuthContext);
  const location = useLocation();

  // 如果正在加载认证状态，显示加载中
  if (loading) {
    return (
      <LoadingContainer>
        正在验证身份<DotLoading />
      </LoadingContainer>
    );
  }

  // 如果未登录，重定向到登录页面并记录当前路径
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // 如果需要管理员权限，检查用户角色
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // 如果指定了所需角色，检查用户是否有该角色
  if (requireRole && role !== requireRole && role !== 'admin') {
    // 管理员可以访问任何需要角色的路由
    return <Navigate to="/unauthorized" replace />;
  }

  // 满足条件，渲染子组件
  return children;
};

export default ProtectedRoute; 