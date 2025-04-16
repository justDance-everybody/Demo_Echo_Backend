# 测试服务流程设计

## 功能概述
测试服务将整合前端语音输入、地图服务查询、LLM总结和语音合成功能，构建一个完整的语音交互流程。用户可以通过语音查询位置信息，系统将返回语音形式的回复。

## 流程图
```
前端 --> 语音输入 --> 后端接收文本
后端 --> 调用高德地图API --> 获取地图数据
后端 --> 调用LLM总结信息 --> 生成简洁回复
后端 --> 调用Minimax语音合成 --> 获取语音URL
后端 --> 返回语音URL --> 前端播放
```

## 具体实现步骤

### 1. 语音输入接收
- 接口: `POST /api/test-service/voice`
- 功能: 接收前端发送的语音文本
- 参数:
  ```json
  {
    "voiceText": "我想知道北京天安门在哪里",
    "userId": "user123",
    "sessionId": "session456"
  }
  ```

### 2. 高德地图API调用
- 使用高德地图搜索API
- 搜索关键词从语音文本中提取
- 调用示例:
  ```javascript
  const response = await axios.get('https://restapi.amap.com/v3/place/text', {
    params: {
      keywords: extractKeywords(voiceText),
      key: 'YOUR_AMAP_KEY',
      city: 'all'
    }
  });
  ```

### 3. LLM总结
- 使用系统默认LLM对地图数据进行总结
- 输入: 高德地图返回的POI信息
- 输出: 简洁的几句话总结，包含位置、地址等关键信息
- 示例提示:
  ```
  将以下位置信息总结为简洁的2-3句话回复:
  {地图数据JSON}
  ```

### 4. Minimax语音合成
- 调用Minimax的TTS API
- 输入: LLM总结的文本
- 输出: 语音文件URL
- 示例:
  ```javascript
  const ttsResponse = await axios.post('https://api.minimax.chat/v1/text-to-speech', {
    text: summaryText,
    voice_id: 'female-01',
    model: 'standard'
  }, {
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`
    }
  });
  ```

### 5. 返回结果
- 格式:
  ```json
  {
    "status": "success",
    "textResponse": "北京天安门位于北京市中心，地址是北京市东城区长安街。作为中国的标志性建筑，它是游客必去的地标之一。",
    "audioUrl": "https://storage.minimax.chat/audio/response-12345.mp3",
    "mapData": {
      "poi": [...],
      "location": {...}
    }
  }
  ```

## 配置要求
1. 高德地图API密钥
2. Minimax API密钥
3. LLM服务访问配置

## 注意事项
- 此测试服务仅作为概念验证，验证语音输入→处理→语音输出的完整流程
- 所有API密钥应通过环境变量或配置文件管理，不要硬编码
- 实现简单的错误处理和日志记录，便于调试
- 添加请求超时处理，避免长时间等待 