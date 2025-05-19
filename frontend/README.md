# Echo AI 语音助手前端

这是Echo AI语音助手的前端部分，提供了基于Web的语音交互界面。

## 特点

- 支持语音识别和语音合成
- 提供桌面版和移动版两种界面
- 基于React和Ant Design/Ant Design Mobile构建
- 自动化测试工具支持

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在 http://localhost:3000 运行。

### 构建生产版本

```bash
npm run build
```

## 测试 (Testing)

本项目使用 Cypress 进行端到端 (E2E) 测试，并集成 `cypress-axe` 进行无障碍访问测试。

### 安装测试依赖

如果尚未安装，请在 `frontend` 目录下运行：
```bash
npm install --save-dev cypress cypress-mochawesome-reporter jq cypress-axe axe-core
```

### 运行 E2E 测试

可以通过以下命令运行所有E2E测试：
```bash
npm run test:ci 
# 或者直接使用 cypress 命令
# npx cypress run
```

### 测试报告

测试执行完毕后，详细的HTML测试报告会自动生成在 `cypress/reports/html/index.html`。这份报告包含了每个测试用例的执行情况、截图（如有失败）和视频（在 `cypress run` 模式下）。

### 无障碍测试 (Accessibility Testing)

我们使用 `cypress-axe` 在E2E测试中检查应用的无障碍性。在您的测试文件中，通常在页面加载或重要UI变化后，可以按如下方式使用：

```javascript
// 在你的Cypress测试文件 (e.g., frontend/cypress/e2e/your_test.cy.js)

describe('Some Feature', () => {
  it('should be accessible', () => {
    cy.visit('/your-page');
    cy.injectAxe(); // 注入axe-core运行时
    cy.checkA11y(); // 检查整个页面的可访问性
    // 你也可以配置 checkA11y 来排除某些元素或检查特定规则
    // cy.checkA11y('.specific-selector', { rules: { 'color-contrast': { enabled: true } } });
  });
});
```

单元测试和组件测试使用 Jest 和 React Testing Library (RTL)。可以通过以下命令运行：
```bash
npm test
```

## 使用指南

1. 桌面版界面访问: http://localhost:3000/
2. 移动版界面访问: http://localhost:3000/mobile

### 语音功能使用注意事项

- 语音识别和语音合成功能需要浏览器支持Web Speech API
- 由于Web Speech API的限制，部分浏览器可能需要用户手动授权
- 目前支持的浏览器：
  - Chrome (桌面 & 移动)
  - Edge
  - Safari 14.1+
  - Firefox需要启用特定标志

### 移动版界面 (Ant Design Mobile)

如果您的浏览器不支持语音功能，移动版界面提供了"测试功能"按钮，可以模拟语音输入。

### 已知问题

- 在Safari浏览器中，语音合成可能存在延迟
- 部分浏览器需要HTTPS环境才能使用语音API
- 在开发环境下可能需要多次授权麦克风权限

## 后端API集成

前端通过以下API与后端通信：

- `/api/v1/intent/process` - 处理用户语音转文本后的意图识别
- `/api/v1/execute` - 执行用户确认后的操作

## 技术栈

- React 18
- React Router v6
- Axios
- Ant Design v5
- Ant Design Mobile v5
- Web Speech API
- Framer Motion

## 贡献指南

1. 创建分支
2. 提交更改
3. 创建Pull Request

## 许可证

[MIT](LICENSE) 

# Echo 应用前端主题系统

## 主题系统概述

Echo应用实现了一个灵活且可扩展的主题系统，支持深色/浅色主题切换，以及运行时主题自定义功能。主题系统基于CSS变量和React上下文，整合了以下几个关键组件：

### 核心组件

1. **ThemeContext**：主题上下文提供者，管理主题状态并提供切换方法
2. **ThemeToggle**：主题切换按钮，用于深色/浅色主题切换
3. **ThemeSettings**：主题设置面板，提供颜色、圆角等样式自定义
4. **StyleEditor**：高级样式编辑器，可调整所有CSS变量
5. **Settings页面**：集成了所有主题设置功能的页面
6. **GlobalStyles**：应用全局样式，基于主题动态调整

### 设计变量系统

主题系统采用设计变量（design tokens）模式，所有样式通过CSS变量驱动，包括：

- 颜色：主色、辅助色、背景色、文字色等
- 间距：内边距、外边距、间隙等
- 圆角：按钮、卡片等组件的圆角大小
- 阴影：不同状态的阴影效果
- 过渡：动画和过渡效果

## 如何使用

### 1. 主题上下文提供者

在应用根组件中包裹 `ThemeProvider`：

```jsx
// App.js
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. 在组件中使用主题

```jsx
// YourComponent.js
import { useTheme } from '../contexts/ThemeContext';

function YourComponent() {
  const { theme, toggleTheme, updateThemeVariable } = useTheme();
  
  return (
    <div>
      <p>当前主题: {theme.isDark ? '深色' : '浅色'}</p>
      <button onClick={toggleTheme}>切换主题</button>
      <button onClick={() => updateThemeVariable('--primary-color', '#FF5722')}>
        修改主色调
      </button>
    </div>
  );
}
```

### 3. 样式中使用主题变量

```css
.your-component {
  color: var(--text-color);
  background-color: var(--surface);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  transition: all var(--transition-duration) var(--transition-easing);
}
```

或在styled-components中：

```jsx
const StyledComponent = styled.div`