# ProgressBar 进度条组件

五阶段进度反馈组件，用于显示语音处理的不同阶段："识别中 → 理解中 → 确认中 → 执行中 → 完成"。

## 功能特点

- ✅ 五阶段进度展示：识别中 → 理解中 → 确认中 → 执行中 → 完成
- ✅ 流畅的动画过渡效果
- ✅ 当前阶段高亮显示
- ✅ 已完成阶段显示绿色勾号
- ✅ 当前阶段脉搏动画效果
- ✅ 响应式设计，适配移动端
- ✅ 支持自定义标签和样式
- ✅ idle状态自动隐藏

## 基本使用

```jsx
import ProgressBar from './components/ProgressBar';

// 基本使用
<ProgressBar currentStage="interpreting" />

// 自定义标签
<ProgressBar 
  currentStage="executing"
  customLabels={{
    listening: '语音识别',
    interpreting: '智能分析',
    confirming: '用户确认',
    executing: '任务执行',
    result: '任务完成'
  }}
/>

// 自定义样式
<ProgressBar 
  currentStage="result"
  className="my-custom-progress"
  visible={true}
/>
```

## Props

| 属性           | 类型      | 默认值   | 说明                                                                                  |
| -------------- | --------- | -------- | ------------------------------------------------------------------------------------- |
| `currentStage` | `string`  | `'idle'` | 当前阶段：`'listening'` \| `'interpreting'` \| `'confirming'` \| `'executing'` \| `'result'` \| `'idle'` |
| `visible`      | `boolean` | `true`   | 是否显示进度条                                                                        |
| `className`    | `string`  | `''`     | 额外的CSS类名                                                                         |
| `customLabels` | `object`  | `{}`     | 自定义阶段标签                                                                        |

## 阶段说明

| 阶段           | 标签   | 图标 | 描述                   |
| -------------- | ------ | ---- | ---------------------- |
| `listening`    | 识别中 | 🎤    | 正在识别用户语音输入   |
| `interpreting` | 理解中 | 🧠    | 正在理解用户意图       |
| `confirming`   | 确认中 | ❓    | 等待用户确认操作       |
| `executing`    | 执行中 | ⚙️    | 正在执行相应操作       |
| `result`       | 完成   | ✅    | 操作已完成             |
| `idle`         | -      | -    | 空闲状态（不显示组件） |

## 样式定制

组件使用CSS变量，支持主题定制：

```css
:root {
  --color-primary: #4fd1c5;
  --color-success: #38a169;
  --background: #ffffff;
  --text: #333333;
  --border-color: #e0e0e0;
}
```

## 演示

使用 `ProgressBarDemo` 组件查看所有功能：

```jsx
import { ProgressBarDemo } from './components/ProgressBar';

<ProgressBarDemo />
```

## 测试

组件包含完整的单元测试：

```bash
npm test -- --testPathPattern=ProgressBar.test.js
```

## 集成示例

在MainPage中的使用示例：

```jsx
import { AnimatePresence } from 'framer-motion';
import ProgressBar from '../../components/ProgressBar';

// 在组件中使用
<AnimatePresence>
  {(status === 'listening' || status === 'interpreting' || status === 'confirming' || status === 'executing') && (
    <ProgressBar 
      currentStage={status} 
      visible={true}
      className="main-page-progress"
    />
  )}
</AnimatePresence>
``` 