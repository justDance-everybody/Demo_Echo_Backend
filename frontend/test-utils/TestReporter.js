// TestReporter.js - 测试报告生成器
import Logger from './Logger';

class TestReporter {
  constructor() {
    this.container = null;
    this.results = null;
    this.config = {
      colors: {
        passed: '#4CAF50',   // 绿色
        failed: '#F44336',   // 红色
        error: '#FF9800',    // 橙色
        pending: '#9E9E9E',  // 灰色
        running: '#2196F3'   // 蓝色
      },
      showDetails: true,
      showLogs: true,
      autoScroll: true,
      maxLogEntries: 1000
    };
  }

  // 设置配置
  configure(options = {}) {
    this.config = { ...this.config, ...options };
    return this;
  }

  // 创建测试报告容器
  createReportContainer(parent = document.body) {
    if (this.container) {
      return this.container;
    }
    
    const container = document.createElement('div');
    container.className = 'test-report-container';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      right: 0;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      background-color: #FFFFFF;
      border: 1px solid #CCCCCC;
      border-radius: 5px 0 0 0;
      box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.1);
      overflow: auto;
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      padding: 0;
      transition: all 0.3s ease;
    `;
    
    const header = document.createElement('div');
    header.className = 'test-report-header';
    header.style.cssText = `
      padding: 10px;
      background-color: #F5F5F5;
      border-bottom: 1px solid #CCCCCC;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '语音交互测试报告';
    title.style.margin = '0';
    header.appendChild(title);
    
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '5px';
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制日志';
    copyBtn.onclick = () => Logger.copyToClipboard();
    this._styleButton(copyBtn);
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '下载报告';
    downloadBtn.onclick = () => this.downloadReport();
    this._styleButton(downloadBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.onclick = () => this.hideReport();
    this._styleButton(closeBtn);
    
    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(closeBtn);
    header.appendChild(actions);
    
    const content = document.createElement('div');
    content.className = 'test-report-content';
    content.style.cssText = `
      padding: 15px;
      overflow: auto;
    `;
    
    container.appendChild(header);
    container.appendChild(content);
    
    parent.appendChild(container);
    this.container = container;
    
    return container;
  }

  // 给按钮添加样式
  _styleButton(button) {
    button.style.cssText = `
      padding: 5px 10px;
      background-color: #F0F0F0;
      border: 1px solid #CCCCCC;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    `;
    
    button.onmouseover = () => {
      button.style.backgroundColor = '#E0E0E0';
    };
    
    button.onmouseout = () => {
      button.style.backgroundColor = '#F0F0F0';
    };
  }

  // 显示测试报告
  showReport(results, parent = document.body) {
    this.results = results;
    const container = this.createReportContainer(parent);
    const content = container.querySelector('.test-report-content');
    
    content.innerHTML = '';
    
    if (!results) {
      content.innerHTML = '<p>没有测试结果可显示</p>';
      return this;
    }
    
    // 创建报告摘要
    const summary = document.createElement('div');
    summary.className = 'test-summary';
    summary.innerHTML = `
      <h4>测试摘要</h4>
      <p>
        总计: ${results.total} | 
        通过: <span style="color: ${this.config.colors.passed}">${results.passed}</span> | 
        失败: <span style="color: ${this.config.colors.failed}">${results.failed}</span> | 
        错误: <span style="color: ${this.config.colors.error}">${results.errors}</span>
      </p>
      <p>开始时间: ${new Date(results.startTime).toLocaleString()}</p>
      <p>结束时间: ${new Date(results.endTime).toLocaleString()}</p>
      <p>总耗时: ${(results.duration / 1000).toFixed(2)}秒</p>
    `;
    content.appendChild(summary);
    
    // 创建测试结果列表
    const list = document.createElement('div');
    list.className = 'test-list';
    
    results.results.forEach(result => {
      const testItem = this._createTestItem(result);
      list.appendChild(testItem);
    });
    
    content.appendChild(list);
    
    container.style.display = 'block';
    
    if (this.config.autoScroll) {
      container.scrollTop = 0;
    }
    
    return this;
  }

  // 创建单个测试项
  _createTestItem(result) {
    const testItem = document.createElement('div');
    testItem.className = 'test-item';
    testItem.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      border: 1px solid #EEEEEE;
      border-radius: 5px;
    `;
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '5px';
    
    const statusColor = this.config.colors[result.status] || this.config.colors.pending;
    
    const title = document.createElement('h4');
    title.innerHTML = `
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${statusColor}; margin-right:5px;"></span>
      ${result.name}
    `;
    title.style.margin = '0';
    header.appendChild(title);
    
    const details = document.createElement('span');
    details.textContent = `${result.status.toUpperCase()} - ${(result.duration / 1000).toFixed(2)}秒`;
    details.style.fontSize = '12px';
    details.style.color = '#666666';
    header.appendChild(details);
    
    testItem.appendChild(header);
    
    if (this.config.showDetails && result.stepResults?.length > 0) {
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'test-details';
      detailsContainer.style.cssText = `
        margin-top: 10px;
        padding-left: 15px;
        border-left: 2px solid #EEEEEE;
        font-size: 13px;
      `;
      
      result.stepResults.forEach(step => {
        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.style.cssText = `
          margin-bottom: 8px;
          display: flex;
        `;
        
        const stepStatus = document.createElement('span');
        const statusColor = this.config.colors[step.status] || this.config.colors.pending;
        stepStatus.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${statusColor}; margin-right:5px;"></span>`;
        stepItem.appendChild(stepStatus);
        
        const stepContent = document.createElement('div');
        stepContent.style.flex = '1';
        
        // 步骤标题
        const stepTitle = document.createElement('div');
        stepTitle.textContent = `${step.stepNumber}. ${step.name}`;
        stepTitle.style.fontWeight = 'bold';
        stepContent.appendChild(stepTitle);
        
        // 步骤耗时
        const stepTime = document.createElement('div');
        stepTime.textContent = `耗时: ${(step.duration / 1000).toFixed(2)}秒`;
        stepTime.style.fontSize = '12px';
        stepTime.style.color = '#666666';
        stepContent.appendChild(stepTime);
        
        // 如果有错误信息
        if (step.error) {
          const errorMsg = document.createElement('div');
          errorMsg.textContent = `错误: ${step.error}`;
          errorMsg.style.color = this.config.colors.failed;
          errorMsg.style.marginTop = '5px';
          stepContent.appendChild(errorMsg);
        }
        
        stepItem.appendChild(stepContent);
        detailsContainer.appendChild(stepItem);
      });
      
      testItem.appendChild(detailsContainer);
    }
    
    return testItem;
  }

  // 隐藏测试报告
  hideReport() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    return this;
  }

  // 显示单个测试结果
  showTestResult(result, parent = document.body) {
    if (!result) return this;
    
    const mockResults = {
      total: 1,
      passed: result.status === 'passed' ? 1 : 0,
      failed: result.status === 'failed' ? 1 : 0,
      errors: result.status === 'error' ? 1 : 0,
      duration: result.duration,
      startTime: new Date(result.startTime || Date.now() - result.duration).toISOString(),
      endTime: new Date(result.endTime || Date.now()).toISOString(),
      results: [result]
    };
    
    return this.showReport(mockResults, parent);
  }

  // 显示日志
  showLogs(parent = document.body) {
    const logs = Logger.exportLogs();
    
    const container = this.createReportContainer(parent);
    const content = container.querySelector('.test-report-content');
    
    content.innerHTML = '';
    
    const logsTitle = document.createElement('h4');
    logsTitle.textContent = '测试日志';
    content.appendChild(logsTitle);
    
    const logsInfo = document.createElement('p');
    logsInfo.innerHTML = `
      开始时间: ${new Date(logs.startTime).toLocaleString()}<br>
      结束时间: ${new Date(logs.endTime).toLocaleString()}<br>
      总记录数: ${logs.logCount}
    `;
    logsInfo.style.fontSize = '12px';
    logsInfo.style.color = '#666666';
    content.appendChild(logsInfo);
    
    const logsContainer = document.createElement('div');
    logsContainer.className = 'logs-container';
    logsContainer.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background-color: #F8F9FA;
      border: 1px solid #EEEEEE;
      border-radius: 5px;
      max-height: 400px;
      overflow: auto;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
    `;
    
    // 限制日志条目数量
    const maxEntries = this.config.maxLogEntries;
    const displayLogs = logs.logs.slice(-maxEntries);
    
    if (logs.logs.length > maxEntries) {
      const noticeElem = document.createElement('div');
      noticeElem.textContent = `注意: 仅显示最后 ${maxEntries} 条日志，共 ${logs.logs.length} 条`;
      noticeElem.style.color = '#FF9800';
      noticeElem.style.marginBottom = '10px';
      logsContainer.appendChild(noticeElem);
    }
    
    displayLogs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      // 日志级别样式
      const logColors = {
        debug: '#9E9E9E',
        info: '#2196F3',
        warn: '#FF9800',
        error: '#F44336'
      };
      
      const time = new Date(log.timestamp).toLocaleTimeString();
      
      logEntry.innerHTML = `
        <span style="color: #666666;">[${time}]</span>
        <span style="color: ${logColors[log.level] || '#000000'};">[${log.level.toUpperCase()}]</span>
        <span style="font-weight: bold;">${log.component}</span> - 
        <span>${log.event}</span>
      `;
      
      if (Object.keys(log.data).length > 0) {
        const dataElem = document.createElement('div');
        dataElem.className = 'log-data';
        dataElem.style.cssText = `
          margin-left: 20px;
          margin-top: 3px;
          margin-bottom: 3px;
          color: #555555;
        `;
        
        try {
          dataElem.textContent = JSON.stringify(log.data, null, 2);
        } catch (e) {
          dataElem.textContent = '数据无法序列化';
        }
        
        logEntry.appendChild(dataElem);
      }
      
      logsContainer.appendChild(logEntry);
    });
    
    content.appendChild(logsContainer);
    
    container.style.display = 'block';
    
    if (this.config.autoScroll) {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    return this;
  }

  // 下载测试报告
  downloadReport(filename = 'voice-test-report.html') {
    if (!this.results) {
      Logger.warn('TestReporter', '没有测试结果可下载');
      return false;
    }
    
    // 创建HTML报告
    const html = this._generateHTMLReport(this.results);
    
    // 创建Blob
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    Logger.info('TestReporter', '已下载测试报告', { filename });
    return true;
  }

  // 生成HTML报告
  _generateHTMLReport(results) {
    const logData = Logger.exportLogs();
    
    // 创建基本HTML结构
    let html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>语音交互测试报告</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          .summary {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .test-list {
            margin-top: 20px;
          }
          .test-item {
            border: 1px solid #eee;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .test-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .status-passed { color: #4CAF50; }
          .status-failed { color: #F44336; }
          .status-error { color: #FF9800; }
          .status-pending { color: #9E9E9E; }
          .test-details {
            margin-top: 10px;
            padding-left: 15px;
            border-left: 2px solid #eee;
          }
          .step-item {
            margin-bottom: 10px;
          }
          .step-title {
            font-weight: bold;
          }
          .step-error {
            color: #F44336;
            margin-top: 5px;
          }
          .logs {
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .log-entry {
            font-family: monospace;
            margin-bottom: 5px;
          }
          .log-data {
            margin-left: 20px;
            color: #555;
            white-space: pre;
          }
          .toggle-btn {
            background: #f0f0f0;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
          }
          .collapsible {
            display: none;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
        </style>
        <script>
          function toggleSection(id) {
            const section = document.getElementById(id);
            if (section.style.display === 'none' || section.style.display === '') {
              section.style.display = 'block';
            } else {
              section.style.display = 'none';
            }
          }
        </script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>语音交互测试报告</h1>
            <p>生成时间: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <h2>测试摘要</h2>
            <p>
              总计: ${results.total} | 
              通过: <span class="status-passed">${results.passed}</span> | 
              失败: <span class="status-failed">${results.failed}</span> | 
              错误: <span class="status-error">${results.errors}</span>
            </p>
            <p>开始时间: ${new Date(results.startTime).toLocaleString()}</p>
            <p>结束时间: ${new Date(results.endTime).toLocaleString()}</p>
            <p>总耗时: ${(results.duration / 1000).toFixed(2)}秒</p>
          </div>
          
          <div class="test-list">
            <h2>测试详情</h2>
    `;
    
    // 添加测试结果
    results.results.forEach((result, index) => {
      const testId = `test-${index}`;
      const statusClass = `status-${result.status}`;
      
      html += `
        <div class="test-item">
          <div class="test-header">
            <h3 class="${statusClass}">${result.name}</h3>
            <span>${result.status.toUpperCase()} - ${(result.duration / 1000).toFixed(2)}秒</span>
          </div>
      `;
      
      if (result.stepResults?.length > 0) {
        html += `
          <button class="toggle-btn" onclick="toggleSection('${testId}')">显示/隐藏步骤详情</button>
          <div id="${testId}" class="test-details collapsible">
        `;
        
        result.stepResults.forEach(step => {
          const stepStatusClass = `status-${step.status}`;
          
          html += `
            <div class="step-item">
              <div class="step-title">
                ${step.stepNumber}. ${step.name} <span class="${stepStatusClass}">(${step.status})</span>
              </div>
              <div>耗时: ${(step.duration / 1000).toFixed(2)}秒</div>
          `;
          
          if (step.error) {
            html += `<div class="step-error">错误: ${step.error}</div>`;
          }
          
          html += `</div>`;
        });
        
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    // 添加日志部分
    html += `
          <div class="logs">
            <h2>测试日志</h2>
            <p>
              总记录数: ${logData.logCount} | 
              开始时间: ${new Date(logData.startTime).toLocaleString()} | 
              结束时间: ${new Date(logData.endTime).toLocaleString()}
            </p>
            
            <button class="toggle-btn" onclick="toggleSection('logs-container')">显示/隐藏日志</button>
            <div id="logs-container" class="collapsible">
    `;
    
    // 限制日志条目数量
    const maxEntries = this.config.maxLogEntries;
    const displayLogs = logData.logs.slice(-maxEntries);
    
    if (logData.logs.length > maxEntries) {
      html += `<p style="color: #FF9800;">注意: 仅显示最后 ${maxEntries} 条日志，共 ${logData.logs.length} 条</p>`;
    }
    
    displayLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const logClass = `status-${log.level === 'error' ? 'failed' : log.level === 'warn' ? 'error' : log.level === 'info' ? 'passed' : 'pending'}`;
      
      html += `
        <div class="log-entry">
          <span>[${time}]</span>
          <span class="${logClass}">[${log.level.toUpperCase()}]</span>
          <strong>${log.component}</strong> - 
          <span>${log.event}</span>
      `;
      
      if (Object.keys(log.data).length > 0) {
        let dataText = '';
        try {
          dataText = JSON.stringify(log.data, null, 2);
        } catch (e) {
          dataText = '数据无法序列化';
        }
        
        html += `<div class="log-data">${dataText}</div>`;
      }
      
      html += `</div>`;
    });
    
    // 完成HTML结构
    html += `
            </div>
          </div>
          
          <div class="footer">
            <p>语音交互测试报告 - 生成于 ${new Date().toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
}

export default new TestReporter(); 