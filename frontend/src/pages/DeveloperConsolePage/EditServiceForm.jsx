import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import apiClient from '../../services/apiClient';
import { toast } from '../../components/common/Toast';

const FormWrapper = styled.div`
  background-color: var(--surface-medium, #f0f0f0);
  padding: 1.5rem;
  border-radius: var(--radius-lg, 12px);
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: var(--text-strong, #333);
  }
  input[type="text"],
  input[type="password"],
  input[type="url"],
  select,
  textarea {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid var(--border-color-light, #ccc);
    border-radius: var(--radius-base, 8px);
    font-size: 1rem;
    background-color: var(--surface-input, #fff);
    color: var(--text-input, #333);
    &:focus {
      border-color: var(--color-primary, #4FD1C5);
      box-shadow: 0 0 0 2px rgba(79, 209, 197, 0.2);
      outline: none;
    }
  }
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  small {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: var(--text-muted, #777);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const PrimaryButton = styled.button`
  background-color: var(--color-primary, #4FD1C5);
  color: white;
  &:hover { background-color: #3dbbab; }
  &:disabled {
    background-color: var(--color-primary-disabled, #b2dfdb);
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const SecondaryButton = styled.button`
  background-color: var(--button-secondary-bg, #e2e8f0);
  color: var(--button-secondary-text, #2d3748);
  &:hover { background-color: #cbd5e0; }
`;


const initialFormState = {
  name: '',
  description: '',
  server_name: '',
  is_public: false,
  status: 'enabled',
  version: '1.0.0',
  tags: '',
  endpoint: {
    url: '',
    platform_type: 'http',
    auth_token: ''
  },
  request_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '用户输入内容'
      }
    },
    required: ['query']
  },
  response_schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'object' },
      message: { type: 'string' }
    }
  }
};

const EditServiceForm = ({ toolId, onServiceUpdated, onCancel }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // 加载工具数据
  useEffect(() => {
    const loadToolData = async () => {
      if (!toolId) return;
      
      setIsLoading(true);
      try {
        const toolData = await apiClient.getDeveloperServiceById(toolId);
        
        // 转换API数据到表单格式
        setFormData({
          name: toolData.name || '',
          description: toolData.description || '',
          server_name: toolData.server_name || '',
          is_public: toolData.is_public || false,
          status: toolData.status || 'enabled',
          version: toolData.version || '1.0.0',
          tags: Array.isArray(toolData.tags) ? toolData.tags.join(', ') : '',
          endpoint: {
            url: toolData.endpoint?.url || '',
            platform_type: toolData.endpoint?.platform_type || 'http',
            auth_token: toolData.endpoint?.auth_token || ''
          },
          request_schema: toolData.request_schema || initialFormState.request_schema,
          response_schema: toolData.response_schema || initialFormState.response_schema
        });
      } catch (error) {
        console.error('加载工具数据失败:', error);
        toast.error('加载工具数据失败: ' + (error.message || '未知错误'));
      } finally {
        setIsLoading(false);
      }
    };

    loadToolData();
  }, [toolId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('endpoint.')) {
      const fieldName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        endpoint: {
          ...prev.endpoint,
          [fieldName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);

    try {
      // 构建更新数据
      const updateData = {
        name: formData.name,
        description: formData.description,
        endpoint: formData.endpoint,
        request_schema: formData.request_schema,
        response_schema: formData.response_schema,
        server_name: formData.server_name,
        is_public: formData.is_public,
        status: formData.status,
        version: formData.version,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      console.log("更新工具数据:", updateData);
      const response = await apiClient.updateDeveloperService(toolId, updateData);
      
      if (response && (response.status === 200 || response.status === 201)) {
        toast.success(response.data?.message || response.data?.detail || '工具更新成功！');
        if (typeof onServiceUpdated === 'function') {
          onServiceUpdated();
        }
      } else {
        const errorMsg = response.data?.detail || response.data?.message || '更新工具失败，但服务器未返回明确错误信息。';
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("更新工具失败:", error);
      const errorMessage = error.message || '更新工具时发生意外错误，请检查网络或联系支持。';
      setSaveError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearForm = () => {
    setFormData(initialFormState);
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <FormWrapper>
        <h2>编辑工具</h2>
        <p>正在加载工具数据...</p>
      </FormWrapper>
    );
  }

  return (
    <FormWrapper>
      <h2>编辑工具</h2>
      
      {saveError && (
        <p style={{ color: 'red', backgroundColor: '#ffebee', border: '1px solid red', padding: '10px', borderRadius: '4px', marginBottom: '1rem' }}>
          更新错误: {saveError}
        </p>
      )}

      <FormGroup>
        <label htmlFor="name">工具名称*</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          required 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="description">工具描述*</label>
        <textarea 
          id="description" 
          name="description" 
          value={formData.description} 
          onChange={handleChange} 
          required 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="server_name">服务器名称</label>
        <input 
          type="text" 
          id="server_name" 
          name="server_name" 
          value={formData.server_name} 
          onChange={handleChange} 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="version">版本</label>
        <input 
          type="text" 
          id="version" 
          name="version" 
          value={formData.version} 
          onChange={handleChange} 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="tags">标签</label>
        <input 
          type="text" 
          id="tags" 
          name="tags" 
          value={formData.tags} 
          onChange={handleChange} 
          placeholder="用逗号分隔多个标签"
        />
        <small>用逗号分隔多个标签，例如：dify, weather, api</small>
      </FormGroup>

      <FormGroup>
        <label htmlFor="endpoint.url">端点URL</label>
        <input 
          type="url" 
          id="endpoint.url" 
          name="endpoint.url" 
          value={formData.endpoint.url} 
          onChange={handleChange} 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="endpoint.platform_type">平台类型</label>
        <select 
          id="endpoint.platform_type" 
          name="endpoint.platform_type" 
          value={formData.endpoint.platform_type} 
          onChange={handleChange}
        >
          <option value="http">HTTP</option>
          <option value="dify">Dify</option>
          <option value="coze">Coze</option>
        </select>
      </FormGroup>

      <FormGroup>
        <label htmlFor="endpoint.auth_token">API密钥</label>
        <input 
          type="password" 
          id="endpoint.auth_token" 
          name="endpoint.auth_token" 
          value={formData.endpoint.auth_token} 
          onChange={handleChange} 
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="status">状态</label>
        <select 
          id="status" 
          name="status" 
          value={formData.status} 
          onChange={handleChange}
        >
          <option value="enabled">已启用</option>
          <option value="disabled">已禁用</option>
          <option value="pending">待审核</option>
        </select>
      </FormGroup>

      <FormGroup>
        <label>
          <input 
            type="checkbox" 
            name="is_public" 
            checked={formData.is_public} 
            onChange={handleChange} 
          />
          公开工具
        </label>
        <small>公开的工具可以被其他用户使用</small>
      </FormGroup>

      <ButtonGroup>
        <PrimaryButton onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存更改'}
        </PrimaryButton>
        <SecondaryButton onClick={handleClearForm} disabled={isSaving}>
          重置表单
        </SecondaryButton>
        <SecondaryButton onClick={onCancel} disabled={isSaving}>
          取消编辑
        </SecondaryButton>
      </ButtonGroup>
    </FormWrapper>
  );
};

export default EditServiceForm;
