// TestRunner.js - 语音AI测试运行器组件

import React, { useState, useEffect, useRef, useContext } from 'react';
import testScenarios from './AutomatedTest';
import MockSpeech from '../test-utils/MockSpeech';
import Logger from '../test-utils/Logger';
import { Button, Card, Space, Typography, Tag } from 'antd';
import { ThemeContext } from '../theme/ThemeProvider';
import ThemeToggle from '../components/ThemeToggle';

// 测试状态常量
const TEST_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  ERROR: 'error'
};

// 样式定义
const styles = {
  container: {
    position: 'fixed',
    right: 'var(--spacing-lg)',
    bottom: 'var(--spacing-lg)',
    width: 'var(--dialog-width-md)',
    backgroundColor: 'var(--color-background)',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)',
    borderRadius: 'var(--border-radius-md)',
    zIndex: 10000,
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    fontSize: 'var(--font-size-sm)'
  },
  header: {
    padding: '12px 15px',
    backgroundColor: 'var(--color-background-secondary)',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: 'var(--font-size-md)',
    fontWeight: 'bold'
  },
  content: {
    padding: 'var(--spacing-md)',
    maxHeight: 'var(--dialog-max-height)',
    overflowY: 'auto'
  },
  footer: {
    padding: '10px 15px',
    borderTop: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between'
  },
  button: {
    padding: '6px 12px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    cursor: 'pointer'
  },
  testList: {
    marginBottom: 'var(--spacing-md)'
  },
  testItem: {
    padding: '8px 10px',
    marginBottom: 'var(--spacing-xs)',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid #ddd',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between'
  },
  testSelected: {
    backgroundColor: 'var(--color-primary-alpha-10)',
    borderColor: 'var(--color-primary-border)'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: 'var(--border-radius-lg)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 'var(--component-height-lg)'
  },
  results: {
    padding: 'var(--spacing-sm)',
    borderRadius: 'var(--border-radius-sm)',
    backgroundColor: 'var(--color-background-light)',
    marginTop: 'var(--spacing-sm)'
  },
  error: {
    color: 'var(--color-error)',
    backgroundColor: 'var(--color-error-background)',
    padding: 'var(--spacing-xs)',
    borderRadius: 'var(--border-radius-sm)',
    marginTop: 'var(--spacing-sm)'
  },
  statusColors: {
    idle: { background: 'var(--color-neutral)', color: 'var(--color-text-secondary)' },
    running: { background: 'var(--color-primary)', color: 'var(--color-on-primary)' },
    passed: { background: 'var(--color-success)', color: 'var(--color-on-primary)' },
    failed: { background: 'var(--color-error)', color: 'var(--color-on-primary)' },
    error: { background: 'var(--color-warning)', color: 'var(--color-on-primary)' }
  },
  progressBar: {
    height: 'var(--border-width-thick)',
    backgroundColor: 'var(--color-background-secondary)',
    marginTop: 'var(--spacing-xs)',
    borderRadius: 'var(--border-radius-xs)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    transition: 'width 0.3s ease'
  },
  logViewer: {
    marginTop: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-background-light)',
    borderRadius: 'var(--border-radius-sm)',
    maxHeight: 'var(--dialog-text-max-height)',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: 'var(--font-size-xs)'
  },
  log: {
    margin: '3px 0',
    lineHeight: 1.4
  },
  logInfo: { color: 'var(--color-primary)' },
    logWarn: { color: 'var(--color-warning)' },
    logError: { color: 'var(--color-error)' },
  testPanel: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--border-radius-md)',
    boxShadow: '0 3px 6px var(--shadow)',
    padding: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-lg)',
    transition: 'background-color 0.3s, box-shadow 0.3s'
  },
  testHeader: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'bold',
    marginBottom: 'var(--spacing-md)',
    color: 'var(--text)'
  },
  testRow: {
    marginBottom: 'var(--spacing-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center' 
  },
  testResult: {
    marginTop: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--background)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text)',
    transition: 'background-color 0.3s, color 0.3s'
  }
};

// 测试运行器组件
const TestRunner = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [selectedTest, setSelectedTest] = useState(null);
  const [status, setStatus] = useState(TEST_STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showRunner, setShowRunner] = useState(true);
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);
  const [themeTestStatus, setThemeTestStatus] = useState('未运行');
  const [themeTestLog, setThemeTestLog] = useState([]);

  // 添加日志
  const addLog = (level, message) => {
    setLogs(prevLogs => [...prevLogs, { level, message, time: new Date() }]);
    
    // 自动滚动到最新日志
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 100);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 运行测试
  const runTest = async () => {
    if (!selectedTest || status === TEST_STATUS.RUNNING) return;

    try {
      // 重置状态
      setStatus(TEST_STATUS.RUNNING);
      setResult(null);
      setError(null);
      setProgress(0);
      clearLogs();

      // 添加测试开始日志
      addLog('info', `开始运行测试: ${selectedTest.name}`);
      
      // 运行测试的每一步
      const steps = selectedTest.steps;
      let stepResults = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        
        // 更新进度
        const currentProgress = Math.floor((i / steps.length) * 100);
        setProgress(currentProgress);
        
        addLog('info', `执行步骤 ${stepNumber}/${steps.length}: ${step.name}`);
        
        try {
          // 执行测试步骤
          if (step.action && typeof step.action === 'function') {
            await step.action();
          }
          
          stepResults.push({
            name: step.name,
            status: 'passed'
          });
          
          addLog('info', `步骤 ${stepNumber} 通过`);
          
          // 在步骤之间暂停1秒
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (stepError) {
          addLog('error', `步骤 ${stepNumber} 失败: ${stepError.message}`);
          
          stepResults.push({
            name: step.name,
            status: 'failed',
            error: stepError.message
          });
          
          // 测试失败，中断执行
          setStatus(TEST_STATUS.FAILED);
          setResult({
            steps: stepResults,
            failedStep: stepNumber
          });
          return;
        }
      }

      // 所有步骤都通过
      setStatus(TEST_STATUS.PASSED);
      setProgress(100);
      setResult({
        steps: stepResults
      });
      
      addLog('info', `测试通过: ${selectedTest.name}`);
    } catch (err) {
      // 处理测试过程中的错误
      setStatus(TEST_STATUS.ERROR);
      setError(err.message || '未知错误');
      addLog('error', `测试出错: ${err.message}`);
    }
  };

  // 导出测试日志
  const exportLogs = () => {
    Logger.downloadLogs();
  };

  // 渲染测试状态标签
  const renderStatusBadge = (statusType) => {
    const style = {
      ...styles.statusBadge,
      backgroundColor: styles.statusColors[statusType].background,
      color: styles.statusColors[statusType].color
    };
    
    return (
      <span style={style}>
        {statusType.toUpperCase()}
      </span>
    );
  };

  // 渲染进度条
  const renderProgressBar = () => {
    return (
      <div style={styles.progressBar}>
        <div 
          style={{
            ...styles.progressFill,
            width: `${progress}%`
          }} 
        />
      </div>
    );
  };

  // 渲染日志
  const renderLogs = () => {
    return (
      <div style={styles.logViewer} ref={logRef}>
        {logs.map((log, index) => (
          <div 
            key={index} 
            style={{
              ...styles.log,
              color: log.level === 'error' ? styles.logError.color : 
                    log.level === 'warn' ? styles.logWarn.color : 
                    log.level === 'info' ? styles.logInfo.color : 'inherit'
            }}
          >
            {`[${log.time.toLocaleTimeString()}] ${log.message}`}
          </div>
        ))}
      </div>
    );
  };

  // 主题切换测试
  const runThemeTest = async () => {
    setThemeTestStatus('运行中');
    setThemeTestLog([]);
    
    // 记录日志函数
    const log = (message) => {
      setThemeTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    try {
      // 记录当前主题
      const initialTheme = theme;
      log(`当前主题: ${initialTheme}`);
      
      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 切换主题
      log('切换主题...');
      toggleTheme();
      
      // 等待主题切换完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 验证主题是否切换成功
      const newTheme = localStorage.getItem('theme') || 'light';
      const expected = initialTheme === 'light' ? 'dark' : 'light';
      
      if (newTheme === expected) {
        log(`主题切换成功: ${newTheme}`);
        setThemeTestStatus('通过');
      } else {
        log(`主题切换失败: 预期 ${expected}, 实际 ${newTheme}`);
        setThemeTestStatus('失败');
      }
      
      // 切换回初始主题
      log('恢复初始主题...');
      toggleTheme();
      
      // 等待主题切换完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 验证主题是否恢复成功
      const finalTheme = localStorage.getItem('theme') || 'light';
      
      if (finalTheme === initialTheme) {
        log(`主题恢复成功: ${finalTheme}`);
      } else {
        log(`主题恢复失败: 预期 ${initialTheme}, 实际 ${finalTheme}`);
        setThemeTestStatus('失败');
      }
      
    } catch (error) {
      log(`测试出错: ${error.message}`);
      setThemeTestStatus('错误');
    }
  };

  // 不显示测试运行器时，只显示一个小按钮
  if (!showRunner) {
    return (
      <button 
        style={{
          position: 'fixed',
          right: 'var(--spacing-lg)',
    bottom: 'var(--spacing-lg)',
          zIndex: 10000,
          padding: '6px 12px',
          backgroundColor: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--border-radius-sm)',
          cursor: 'pointer'
        }}
        onClick={() => setShowRunner(true)}
      >
        测试工具
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>语音AI自动化测试</h3>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: 'var(--font-size-md)' 
          }}
          onClick={() => setShowRunner(false)}
        >
          ×
        </button>
      </div>
      
      <div style={styles.content}>
        <div style={styles.testList}>
          <h4>选择测试场景:</h4>
          {testScenarios.map((test, index) => (
            <div 
              key={index}
              style={{
                ...styles.testItem,
                ...(selectedTest === test ? styles.testSelected : {})
              }}
              onClick={() => setSelectedTest(test)}
            >
              <span>{test.name}</span>
              {selectedTest === test && status !== TEST_STATUS.IDLE && renderStatusBadge(status)}
            </div>
          ))}
        </div>
        
        {status === TEST_STATUS.RUNNING && renderProgressBar()}
        
        {result && (
          <div style={styles.results}>
            <h4>测试结果:</h4>
            <p>状态: {renderStatusBadge(status)}</p>
            {result.failedStep && (
              <p>失败步骤: {result.failedStep} - {result.steps[result.failedStep - 1].name}</p>
            )}
            <p>完成步骤: {result.steps.filter(s => s.status === 'passed').length}/{selectedTest?.steps.length}</p>
          </div>
        )}
        
        {error && (
          <div style={styles.error}>
            <h4>错误信息:</h4>
            <p>{error}</p>
          </div>
        )}
        
        <h4>测试日志:</h4>
        {renderLogs()}
      </div>
      
      <div style={styles.footer}>
        <div>
          <button 
            style={styles.button}
            onClick={runTest}
            disabled={!selectedTest || status === TEST_STATUS.RUNNING}
          >
            运行测试
          </button>
          <button 
            style={{
              ...styles.button,
              backgroundColor: 'var(--color-background)',
      color: 'var(--color-primary)',
              border: '1px solid #007bff',
              marginLeft: 'var(--spacing-xs)'
            }}
            onClick={clearLogs}
          >
            清空日志
          </button>
        </div>
        <button 
          style={{
            ...styles.button,
            backgroundColor: 'var(--color-success)'
          }}
          onClick={exportLogs}
        >
          导出报告
        </button>
      </div>

      <div style={styles.testPanel}>
        <h2 style={styles.testHeader}>主题切换测试</h2>
        
        <div style={styles.testRow}>
          <Space>
            <span>当前主题: <strong>{theme}</strong></span>
            <ThemeToggle />
          </Space>
          
          <Space>
            <Button type="primary" onClick={runThemeTest}>
              运行主题测试
            </Button>
            <Tag color={
              themeTestStatus === '通过' ? 'success' :
              themeTestStatus === '失败' ? 'error' :
              themeTestStatus === '运行中' ? 'processing' :
              'default'
            }>
              {themeTestStatus}
            </Tag>
          </Space>
        </div>
        
        {themeTestLog.length > 0 && (
          <Card title="测试日志" size="small" style={styles.testResult}>
            {themeTestLog.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </Card>
        )}
        
        <Card title="手动测试" size="small" style={{marginTop: 'var(--spacing-md)'}}>
          <p>使用右下角的主题切换按钮测试主题切换功能。切换后，页面颜色应立即变化。</p>
          <Space>
            <Button onClick={toggleTheme}>
              切换到{theme === 'light' ? '暗色' : '亮色'}主题
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default TestRunner;