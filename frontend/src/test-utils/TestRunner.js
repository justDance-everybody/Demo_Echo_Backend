import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
// 移除循环引用
// import { runTest, runTestSuite, getAllTests } from './index';
import Logger from './Logger';

// 临时移至此文件的功能
// 以后可以重构到单独的实用工具文件中
import allComprehensiveTests from './tests/comprehensive.test';
import allServiceTests from './tests/service.test';
import allServiceViewTests from './e2e/ServiceViewModeTest';

/**
 * 获取所有可用的测试集合
 * @returns {Object} 所有测试集合
 */
function getAllTests() {
  return {
    comprehensive: allComprehensiveTests,
    services: allServiceTests,
    serviceView: allServiceViewTests
  };
}

/**
 * 运行单个测试
 * @param {Object} test 测试配置对象
 * @returns {Promise<boolean>} 测试结果
 */
async function runTest(test) {
  Logger.info('TestRunner', `开始运行测试: ${test.name}`);
  Logger.info('TestRunner', test.description);
  
  let success = true;
  let currentStep = 0;
  
  try {
    // 按顺序执行每个测试步骤
    for (const step of test.steps) {
      currentStep++;
      Logger.info('TestRunner', `步骤 ${currentStep}/${test.steps.length}: ${step.name}`);
      
      try {
        await step.action();
        Logger.success('TestRunner', `步骤 ${currentStep} 通过: ${step.name}`);
      } catch (error) {
        Logger.error('TestRunner', `步骤 ${currentStep} 失败: ${step.name}`, error);
        success = false;
        break;
      }
    }
    
    if (success) {
      Logger.success('TestRunner', `测试通过: ${test.name}`);
    } else {
      Logger.error('TestRunner', `测试失败: ${test.name} (在步骤 ${currentStep}/${test.steps.length})`);
    }
  } catch (error) {
    Logger.error('TestRunner', `测试执行中断: ${test.name}`, error);
    success = false;
  }
  
  return success;
}

/**
 * 运行一组测试
 * @param {Array} tests 测试数组
 * @returns {Promise<Object>} 测试结果统计
 */
async function runTestSuite(tests) {
  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    details: []
  };
  
  Logger.info('TestRunner', `开始运行测试套件，共 ${tests.length} 个测试`);
  
  for (const test of tests) {
    const success = await runTest(test);
    
    results.details.push({
      name: test.name,
      success
    });
    
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  Logger.info('TestRunner', `测试套件运行完成。通过: ${results.passed}，失败: ${results.failed}`);
  return results;
}

const TestRunnerContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
`;

const TestHeader = styled.header`
  margin-bottom: 20px;
  
  h1 {
    font-size: var(--font-size-2xl);
    color: var(--text);
    margin-bottom: 10px;
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
`;

const TestControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  padding: 10px 15px;
  border-radius: var(--radius-md);
  background-color: ${props => props.primary ? 'var(--color-primary)' : 'var(--surface-2)'};
  color: ${props => props.primary ? 'white' : 'var(--text)'};
  border: 1px solid ${props => props.primary ? 'var(--color-primary)' : 'var(--border)'};
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  
  &:hover {
    background-color: ${props => props.primary ? 'var(--color-primary-dark)' : 'var(--surface-3)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TestList = styled.div`
  margin-bottom: 20px;
`;

const TestCategory = styled.div`
  margin-bottom: 15px;
  
  h3 {
    font-size: var(--font-size-lg);
    color: var(--text);
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--border);
  }
`;

const TestItem = styled.div`
  padding: 10px;
  margin-bottom: 5px;
  border-radius: var(--radius-md);
  background-color: var(--surface-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background-color: var(--surface-3);
  }
  
  .test-name {
    font-weight: var(--font-weight-medium);
    color: var(--text);
  }
  
  .test-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: 5px;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background-color: ${props => {
    if (props.status === 'running') return 'var(--color-warning-light)';
    if (props.status === 'passed') return 'var(--color-success-light)';
    if (props.status === 'failed') return 'var(--color-error-light)';
    return 'var(--surface-3)';
  }};
  color: ${props => {
    if (props.status === 'running') return 'var(--color-warning-dark)';
    if (props.status === 'passed') return 'var(--color-success-dark)';
    if (props.status === 'failed') return 'var(--color-error-dark)';
    return 'var(--text-secondary)';
  }};
`;

const TestProgress = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: var(--surface-2);
  border-radius: var(--radius-md);
  
  h3 {
    font-size: var(--font-size-lg);
    color: var(--text);
    margin-bottom: 10px;
  }
  
  .progress-bar {
    height: 10px;
    background-color: var(--surface-3);
    border-radius: var(--radius-sm);
    margin-bottom: 15px;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background-color: var(--color-primary);
      width: ${props => props.progress || 0}%;
      transition: width 0.3s ease;
    }
  }
  
  .progress-stats {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
    
    .stat {
      display: flex;
      align-items: center;
      gap: 5px;
      
      &.passed {
        color: var(--color-success);
      }
      
      &.failed {
        color: var(--color-error);
      }
    }
  }
`;

const LogViewer = styled.div`
  margin-top: 20px;
  
  h3 {
    font-size: var(--font-size-lg);
    color: var(--text);
    margin-bottom: 10px;
  }
  
  .log-container {
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
    background-color: var(--surface-1);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    font-family: monospace;
    white-space: pre-wrap;
    
    .log-info {
      color: var(--text);
    }
    
    .log-success {
      color: var(--color-success);
    }
    
    .log-error {
      color: var(--color-error);
    }
    
    .log-warning {
      color: var(--color-warning);
    }
  }
`;

const TestRunner = () => {
  const [testCategories, setTestCategories] = useState({});
  const [selectedTests, setSelectedTests] = useState([]);
  const [testStatuses, setTestStatuses] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ passed: 0, failed: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  
  // 初始化测试项
  useEffect(() => {
    const allTests = getAllTests();
    setTestCategories(allTests);
    
    // 监听日志事件
    const handleLogEvent = (event) => {
      const { level, category, message, data, timestamp } = event.detail;
      setLogs(prev => [...prev, { 
        level, 
        category, 
        message, 
        data, 
        timestamp 
      }]);
    };
    
    // 添加日志监听器
    window.addEventListener('test-log', handleLogEvent);
    
    return () => {
      window.removeEventListener('test-log', handleLogEvent);
    };
  }, []);
  
  // 处理测试选择
  const handleTestSelect = (category, testIndex) => {
    const test = testCategories[category][testIndex];
    const testId = `${category}_${testIndex}`;
    
    setSelectedTests(prev => {
      const isSelected = prev.some(t => t.id === testId);
      
      if (isSelected) {
        return prev.filter(t => t.id !== testId);
      } else {
        return [...prev, { id: testId, category, testIndex, test }];
      }
    });
  };
  
  // 处理运行选中的测试
  const handleRunSelected = async () => {
    if (selectedTests.length === 0 || isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setResults({ passed: 0, failed: 0, total: selectedTests.length });
    setLogs([]);
    
    // 重置所有测试状态
    const initialStatuses = {};
    selectedTests.forEach(test => {
      initialStatuses[test.id] = 'pending';
    });
    setTestStatuses(initialStatuses);
    
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < selectedTests.length; i++) {
      const { id, test } = selectedTests[i];
      
      // 更新当前测试状态为运行中
      setTestStatuses(prev => ({ ...prev, [id]: 'running' }));
      
      try {
        const success = await runTest(test);
        
        if (success) {
          passed++;
          setTestStatuses(prev => ({ ...prev, [id]: 'passed' }));
        } else {
          failed++;
          setTestStatuses(prev => ({ ...prev, [id]: 'failed' }));
        }
      } catch (error) {
        failed++;
        setTestStatuses(prev => ({ ...prev, [id]: 'failed' }));
        Logger.error('TestRunner', `测试执行错误: ${test.name}`, error);
      }
      
      // 更新进度
      const currentProgress = Math.round(((i + 1) / selectedTests.length) * 100);
      setProgress(currentProgress);
      setResults({ passed, failed, total: selectedTests.length });
    }
    
    setIsRunning(false);
    Logger.info('TestRunner', `测试完成。通过: ${passed}，失败: ${failed}，总计: ${selectedTests.length}`);
  };
  
  // 处理运行所有测试
  const handleRunAll = () => {
    if (isRunning) return;
    
    // 选择所有测试
    const allSelected = [];
    Object.entries(testCategories).forEach(([category, tests]) => {
      tests.forEach((test, index) => {
        allSelected.push({ 
          id: `${category}_${index}`, 
          category, 
          testIndex: index, 
          test 
        });
      });
    });
    
    setSelectedTests(allSelected);
    
    // 运行所有测试
    setTimeout(handleRunSelected, 0);
  };
  
  // 处理清除选择
  const handleClearSelection = () => {
    if (isRunning) return;
    setSelectedTests([]);
  };
  
  return (
    <TestRunnerContainer>
      <TestHeader>
        <h1>端到端测试运行器</h1>
        <p>选择要运行的测试，然后点击"运行选中的测试"按钮来执行测试。</p>
      </TestHeader>
      
      <TestControls>
        <Button 
          primary 
          onClick={handleRunSelected} 
          disabled={isRunning || selectedTests.length === 0}
        >
          运行选中的测试 ({selectedTests.length})
        </Button>
        <Button 
          onClick={handleRunAll} 
          disabled={isRunning}
        >
          运行所有测试
        </Button>
        <Button 
          onClick={handleClearSelection} 
          disabled={isRunning || selectedTests.length === 0}
        >
          清除选择
        </Button>
      </TestControls>
      
      {isRunning && (
        <TestProgress progress={progress}>
          <h3>测试进度</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-stats">
            <div>执行中: {progress}%</div>
            <div className="stat passed">通过: {results.passed}</div>
            <div className="stat failed">失败: {results.failed}</div>
            <div>总计: {results.total}</div>
          </div>
        </TestProgress>
      )}
      
      <TestList>
        {Object.entries(testCategories).map(([category, tests]) => (
          <TestCategory key={category}>
            <h3>{category.charAt(0).toUpperCase() + category.slice(1)} 测试 ({tests.length})</h3>
            {tests.map((test, index) => {
              const testId = `${category}_${index}`;
              const isSelected = selectedTests.some(t => t.id === testId);
              const status = testStatuses[testId];
              
              return (
                <TestItem 
                  key={testId} 
                  onClick={() => !isRunning && handleTestSelect(category, index)}
                  style={{ 
                    backgroundColor: isSelected ? 'var(--surface-3)' : 'var(--surface-2)',
                    cursor: isRunning ? 'default' : 'pointer'
                  }}
                >
                  <div>
                    <div className="test-name">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {}} 
                        disabled={isRunning}
                      /> {test.name}
                    </div>
                    <div className="test-description">{test.description}</div>
                  </div>
                  {status && (
                    <StatusBadge status={status}>
                      {status === 'pending' && '等待中'}
                      {status === 'running' && '运行中'}
                      {status === 'passed' && '通过'}
                      {status === 'failed' && '失败'}
                    </StatusBadge>
                  )}
                </TestItem>
              );
            })}
          </TestCategory>
        ))}
      </TestList>
      
      <LogViewer>
        <h3>测试日志</h3>
        <div className="log-container">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`log-${log.level.toLowerCase()}`}
            >
              [{new Date(log.timestamp).toLocaleTimeString()}] [{log.category}] {log.message}
              {log.data && ` ${JSON.stringify(log.data)}`}
            </div>
          ))}
        </div>
      </LogViewer>
    </TestRunnerContainer>
  );
};

export default TestRunner; 