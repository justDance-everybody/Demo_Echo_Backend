import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Assuming AuthContext is needed for user info or token
import apiClient from '../../services/apiClient'; // Assuming a central apiClient exists
import styled from 'styled-components';
import AddServiceForm from './AddServiceForm'; // Import the new form component
import EditServiceForm from './EditServiceForm'; // Import the edit form component
import TestToolModal from './TestToolModal'; // Import the test modal component
import { toast } from '../../components/common/Toast';

// Basic styling for the page and list (can be moved to a separate CSS file or enhanced)
const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const ToolList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 2rem; /* Add some space above the list if form is present */
`;

const ToolListItem = styled.li`
  background-color: var(--surface-lighter, #f9f9f9);
  border: 1px solid var(--border-color, #eee);
  border-radius: var(--radius-base, 8px);
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-strong, #333);
  }
  p {
    margin: 0.2rem 0;
    font-size: 0.9rem;
    color: var(--text-secondary, #666);
  }
  span {
    font-weight: bold;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;

  button {
    padding: 0.5rem 0.8rem;
    border: none;
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s ease;
  }
`;

const EditButton = styled.button`
  background-color: var(--color-primary, #4FD1C5);
  color: white;
  &:hover { background-color: #3dbbab; }
`;

const TestButton = styled.button`
  background-color: var(--color-info, #4299E1);
  color: white;
  &:hover { background-color: #3182ce; }
`;

const DeleteButton = styled.button`
  background-color: var(--color-error, #F56565);
  color: white;
  &:hover { background-color: #e05252; }
`;

// const AddToolButton = styled.button`
//   background-color: var(--color-accent, #2c5282);
//   color: white;
//   padding: 0.8rem 1.5rem;
//   font-size: 1rem;
//   margin-bottom: 1.5rem;
//   border: none;
//   border-radius: var(--radius-md, 6px);
//   cursor: pointer;
//   &:hover { background-color: #224066; }
// `;

const FilterSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--surface-lighter, #f9f9f9);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-color, #eee);
  flex-wrap: wrap;
  align-items: center;

  input, select {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.9rem;
  }

  input[type="text"] {
    min-width: 200px;
  }

  select {
    min-width: 120px;
  }
`;

const PaginationSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--surface-lighter, #f9f9f9);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-color, #eee);

  .pagination-info {
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
  }

  .pagination-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    button {
      padding: 0.5rem 0.8rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm, 4px);
      background-color: white;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background-color 0.2s ease;

      &:hover:not(:disabled) {
        background-color: var(--color-primary, #4FD1C5);
        color: white;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
`;


const DeveloperConsolePage = () => {
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingToolId, setEditingToolId] = useState(null);
  const [testingTool, setTestingTool] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    is_public: undefined,
    search: ''
  });
  const { user } = useContext(AuthContext);

  const fetchDeveloperTools = async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const requestParams = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
        ...params
      };
      
      const data = await apiClient.getDeveloperServices(requestParams);
      setTools(data.tools || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        page: data.page || prev.page,
        page_size: data.page_size || prev.page_size
      }));
    } catch (err) {
      console.error("Failed to fetch developer tools:", err);
      setError('无法加载您的工具，请稍后再试。');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && user.role === 'developer') { // Ensure user is a developer before fetching
        fetchDeveloperTools();
    }
  }, [user]); // Refetch if user changes, though role change during session is unlikely

  useEffect(() => {
    if (user && user.role === 'developer') {
      fetchDeveloperTools();
    }
  }, [pagination.page, pagination.page_size, filters.status, filters.is_public, filters.search]);

  const handleServiceAdded = () => {
    fetchDeveloperTools(); // Callback to refresh the list after a new service is added
  };

  const handleServiceUpdated = () => {
    fetchDeveloperTools(); // Callback to refresh the list after a service is updated
    setEditingToolId(null); // Close edit form
  };

  const handleEditTool = (toolId) => {
    setEditingToolId(toolId);
  };

  const handleCancelEdit = () => {
    setEditingToolId(null);
  };

  const handleTestTool = (tool) => {
    setTestingTool(tool);
  };

  const handleCloseTestModal = () => {
    setTestingTool(null);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  const handleDeleteTool = async (toolId) => {
    if (window.confirm('您确定要删除这个工具吗？此操作无法撤销。')) {
      try {
        const response = await apiClient.deleteDeveloperService(toolId);
        
        if (response && (response.status === 200 || response.status === 204)) {
          setTools(prevTools => prevTools.filter(tool => tool.tool_id !== toolId));
          toast.success('工具删除成功');
        } else {
          throw new Error(response?.data?.message || '删除失败');
        }
      } catch (err) {
        console.error("Failed to delete tool:", err);
        toast.error(`删除工具失败: ${err.message || '未知错误'}`);
        setError(`删除工具 ${toolId} 失败。`);
      }
    }
  };

  // Placeholder for future navigation or modal for adding/editing tools
  // const handleAddTool = () => { // This button and handler will be removed
  //   console.log("Navigate to Add Tool form or open modal.");
  // };

  if (!user || user.role !== 'developer') {
    return (
      <PageWrapper>
        <h1>访问受限</h1>
        <p>您需要以开发者身份登录才能访问此页面。</p>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return <PageWrapper><p>正在加载工具...</p></PageWrapper>;
  }

  if (error && tools.length === 0) { // Show general error only if no tools are loaded yet
    return <PageWrapper><p style={{ color: 'red' }}>{error}</p></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>开发者控制台</h1>
        {/* AddToolButton is removed */}
      </div>
      
      {!editingToolId && <AddServiceForm onServiceAdded={handleServiceAdded} />}
      
      {editingToolId && (
        <EditServiceForm 
          toolId={editingToolId}
          onServiceUpdated={handleServiceUpdated}
          onCancel={handleCancelEdit}
        />
      )}

      <h2>已上传的服务</h2>
      
      <FilterSection>
        <input
          type="text"
          placeholder="搜索服务名称或描述..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">所有状态</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已禁用</option>
          <option value="pending">待审核</option>
        </select>
        <select
          value={filters.is_public === undefined ? '' : filters.is_public.toString()}
          onChange={(e) => handleFilterChange('is_public', e.target.value === '' ? undefined : e.target.value === 'true')}
        >
          <option value="">所有可见性</option>
          <option value="true">公开</option>
          <option value="false">私有</option>
        </select>
        <select
          value={pagination.page_size}
          onChange={(e) => setPagination(prev => ({ ...prev, page_size: parseInt(e.target.value), page: 1 }))}
        >
          <option value={5}>5条/页</option>
          <option value={10}>10条/页</option>
          <option value={20}>20条/页</option>
          <option value={50}>50条/页</option>
        </select>
      </FilterSection>
      {error && <p style={{ color: 'red' }}>列表更新错误: {error}</p>} {/* Show list-specific error here */}
      {isLoading && tools.length === 0 && <p>正在加载列表...</p>} {/* Show loading only if tools aren't there yet */}
      {!isLoading && tools.length === 0 && !error && (
        <p>暂无已上传的服务</p>
      )}
      {!isLoading && tools.length > 0 && (
        <ToolList>
          {tools.map(tool => (
            <ToolListItem key={tool.tool_id}>
              <div>
                <h3>{tool.name}</h3>
                <p>ID: <span>{tool.tool_id}</span></p>
                <p>类型: <span>{tool.type}</span></p>
                <p>平台: <span>{tool.endpoint?.platform_type?.toUpperCase() || tool.server_name?.toUpperCase() || 'N/A'}</span></p>
                <p>状态: <span style={{ color: tool.status === 'enabled' ? 'green' : 'orange' }}>
                  {tool.status === 'enabled' ? '已启用' : tool.status === 'disabled' ? '已禁用' : tool.status}
                </span></p>
                <p>版本: <span>{tool.version}</span></p>
                <p>下载次数: <span>{tool.download_count || 0}</span></p>
                <p>评分: <span>{tool.rating || 0}</span></p>
                <p>创建时间: <span>{new Date(tool.created_at).toLocaleDateString()}</span></p>
                <p>描述: {tool.description || '无描述'}</p>
                {tool.tags && tool.tags.length > 0 && (
                  <p>标签: <span>{tool.tags.join(', ')}</span></p>
                )}
              </div>
              <ActionsContainer>
                <EditButton onClick={() => handleEditTool(tool.tool_id)}>编辑</EditButton>
                <TestButton onClick={() => handleTestTool(tool)}>测试</TestButton>
                <DeleteButton onClick={() => handleDeleteTool(tool.tool_id)}>删除</DeleteButton>
              </ActionsContainer>
            </ToolListItem>
          ))}
        </ToolList>
      )}
      
      {!isLoading && tools.length > 0 && (
        <PaginationSection>
          <div className="pagination-info">
            显示第 {((pagination.page - 1) * pagination.page_size) + 1} - {Math.min(pagination.page * pagination.page_size, pagination.total)} 条，
            共 {pagination.total} 条记录
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              上一页
            </button>
            <span>第 {pagination.page} 页</span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.page_size >= pagination.total}
            >
              下一页
            </button>
          </div>
        </PaginationSection>
      )}
      
      {/* 测试工具模态框 */}
      <TestToolModal 
        tool={testingTool}
        isOpen={!!testingTool}
        onClose={handleCloseTestModal}
      />
    </PageWrapper>
  );
};

export default DeveloperConsolePage; 