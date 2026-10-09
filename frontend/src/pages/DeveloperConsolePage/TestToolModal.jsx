import React, { useState } from 'react';
import styled from 'styled-components';
import apiClient from '../../services/apiClient';
import { toast } from '../../components/common/Toast';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-strong, #1a202c);
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #718096;
  &:hover {
    color: #2d3748;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-strong, #2d3748);
  }
  
  textarea {
    width: 100%;
    min-height: 120px;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: vertical;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary, #4FD1C5);
      box-shadow: 0 0 0 3px rgba(79, 209, 197, 0.1);
    }
  }
  
  input[type="number"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary, #4FD1C5);
      box-shadow: 0 0 0 3px rgba(79, 209, 197, 0.1);
    }
  }
  
  small {
    display: block;
    margin-top: 0.25rem;
    color: #718096;
    font-size: 0.875rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: var(--color-primary, #4FD1C5);
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #3dbbab;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: #e2e8f0;
  color: #2d3748;
  
  &:hover:not(:disabled) {
    background-color: #cbd5e0;
  }
`;

const ResultSection = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const ResultTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: var(--text-strong, #2d3748);
  font-size: 1.125rem;
`;

const ResultContent = styled.pre`
  background-color: #1a202c;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const ErrorMessage = styled.div`
  color: #e53e3e;
  background-color: #fed7d7;
  border: 1px solid #feb2b2;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  color: #2f855a;
  background-color: #c6f6d5;
  border: 1px solid #9ae6b4;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1rem;
`;

const TestToolModal = ({ tool, isOpen, onClose }) => {
  const [testData, setTestData] = useState('{\n  "query": "测试输入内容"\n}');
  const [timeout, setTimeout] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    if (!tool) return;
    
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      // 解析测试数据
      let parsedTestData;
      try {
        parsedTestData = JSON.parse(testData);
      } catch (parseError) {
        throw new Error('测试数据格式错误，请输入有效的JSON格式');
      }
      
      const response = await apiClient.testDeveloperTool(tool.tool_id, parsedTestData, timeout);
      
      if (response && (response.status === 200 || response.status === 201)) {
        setTestResult(response.data);
        if (response.data.success) {
          toast.success('工具测试成功');
        } else {
          toast.error(`工具测试失败: ${response.data.error || '未知错误'}`);
        }
      } else {
        throw new Error(response?.data?.message || '测试失败');
      }
    } catch (err) {
      console.error("测试工具失败:", err);
      setError(err.message || '测试工具时发生意外错误');
      toast.error(`测试工具失败: ${err.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen || !tool) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>测试工具: {tool.name}</ModalTitle>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </ModalHeader>
        
        <FormGroup>
          <label htmlFor="testData">测试数据 (JSON格式)</label>
          <textarea
            id="testData"
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder='{"query": "测试输入内容"}'
          />
          <small>请输入符合工具请求Schema的JSON格式测试数据</small>
        </FormGroup>
        
        <FormGroup>
          <label htmlFor="timeout">超时时间 (秒)</label>
          <input
            type="number"
            id="timeout"
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
            min="1"
            max="300"
          />
          <small>设置测试请求的超时时间，范围1-300秒</small>
        </FormGroup>
        
        {error && (
          <ErrorMessage>
            错误: {error}
          </ErrorMessage>
        )}
        
        {testResult && (
          <ResultSection>
            <ResultTitle>测试结果</ResultTitle>
            {testResult.success ? (
              <SuccessMessage>
                测试成功！执行时间: {testResult.execution_time}ms
              </SuccessMessage>
            ) : (
              <ErrorMessage>
                测试失败: {testResult.error || '未知错误'}
              </ErrorMessage>
            )}
            <ResultContent>
              {JSON.stringify(testResult, null, 2)}
            </ResultContent>
          </ResultSection>
        )}
        
        <ButtonGroup>
          <SecondaryButton onClick={handleClose}>
            关闭
          </SecondaryButton>
          <PrimaryButton onClick={handleTest} disabled={isLoading}>
            {isLoading ? '测试中...' : '开始测试'}
          </PrimaryButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TestToolModal;
