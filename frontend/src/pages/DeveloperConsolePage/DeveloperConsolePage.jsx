import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Assuming AuthContext is needed for user info or token
import apiClient from '../../services/apiClient'; // Assuming a central apiClient exists
import styled from 'styled-components';
import AddServiceForm from './AddServiceForm'; // Import the new form component

// Basic styling for the page and list (can be moved to a separate CSS file or enhanced)
const PageWrapper = styled.div`
  padding: var(--spacing-xxlarge);
  max-width: var(--content-max-width);
  margin: 0 auto;
`;

const ToolList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: var(--spacing-xxlarge);
`;

const ToolListItem = styled.li`
  background-color: var(--color-surface);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);

  h3 {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--color-text-primary);
  }
  p {
    margin: var(--spacing-xxs) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  span {
    font-weight: var(--font-weight-semibold);
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: var(--spacing-xs);

  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: none;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: var(--transition-default);
  }
`;

const EditButton = styled.button`
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  &:hover { background-color: var(--color-primary-hover); }
`;

const ToggleStatusButton = styled.button`
  background-color: ${props => props.disabled ? 'var(--color-warning)' : 'var(--color-success)'};
  color: var(--color-on-primary);
  &:hover { opacity: var(--opacity-hover); }
`;

const DeleteButton = styled.button`
  background-color: var(--color-error);
  color: var(--color-on-error);
  &:hover { background-color: var(--color-error-hover); }
`;

const AddToolButton = styled.button`
  background-color: var(--color-accent);
  color: var(--color-on-primary);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  &:hover { background-color: var(--color-accent-hover); }
`;


const DeveloperConsolePage = () => {
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext); // Get user info, potentially for filtering or display

  const fetchDeveloperTools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 使用现有的 /api/tools 端点而不是 /api/dev/tools
      const response = await apiClient.get('/api/tools'); 
      setTools(response.data.tools || []);
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

  const handleServiceAdded = () => {
    fetchDeveloperTools(); // Callback to refresh the list after a new service is added
  };

  const handleToggleStatus = async (toolId, currentStatus) => {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    try {
      // 注意：当前后端可能不支持工具状态更新，这里先显示警告
      console.warn('工具状态更新功能需要后端支持');
      alert('工具状态更新功能暂未实现，请联系管理员。');
      // const response = await apiClient.put(`/api/tools/${toolId}`, { status: newStatus });
      // setTools(prevTools => 
      //   prevTools.map(tool => tool.tool_id === toolId ? { ...tool, status: newStatus } : tool)
      // );
    } catch (err) {
      console.error("Failed to toggle tool status:", err);
      setError(`更新工具 ${toolId} 状态失败。`);
    }
  };

  const handleDeleteTool = async (toolId) => {
    if (window.confirm('您确定要删除这个工具吗？此操作无法撤销。')) {
      try {
        // 注意：当前后端可能不支持工具删除，这里先显示警告
        console.warn('工具删除功能需要后端支持');
        alert('工具删除功能暂未实现，请联系管理员。');
        // await apiClient.delete(`/api/tools/${toolId}`);
        // setTools(prevTools => prevTools.filter(tool => tool.tool_id !== toolId));
      } catch (err) {
        console.error("Failed to delete tool:", err);
        setError(`删除工具 ${toolId} 失败。`);
      }
    }
  };

  // Placeholder for future navigation or modal for adding/editing tools
  // const handleAddTool = () => { // This button and handler will be removed
  //   console.log("Navigate to Add Tool form or open modal.");
  // };

  const handleEditTool = (toolId) => {
    console.log(`Navigate to Edit Tool form for ${toolId} or open modal.`);
    // Example: history.push(`/developer/tools/edit/${toolId}`)
  };

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

  if (error && tools.length === 0) {
    return <PageWrapper><p style={{ color: 'var(--color-error)' }}>{error}</p></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xlarge)' }}>
        <h1>开发者控制台</h1>
        {/* AddToolButton is removed */}
      </div>
      
      <AddServiceForm onServiceAdded={handleServiceAdded} />

      <h2>已上传的服务</h2>
      {error && <p style={{ color: 'var(--color-error)' }}>列表更新错误: {error}</p>}
      {isLoading && tools.length === 0 && <p>正在加载列表...</p>} {/* Show loading only if tools aren't there yet */}
      {!isLoading && tools.length === 0 && !error && (
        <p>暂无已上传的服务。</p>
      )}
      {tools.length > 0 && (
        <ToolList>
          {tools.map(tool => (
            <ToolListItem key={tool.tool_id}>
              <div>
                <h3>{tool.name}</h3>
                <p>ID: <span>{tool.tool_id}</span></p>
                <p>平台: <span>{tool.endpoint?.platform_type?.toUpperCase() || 'N/A'}</span></p>
                <p>状态: <span style={{ color: tool.status === 'enabled' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {tool.status === 'enabled' ? '已启用' : '已禁用'}
                </span></p>
                <p>描述: {tool.description || '无描述'}</p>
              </div>
              <ActionsContainer>
                <EditButton onClick={() => handleEditTool(tool.tool_id)}>编辑</EditButton>
                <ToggleStatusButton 
                  onClick={() => handleToggleStatus(tool.tool_id, tool.status)}
                  disabled={tool.status === 'disabled'} // Style prop for color based on disabled status
                >
                  {tool.status === 'enabled' ? '禁用' : '启用'}
                </ToggleStatusButton>
                <DeleteButton onClick={() => handleDeleteTool(tool.tool_id)}>删除</DeleteButton>
              </ActionsContainer>
            </ToolListItem>
          ))}
        </ToolList>
      )}
    </PageWrapper>
  );
};

export default DeveloperConsolePage;