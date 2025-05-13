// TestPage.js - 语音AI前端测试页面

import React from 'react';
import TestRunner from './TestRunner';

// 测试页面样式
const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '5px'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '20px'
  },
  instructions: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  instructionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  instructionList: {
    paddingLeft: '20px',
    marginBottom: '0'
  },
  instructionItem: {
    marginBottom: '8px'
  }
};

// 测试页面组件
const TestPage = () => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>语音AI自动化测试</h1>
        <p style={styles.subtitle}>测试、调试和监控前端语音交互功能</p>
      </div>
      
      <div style={styles.content}>
        <div style={styles.instructions}>
          <h3 style={styles.instructionTitle}>使用说明</h3>
          <ol style={styles.instructionList}>
            <li style={styles.instructionItem}>在右下角测试面板中选择要运行的测试场景</li>
            <li style={styles.instructionItem}>点击"运行测试"按钮开始测试</li>
            <li style={styles.instructionItem}>测试过程会自动模拟语音交互，无需手动操作</li>
            <li style={styles.instructionItem}>测试结束后，可导出测试报告或日志进行分析</li>
          </ol>
        </div>
        
        <p>
          本测试工具旨在模拟用户的语音交互行为，自动化测试语音识别、意图理解、确认流程等功能。
          测试结果和日志将帮助开发人员诊断潜在问题，提高语音交互的质量。
        </p>
      </div>
      
      <TestRunner />
    </div>
  );
};

export default TestPage; 