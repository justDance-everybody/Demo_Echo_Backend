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

const ConditionalFieldsWrapper = styled.div`
  border-left: 3px solid var(--color-primary-light, #a0ded8);
  padding-left: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const ButtonGroup = styled.div`
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-start;

  button {
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: var(--radius-md, 6px);
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s ease, opacity 0.2s ease;
  }
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

const TestSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--border-color-light, #ccc);

  input[type="text"] {
    margin-bottom: 0.5rem;
  }
`;

const TestResultArea = styled.pre`
  background-color: var(--surface-code, #2d2d2d);
  color: var(--text-code, #f0f0f0);
  padding: 1rem;
  border-radius: var(--radius-base, 8px);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color-dark, #444);
`;

const initialFormState = {
  serviceName: '',
  serviceDescription: '',
  platformType: 'dify',
  endpointUrl: '',
  apiKey: '',
  difyAppId: '',
  cozeBotId: '',
  userInputVar: 'query',
  documentation: '',
  testInput: '',
};

const AddServiceForm = ({ onServiceAdded }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [testResult, setTestResult] = useState('等待测试...');
  const [isTestSuccessful, setIsTestSuccessful] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset conditional fields when platformType changes
  useEffect(() => {
    if (formData.platformType === 'dify') {
      setFormData(prev => ({ ...prev, cozeBotId: '' }));
    } else if (formData.platformType === 'coze') {
      setFormData(prev => ({ ...prev, difyAppId: '' }));
    }
  }, [formData.platformType]);

  const handleClearForm = () => {
    setFormData(initialFormState);
    setTestResult('等待测试...');
    setIsTestSuccessful(false);
    setIsTesting(false);
  };

  const handleTestService = async () => {
    setIsTesting(true);
    setTestResult('正在测试中...');
    setIsTestSuccessful(false);
    setSaveError(null);

    const { 
      serviceName, 
      serviceDescription, 
      platformType, 
      endpointUrl, 
      apiKey, 
      difyAppId, 
      cozeBotId, 
      userInputVar,
      testInput 
    } = formData;

    let toolConfiguration = {
      name: serviceName,
      description: serviceDescription,
      platform_type: platformType,
      endpoint_config: {
        url: endpointUrl,
      },
      authentication: apiKey ? { type: "bearer", token: apiKey } : null,
    };

    if (platformType === 'dify') {
      toolConfiguration.dify_config = {
        app_id: difyAppId,
        user_input_variable: userInputVar || 'query',
      };
      if (apiKey) toolConfiguration.authentication = { type: "bearer", token: apiKey }; 
    } else if (platformType === 'coze') {
      toolConfiguration.coze_config = {
        bot_id: cozeBotId,
        user_input_variable: userInputVar || 'query',
      };
      if (apiKey) toolConfiguration.authentication = { type: "bearer", token: apiKey }; 
    } else if (platformType === 'http') {
      toolConfiguration.http_config = {
        user_input_variable: userInputVar || 'query',
      };
      if (apiKey) {
        toolConfiguration.authentication = { type: "bearer", token: apiKey }; 
      }
    }
    
    if (platformType === 'dify' || platformType === 'coze') {
        if(endpointUrl) toolConfiguration.endpoint_config.url = endpointUrl;
    }

    const payload = {
      tool_config: toolConfiguration,
      test_input: testInput || ""
    };

    try {
      console.log("Testing with payload:", JSON.stringify(payload, null, 2));
      const response = await apiClient.testUnsavedDeveloperTool(payload);
      
      if (response.data && response.data.success) {
        setTestResult(JSON.stringify(response.data.data || response.data, null, 2));
        setIsTestSuccessful(true);
        toast.success(response.data.message || 'API Test successful!');
      } else {
        setTestResult(JSON.stringify(response.data || { error: "Test failed with non-success response" }, null, 2));
        setIsTestSuccessful(false);
        toast.error(response.data.message || 'API Test failed. Check configuration.');
      }

    } catch (error) {
      console.error("API Test Error:", error);
      const errorMessage = error.message || 'API Test failed due to an unexpected error.';
      setTestResult(JSON.stringify({ error: errorMessage, details: error.originalError?.response?.data || error }, null, 2));
      setIsTestSuccessful(false);
      toast.error(errorMessage);
    }
    setIsTesting(false);
  };

  const handleSaveService = async () => {
    if (!isTestSuccessful) {
      toast.warn('请先成功测试该服务后再保存。');
      return;
    }
    setSaveError(null); // Clear previous save errors before attempting to save

    const { 
      serviceName, 
      serviceDescription, 
      platformType, 
      endpointUrl, 
      apiKey, 
      difyAppId, 
      cozeBotId, 
      userInputVar,
      documentation // This comes from formData
    } = formData;

    let serviceDataPayload = {
      name: serviceName,
      description: serviceDescription,
      platform_type: platformType,
      endpoint_config: {
        url: endpointUrl, // May be empty if not applicable (e.g. Dify/Coze if backend handles URL by ID)
      },
      authentication: null, // Default to null, will be set based on apiKey and platformType
      documentation: documentation || '',
    };

    // Platform-specific configurations and authentication overrides
    if (platformType === 'dify') {
      serviceDataPayload.dify_config = {
        app_id: difyAppId,
        user_input_variable: userInputVar || 'query',
      };
      if (apiKey) serviceDataPayload.authentication = { type: "bearer", token: apiKey };
    } else if (platformType === 'coze') {
      serviceDataPayload.coze_config = {
        bot_id: cozeBotId,
        user_input_variable: userInputVar || 'query',
      };
      if (apiKey) serviceDataPayload.authentication = { type: "bearer", token: apiKey };
    } else if (platformType === 'http') {
      serviceDataPayload.http_config = {
        user_input_variable: userInputVar || 'query',
      };
      // For generic HTTP, if an API key is provided, assume Bearer token for now.
      // This could be made more configurable (e.g. allowing user to specify header name/type).
      if (apiKey) serviceDataPayload.authentication = { type: "bearer", token: apiKey };
    }

    // If endpointUrl is not relevant for Dify/Coze because backend handles it via ID,
    // ensure it's not sent or handled appropriately by backend if it is.
    // If it IS the base URL, this is fine.
    // For now, `endpointUrl` is included in `endpoint_config` if provided.
    if (!endpointUrl && (platformType === 'dify' || platformType === 'coze')) {
        // If endpointUrl is truly optional and not provided for Dify/Coze, 
        // we might want to remove `url` from `endpoint_config` or send it as empty.
        // The current structure sends it as `formData.endpointUrl` which could be an empty string.
        // Let's ensure endpoint_config.url is only set if endpointUrl has a value.
        if (formData.endpointUrl) {
             serviceDataPayload.endpoint_config.url = formData.endpointUrl;
        } else {
            delete serviceDataPayload.endpoint_config.url; // Or set to null, depending on backend
        }
    }

    try {
      console.log("Attempting to save service with payload:", JSON.stringify(serviceDataPayload, null, 2));
      const response = await apiClient.createDeveloperService(serviceDataPayload);
      
      // Check for successful status codes (200 OK or 201 Created)
      // Also, some APIs might return success messages in response.data.message or response.data.detail
      if (response && (response.status === 200 || response.status === 201)) {
        toast.success(response.data?.message || response.data?.detail || '服务已成功保存！');
        if (typeof onServiceAdded === 'function') {
            onServiceAdded(); // Callback to refresh the list in the parent component
        }
        handleClearForm(); // Clear the form fields
      } else {
        // This case handles scenarios where the server returns a 2xx status but indicates a logical error in the response body.
        const errorMsg = response.data?.detail || response.data?.message || '保存服务失败，但服务器未返回明确错误信息。';
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error during save service:", error);
      // error.message comes from the apiClient interceptor for network/server errors
      const errorMessage = error.message || '保存服务时发生意外错误，请检查网络或联系支持。';
      setSaveError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <FormWrapper>
      <h2>添加新服务</h2>
      {/* Display the saveError state message if it exists */}
      {saveError && (
        <p style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error-bg)', border: 'var(--border-width-sm) solid var(--color-error)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-sm)', marginBottom: 'var(--spacing-lg)' }}>
          保存错误: {saveError}
        </p>
      )}
      <FormGroup>
        <label htmlFor="serviceName">服务名称*</label>
        <input type="text" id="serviceName" name="serviceName" value={formData.serviceName} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <label htmlFor="serviceDescription">服务描述*</label>
        <textarea id="serviceDescription" name="serviceDescription" value={formData.serviceDescription} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <label htmlFor="platformType">平台类型*</label>
        <select id="platformType" name="platformType" value={formData.platformType} onChange={handleChange} required>
          <option value="dify">Dify</option>
          <option value="coze">Coze</option>
          <option value="http">通用 HTTP</option>
        </select>
      </FormGroup>

      <FormGroup>
        <label htmlFor="endpointUrl">Endpoint URL*</label>
        <input type="url" id="endpointUrl" name="endpointUrl" value={formData.endpointUrl} onChange={handleChange} placeholder="例如: https://api.dify.ai/v1" required />
        {formData.platformType === 'dify' && <small>对于Dify, 通常是 <code>https://api.dify.ai/v1/chat-messages</code> 或类似对话完成的端点。</small>}
        {formData.platformType === 'coze' && <small>对于Coze, 通常是 <code>https://api.coze.com/open_api/v2/chat</code> 端点。</small>}
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="apiKey">API 密钥/Token*</label>
        <input type="password" id="apiKey" name="apiKey" value={formData.apiKey} onChange={handleChange} required />
        {formData.platformType === 'http' && <small>对于通用HTTP服务，此密钥将作为 Bearer Token 在 Authorization 请求头中发送。</small>}
        {(formData.platformType === 'dify' || formData.platformType === 'coze') && <small>请输入您从 Dify 或 Coze 平台获取的 API Key/Token。</small>}
      </FormGroup>

      {formData.platformType === 'dify' && (
        <ConditionalFieldsWrapper>
          <FormGroup>
            <label htmlFor="difyAppId">Dify App ID*</label>
            <input type="text" id="difyAppId" name="difyAppId" value={formData.difyAppId} onChange={handleChange} required={formData.platformType === 'dify'} />
          </FormGroup>
        </ConditionalFieldsWrapper>
      )}

      {formData.platformType === 'coze' && (
        <ConditionalFieldsWrapper>
          <FormGroup>
            <label htmlFor="cozeBotId">Coze Bot ID*</label>
            <input type="text" id="cozeBotId" name="cozeBotId" value={formData.cozeBotId} onChange={handleChange} required={formData.platformType === 'coze'} />
          </FormGroup>
        </ConditionalFieldsWrapper>
      )}
      
      <FormGroup>
        <label htmlFor="userInputVar">用户输入字段名*</label>
        <input type="text" id="userInputVar" name="userInputVar" value={formData.userInputVar} onChange={handleChange} required />
        <small>第三方API接收用户输入时使用的参数名，例如 Dify/Coze 中的 'query' 或 'user_input'。</small>
      </FormGroup>

      <FormGroup>
        <label htmlFor="documentation">说明文档 (Markdown)*</label>
        <textarea id="documentation" name="documentation" value={formData.documentation} onChange={handleChange} placeholder="请详细描述服务用途、输入参数、示例输入和输出..." required />
      </FormGroup>

      <ButtonGroup>
        <PrimaryButton onClick={handleSaveService} disabled={!isTestSuccessful || isTesting}>保存服务</PrimaryButton>
        <SecondaryButton onClick={handleClearForm} disabled={isTesting}>清空表单</SecondaryButton>
      </ButtonGroup>

      <TestSection>
        <h4>接口测试区</h4>
        <FormGroup>
            <label htmlFor="testInput">测试输入内容:</label>
            <input type="text" id="testInput" name="testInput" value={formData.testInput} onChange={handleChange} placeholder="输入测试文本..." disabled={isTesting} />
            <PrimaryButton onClick={handleTestService} style={{marginTop: '0.5rem'}} disabled={isTesting}>
              {isTesting ? '正在测试...' : '发送测试请求'}
            </PrimaryButton>
        </FormGroup>
        <FormGroup>
            <label>测试响应:</label>
            <TestResultArea>
                {testResult}
            </TestResultArea>
        </FormGroup>
      </TestSection>

    </FormWrapper>
  );
};

export default AddServiceForm;