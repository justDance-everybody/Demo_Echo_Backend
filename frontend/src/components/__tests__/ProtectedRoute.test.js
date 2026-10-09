import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import ProtectedRoute from '../ProtectedRoute';

// 模拟子组件
const ProtectedComponent = () => <div>受保护的内容</div>;
const LoginPage = () => <div>登录页面</div>;
const UnauthorizedPage = () => <div>未授权页面</div>;

// 渲染包装函数
const renderWithRouter = (
  authContextValue = { 
    isAuthenticated: false, 
    user: null, 
    loading: false 
  }
) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <ProtectedComponent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <div>管理员页面</div>
              </ProtectedRoute>
            } 
          />
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('ProtectedRoute 组件', () => {
  // 测试加载状态
  test('在验证身份时显示加载状态', () => {
    renderWithRouter({ isAuthenticated: false, user: null, loading: true });
    
    expect(screen.getByText('正在验证身份')).toBeInTheDocument();
  });
  
  // 测试未认证状态
  test('未登录用户重定向到登录页面', () => {
    renderWithRouter({ isAuthenticated: false, user: null, loading: false });
    
    expect(screen.getByText('登录页面')).toBeInTheDocument();
    expect(screen.queryByText('受保护的内容')).not.toBeInTheDocument();
  });
  
  // 测试已认证状态
  test('已登录用户可以访问受保护的路由', () => {
    renderWithRouter({ 
      isAuthenticated: true, 
      user: { id: 1, username: 'testuser' }, 
      loading: false 
    });
    
    expect(screen.getByText('受保护的内容')).toBeInTheDocument();
  });
  
  // 测试管理员权限
  test('非管理员用户不能访问需要管理员权限的路由', () => {
    const { unmount } = render(
      <AuthContext.Provider value={{ 
        isAuthenticated: true, 
        user: { id: 1, username: 'testuser', role: 'user' }, 
        loading: false 
      }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <div>管理员页面</div>
                </ProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('未授权页面')).toBeInTheDocument();
    expect(screen.queryByText('管理员页面')).not.toBeInTheDocument();
    
    unmount();
  });
  
  // 测试管理员用户
  test('管理员用户可以访问需要管理员权限的路由', () => {
    render(
      <AuthContext.Provider value={{ 
        isAuthenticated: true, 
        user: { id: 1, username: 'admin', role: 'admin' }, 
        loading: false 
      }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <div>管理员页面</div>
                </ProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('管理员页面')).toBeInTheDocument();
    expect(screen.queryByText('未授权页面')).not.toBeInTheDocument();
  });
}); 