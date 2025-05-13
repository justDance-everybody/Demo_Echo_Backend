import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Space, Typography, List, Badge, Divider, Select, Collapse } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import AutomatedTest from './AutomatedTest';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 测试运行器组件
 * 
 * 提供UI界面来运行、控制和查看前端测试
 */
const TestRunner = () => {
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [testStatus, setTestStatus] = useState('idle'); // idle, running, completed, failed
  const [selectedScenario, setSelectedScenario] = useState('all');
  const testInstance = useRef(null);
  const [testReport, setTestReport] = useState(null);
  const consoleInitialized = useRef(false);

  // 用于测试进度检查的定时器
  const checkStatusTimer = useRef(null);

  // 添加控制台输出
  const addToConsole = (type, message, prefix = '') => {
    setConsoleOutput(prev => [
      ...prev,
      { type, message: `${prefix ? prefix + ': ' : ''}${message}`, timestamp: new Date().toISOString() }
    ]);
  };

  // 初始化测试实例
  useEffect(() => {
    if (!testInstance.current) {
      testInstance.current = new AutomatedTest();
      
      // 此处使用useRef标记而不是在渲染期间直接修改state
      if (!consoleInitialized.current) {
        // 拦截控制台输出
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        console.log = (...args) => {
          originalConsoleLog.apply(console, args);
          addToConsole('info', args.map(arg => typeof arg === 'object' ? 'Object' : arg).join(' '));
        };

        console.warn = (...args) => {
          originalConsoleWarn.apply(console, args);
          addToConsole('warning', args.map(arg => typeof arg === 'object' ? 'Object' : arg).join(' '));
        };

        console.error = (...args) => {
          originalConsoleError.apply(console, args);
          addToConsole('error', args.map(arg => typeof arg === 'object' ? 'Object' : arg).join(' '));
        };
        
        consoleInitialized.current = true;
      }
      
      // 创建测试实例并初始化
      testInstance.current.init();
    }

    // 组件卸载时恢复控制台和清理定时器
    return () => {
      if (testInstance.current) {
        testInstance.current.cleanup();
      }
      
      // 清理定时器
      if (checkStatusTimer.current) {
        clearTimeout(checkStatusTimer.current);
      }
      
      // 恢复原始控制台
      if (consoleInitialized.current) {
        console.log = console.__log || console.log;
        console.warn = console.__warn || console.warn;
        console.error = console.__error || console.error;
      }
    };
  }, []);

  // 检查测试状态的函数
  const checkTestStatus = () => {
    if (testInstance.current && !testInstance.current.testInProgress) {
      const report = testInstance.current.generateReport();
      setTestReport(report);
      setTestStatus(report.summary.failed > 0 ? 'failed' : 'completed');
    } else if (testStatus === 'running') {
      // 继续检查
      checkStatusTimer.current = setTimeout(checkTestStatus, 1000);
    }
  };

  // 开始测试
  const startTest = () => {
    if (testStatus === 'running') {
      addToConsole('warning', '测试已在进行中，请等待当前测试完成');
      return;
    }
    
    setTestStatus('running');
    setTestReport(null);
    
    try {
      if (selectedScenario === 'all') {
        testInstance.current.runTest(0);
      } else {
        testInstance.current.runSpecificScenario(selectedScenario);
      }
      
      // 设置一个定时器检查测试是否完成
      checkStatusTimer.current = setTimeout(checkTestStatus, 1000);
    } catch (error) {
      addToConsole('error', `启动测试时出错: ${error.message}`);
      setTestStatus('failed');
    }
  };

  // 重置测试
  const resetTest = () => {
    setConsoleOutput([]);
    setTestStatus('idle');
    setTestReport(null);
    
    if (checkStatusTimer.current) {
      clearTimeout(checkStatusTimer.current);
      checkStatusTimer.current = null;
    }
    
    if (testInstance.current) {
      testInstance.current.cleanup();
      testInstance.current = new AutomatedTest();
      testInstance.current.init();
    }
  };

  // 导出测试结果
  const exportResults = () => {
    try {
      // 尝试从localStorage获取
      let results = localStorage.getItem('voiceAgentTestResults');
      
      // 如果localStorage中没有，但testInstance中有
      if (!results && testInstance.current && testInstance.current.testResults) {
        results = JSON.stringify(testInstance.current.testResults);
      }
      
      if (!results) {
        addToConsole('warning', '没有测试结果可导出', '导出');
        return;
      }
      
      // 创建并下载文件
      const blob = new Blob([results], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-agent-test-results-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToConsole('info', '测试结果已导出', '导出');
    } catch (error) {
      addToConsole('error', `导出测试结果时出错: ${error.message}`, '导出');
    }
  };

  // 获取测试场景选项
  const getScenarioOptions = () => {
    const options = [
      <Option key="all" value="all">全部场景</Option>
    ];
    
    if (testInstance.current) {
      testInstance.current.testScenarios.forEach(scenario => {
        options.push(
          <Option key={scenario.name} value={scenario.name}>{scenario.name}</Option>
        );
      });
    }
    
    return options;
  };

  // 渲染测试状态徽章
  const renderStatusBadge = () => {
    switch (testStatus) {
      case 'running':
        return <Badge status="processing" text="测试运行中" />;
      case 'completed':
        return <Badge status="success" text="测试完成" />;
      case 'failed':
        return <Badge status="error" text="测试失败" />;
      default:
        return <Badge status="default" text="准备就绪" />;
    }
  };

  // 渲染测试报告
  const renderTestReport = () => {
    if (!testReport) return null;
    
    const items = [
      {
        key: 'details',
        header: '详细测试结果',
        children: (
          <List
            dataSource={testReport.results}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.success ? 
                    <CheckCircleOutlined style={{ color: 'green' }} /> : 
                    <CloseCircleOutlined style={{ color: 'red' }} />}
                  <Text code>{item.step}</Text>
                  <Text>{item.message}</Text>
                  <Text type="secondary" style={{ fontSize: '0.8em' }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )
      }
    ];
    
    return (
      <Card title="测试报告" style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <Paragraph>
            <Text strong>总测试数:</Text> {testReport.summary.total}
          </Paragraph>
          <Paragraph>
            <Text strong>通过:</Text> <Text type="success">{testReport.summary.passed}</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>失败:</Text> <Text type="danger">{testReport.summary.failed}</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>成功率:</Text> {testReport.summary.successRate}
          </Paragraph>
        </div>

        <Collapse items={items} />
      </Card>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <Title level={2}>前端自动化测试</Title>
      
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {renderStatusBadge()}
            </div>
            <div>
              <Select
                value={selectedScenario}
                onChange={setSelectedScenario}
                style={{ width: 200, marginRight: 16 }}
              >
                {getScenarioOptions()}
              </Select>
              
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />} 
                  onClick={startTest}
                  disabled={testStatus === 'running'}
                >
                  开始测试
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={resetTest}
                  disabled={testStatus === 'running'}
                >
                  重置
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={exportResults}
                  disabled={testStatus === 'idle'}
                >
                  导出结果
                </Button>
              </Space>
            </div>
          </div>
          
          <Divider />
          
          <div style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '14px' 
          }}>
            {consoleOutput.map((output, index) => (
              <div key={index} style={{ 
                color: output.type === 'error' ? 'red' : output.type === 'warning' ? 'orange' : 'black',
                marginBottom: '2px'
              }}>
                <Text code style={{ marginRight: '8px', fontSize: '0.8em' }}>
                  {new Date(output.timestamp).toLocaleTimeString()}
                </Text>
                {output.message}
              </div>
            ))}
          </div>
        </Space>
      </Card>
      
      {renderTestReport()}
    </div>
  );
};

export default TestRunner; 