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