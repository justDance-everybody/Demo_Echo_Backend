import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

// 样式编辑器容器
const EditorContainer = styled.div`
  padding: 0.5rem;
  max-width: 100%;
  overflow-x: hidden;
`;

// 变量组
const VariableGroup = styled.div`
  margin-bottom: 1.5rem;
`;

// 标题
const GroupTitle = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--text-color);
`;

// 变量行
const VariableRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: var(--border-radius, 4px);
  background-color: ${props => props.theme?.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'};
`;

// 变量名
const VariableName = styled.div`
  flex: 1;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

// 颜色输入
const ColorInput = styled.input`
  width: 100px;
  border: 1px solid var(--border-color);
  padding: 0.25rem;
  border-radius: var(--border-radius, 4px);
  background-color: var(--input-bg);
  color: var(--text-color);
`;

// 按钮
const Button = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius, 4px);
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: 0.9rem;
  
  &:hover {
    opacity: 0.9;
  }
`;

// 重置按钮
const ResetButton = styled(Button)`
  background-color: ${props => props.theme?.isDark ? '#4a5568' : '#e2e8f0'};
  color: ${props => props.theme?.isDark ? 'white' : '#1a202c'};
`;

// 按钮组
const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: 1rem;
  gap: 0.5rem;
`;

// 获取CSS变量的值
const getCssVar = (varName, defaultValue = '') => {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || defaultValue;
  }
  return defaultValue;
};

const StyleEditor = () => {
  const { theme, updateThemeVariable } = useTheme();
  const [variables, setVariables] = useState({});
  
  // 加载所有CSS变量
  useEffect(() => {
    const colors = {
      '--primary-color': getCssVar('--primary-color', '#4FD1C5'),
      '--secondary-color': getCssVar('--secondary-color', '#805AD5'),
      '--text-color': getCssVar('--text-color', '#F8F8F8'),
      '--background': getCssVar('--background', '#1E1E2F'),
      '--surface': getCssVar('--surface', '#27293D'),
      '--border-color': getCssVar('--border-color', '#2D3748'),
    };
    
    setVariables(colors);
  }, [theme.isDark]);
  
  // 处理变量值变化
  const handleVarChange = (varName, value) => {
    setVariables(prev => ({
      ...prev,
      [varName]: value
    }));
    
    // 更新文档中的CSS变量
    updateThemeVariable(varName, value);
  };
  
  // 导出为JSON
  const exportVarsAsJson = () => {
    const jsonContent = JSON.stringify(variables, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-variables.json';
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // 重置为默认值
  const resetToDefault = () => {
    const defaultVariables = {
      '--primary-color': theme.isDark ? '#4FD1C5' : '#38B2AC',
      '--secondary-color': theme.isDark ? '#805AD5' : '#6B46C1',
      '--text-color': theme.isDark ? '#F8F8F8' : '#1A202C',
      '--background': theme.isDark ? '#1E1E2F' : '#FFFFFF',
      '--surface': theme.isDark ? '#27293D' : '#F7FAFC',
      '--border-color': theme.isDark ? '#2D3748' : '#E2E8F0',
    };
    
    // 更新所有变量
    Object.entries(defaultVariables).forEach(([varName, value]) => {
      updateThemeVariable(varName, value);
    });
    
    // 更新状态
    setVariables(defaultVariables);
  };
  
  return (
    <EditorContainer>
      <GroupTitle>样式编辑器</GroupTitle>
      
      <VariableGroup>
        <GroupTitle>颜色变量</GroupTitle>
        {Object.entries(variables).map(([varName, value]) => (
          <VariableRow key={varName}>
            <VariableName>{varName}</VariableName>
            <ColorInput
              type="text"
              value={value}
              onChange={(e) => handleVarChange(varName, e.target.value)}
            />
          </VariableRow>
        ))}
      </VariableGroup>
      
      <ButtonGroup>
        <ResetButton onClick={resetToDefault} theme={theme}>
          重置为默认值
        </ResetButton>
        <Button onClick={exportVarsAsJson}>
          导出主题配置
        </Button>
      </ButtonGroup>
    </EditorContainer>
  );
};

export default StyleEditor; 