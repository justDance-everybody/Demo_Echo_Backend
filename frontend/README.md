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
  color: var(--text-color);
  background-color: var(--surface);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
`;
```

## 可定制变量

主题系统提供了以下可定制的CSS变量：

| 变量名 | 默认值（深色） | 默认值（浅色） | 描述 |
|-------|--------------|--------------|------|
| --primary-color | #4FD1C5 | #38B2AC | 主色调，用于按钮、链接等 |
| --secondary-color | #805AD5 | #6B46C1 | 辅助色，用于强调和高亮 |
| --background | #1E1E2F | #FFFFFF | 页面背景色 |
| --surface | #27293D | #F7FAFC | 卡片和组件背景色 |
| --text-color | #F8F8F8 | #1A202C | 主要文本颜色 |
| --text-secondary | #A0AEC0 | #4A5568 | 次要文本颜色 |
| --border-color | #2D3748 | #E2E8F0 | 边框颜色 |
| --border-radius | 8px | 8px | 圆角大小 |
| --spacing-sm | 8px | 8px | 小间距 |
| --spacing-md | 16px | 16px | 中间距 |
| --spacing-lg | 24px | 24px | 大间距 |

## 持久化

主题设置会自动保存到 `localStorage`，包括：

- `theme`: 'dark' 或 'light'，表示当前主题模式
- `customTheme`: JSON字符串，包含自定义的主题变量

## 响应式主题

主题系统支持响应式设计，可以通过媒体查询结合主题变量实现不同屏幕尺寸的样式适配：

```css
@media (max-width: 768px) {
  :root {
    --spacing-md: 12px;
    --border-radius: 6px;
  }
  
  /* 针对特定主题的响应式调整 */
  [data-theme="dark"] {
    --surface: #1c1c2e;
  }
}
```

## 开发指南

### 添加新的主题变量

1. 在 `ThemeContext.js` 中的主题对象中添加新变量
2. 在 `GlobalStyles.js` 中添加对应的CSS变量
3. 如需在UI中提供自定义选项，在 `ThemeSettings.js` 中添加对应控件

### 单元测试

运行主题系统测试：

```bash
npm test -- ThemeSystem.test.js
```

主题系统包含以下测试：

- 组件单元测试（ThemeToggle, ThemeSettings）
- Settings页面集成测试
- 主题持久化测试
- CSS变量更新测试

## 注意事项

- 所有UI组件应使用CSS变量而非硬编码的颜色/尺寸值
- 自定义主题可能需要考虑可访问性（对比度）问题
- 移动设备上测试主题切换和定制功能 