# 四阶段进度条组件 (FourStageProgressBar)

## 概述

FourStageProgressBar 是一个用于显示语音交互流程的四阶段进度条组件，包含理解、确认、执行、完成四个阶段。

## 功能特性

- 🎯 **四阶段流程**: 理解 → 确认 → 执行 → 完成
- 🎨 **主题适配**: 支持深色/浅色主题切换
- 📱 **响应式设计**: 适配不同屏幕尺寸
- ✨ **动画效果**: 流畅的过渡动画和状态变化
- 🎛️ **自定义标签**: 支持自定义阶段标签和描述
- 🔧 **灵活配置**: 可控制是否显示描述信息

## 使用方法

### 基本用法

```jsx
import FourStageProgressBar, { FOUR_STAGES } from './FourStageProgressBar';

function MyComponent() {
  const [currentStage, setCurrentStage] = useState(FOUR_STAGES.UNDERSTANDING);
  
  return (
    <FourStageProgressBar 
      currentStage={currentStage}
      showDescription={true}
    />
  );
}
```

### 高级用法

```jsx
// 自定义标签
const customLabels = {
  [FOUR_STAGES.UNDERSTANDING]: '分析中',
  [FOUR_STAGES.CONFIRMING]: '确认中',
  [FOUR_STAGES.EXECUTING]: '执行中',
  [FOUR_STAGES.COMPLETED]: '已完成'
};

<FourStageProgressBar 
  currentStage={FOUR_STAGES.EXECUTING}
  customLabels={customLabels}
  showDescription={false}
  className="my-progress-bar"
/>
```

## Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `currentStage` | `string` | `FOUR_STAGES.UNDERSTANDING` | 当前阶段 |
| `customLabels` | `object` | `{}` | 自定义标签对象 |
| `showDescription` | `boolean` | `true` | 是否显示阶段描述 |
| `className` | `string` | `''` | 自定义CSS类名 |

## 阶段常量

```javascript
export const FOUR_STAGES = {
  UNDERSTANDING: 'understanding',    // 理解
  CONFIRMING: 'confirming',         // 确认
  EXECUTING: 'executing',           // 执行
  COMPLETED: 'completed'            // 完成
};
```

## 状态映射

在MainPage中，进度条会根据当前状态自动显示相应的阶段：

| MainPage状态 | 进度条阶段 | 描述 |
|-------------|-----------|------|
| `listening` | 理解 | 开始录音时显示 |
| `thinking` | 理解 | 分析用户意图 |
| `confirming` | 确认 | 等待用户确认 |
| `executing` | 执行 | 执行用户指令 |
| `speaking` + 有结果 | 完成 | 任务完成 |
| `idle` | 无 | 不显示进度条 |
| `error` | 无 | 不显示进度条 |

## 样式自定义

组件使用styled-components构建，支持主题定制：

```css
/* 进度条容器 */
.progress-container {
  width: 100%;
  max-width: 600px;
  margin: 20px auto;
  padding: 0 20px;
}
```

## 动画效果

- 进度条出现/消失：淡入淡出 + 垂直移动
- 阶段图标：缩放和阴影效果
- 连接线：渐变色进度填充
- 状态变化：平滑过渡动画

## 主题支持

组件自动适配当前主题：
- 深色主题：深色背景，浅色文字
- 浅色主题：浅色背景，深色文字
- 主题色彩：使用主题色系

## 调试模式

在开发环境下，MainPage会显示调试信息面板，包含：
- 当前状态
- 进度阶段
- 结果数据状态
- 测试按钮（可手动切换状态）

## 注意事项

1. 确保在ThemeProvider中使用组件
2. 组件依赖Ant Design图标库
3. 需要framer-motion支持动画效果
4. 建议在移动端使用时调整字体大小
