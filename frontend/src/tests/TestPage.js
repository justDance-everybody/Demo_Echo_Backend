// TestPage.js - 语音AI前端测试页面

import React from 'react';
import styled from 'styled-components';
import { Tabs } from 'antd-mobile';
import TestRunner from '../test-utils/TestRunner';

const TestPageContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: var(--background);
  
  @media (min-width: 768px) {
    padding: 40px;
  }
`;

const Header = styled.header`
  margin-bottom: 30px;
  
  h1 {
    font-size: var(--font-size-3xl);
    color: var(--text);
    margin-bottom: 10px;
  }
  
  p {
    color: var(--text-secondary);
    max-width: 800px;
  }
`;

const TabContent = styled.div`
  margin-top: 20px;
`;

/**
 * 测试页面
 * 测试页面用于运行和管理前端测试
 */
const TestPage = () => {
  return (
    <TestPageContainer>
      <Header>
        <h1>Echo 前端测试中心</h1>
        <p>
          测试中心提供各种测试工具，用于验证前端组件和功能的正确性。
          您可以运行单元测试、集成测试和端到端测试，并查看测试结果和日志。
        </p>
      </Header>
      
      <Tabs>
        <Tabs.Tab title="端到端测试" key="e2e">
          <TabContent>
            <TestRunner />
          </TabContent>
        </Tabs.Tab>
        <Tabs.Tab title="单元测试" key="unit">
          <TabContent>
            <p>单元测试通常通过命令行运行。请使用以下命令：</p>
            <pre>
              cd frontend<br />
              npm test
            </pre>
            <p>您也可以运行特定测试：</p>
            <pre>
              npm test -- -t "组件名称"
            </pre>
          </TabContent>
        </Tabs.Tab>
        <Tabs.Tab title="手动测试" key="manual">
          <TabContent>
            <p>手动测试清单：</p>
            <ol>
              <li>验证响应式布局在不同设备尺寸下的显示</li>
              <li>验证主题切换功能</li>
              <li>验证用户认证流程</li>
              <li>验证服务页面功能</li>
              <li>验证语音交互功能</li>
            </ol>
          </TabContent>
        </Tabs.Tab>
      </Tabs>
    </TestPageContainer>
  );
};

export default TestPage; 