import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Assuming AuthContext is needed for user info or token
import apiClient from '../../services/apiClient'; // Assuming a central apiClient exists
import styled from 'styled-components';
import AddServiceForm from './AddServiceForm'; // Import the new form component

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

const ToggleStatusButton = styled.button`
  background-color: ${props => props.disabled ? 'var(--color-warning, #ECC94B)' : 'var(--color-success, #48BB78)'};
  color: white;
  &:hover { opacity: 0.8; }
`;

const DeleteButton = styled.button`
  background-color: var(--color-error, #F56565);
  color: white;
  &:hover { background-color: #e05252; }
`;

const AddToolButton = styled.button`
  background-color: var(--color-accent, #2c5282);
  color: white;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  border: none;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  &:hover { background-color: #224066; }
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
      // apiClient should be configured to send auth token if required by the backend for /api/dev/tools
      const response = await apiClient.get('/api/dev/tools'); 
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
      const response = await apiClient.put(`/api/dev/tools/${toolId}`, { status: newStatus });
      setTools(prevTools => 
        prevTools.map(tool => tool.tool_id === toolId ? { ...tool, status: newStatus } : tool)
      );
      // TODO: Add Toast notification for success
    } catch (err) {
      console.error("Failed to toggle tool status:", err);
      // TODO: Add Toast notification for error
      setError(`更新工具 ${toolId} 状态失败。`);
    }
  };

  const handleDeleteTool = async (toolId) => {
    if (window.confirm('您确定要删除这个工具吗？此操作无法撤销。')) {
      try {
        await apiClient.delete(`/api/dev/tools/${toolId}`);
        setTools(prevTools => prevTools.filter(tool => tool.tool_id !== toolId));
        // TODO: Add Toast notification for success
      } catch (err) {
        console.error("Failed to delete tool:", err);
        // TODO: Add Toast notification for error
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

  if (error && tools.length === 0) { // Show general error only if no tools are loaded yet
    return <PageWrapper><p style={{ color: 'red' }}>{error}</p></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>开发者控制台</h1>
        {/* AddToolButton is removed */}
      </div>
      
      <AddServiceForm onServiceAdded={handleServiceAdded} />

      <h2>已上传的服务</h2>
      {error && <p style={{ color: 'red' }}>列表更新错误: {error}</p>} {/* Show list-specific error here */}
      {isLoading && tools.length === 0 && <p>正在加载列表...</p>} {/* Show loading only if tools aren't there yet */}
      {!isLoading && tools.length === 0 && !error && (
        <ToolList>
          {tools.map(tool => (
            <ToolListItem key={tool.tool_id}>
              <div>
                <h3>{tool.name}</h3>
                <p>ID: <span>{tool.tool_id}</span></p>
                <p>平台: <span>{tool.endpoint?.platform_type?.toUpperCase() || 'N/A'}</span></p>
                <p>状态: <span style={{ color: tool.status === 'enabled' ? 'green' : 'orange' }}>
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