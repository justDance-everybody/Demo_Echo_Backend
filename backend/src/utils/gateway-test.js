/**
 * MCP网关功能测试脚本
 * 用于测试通过MCP_client处理请求的网关功能
 * 使用方法: node gateway-test.js [serverId] [query]
 */

const axios = require('axios');
const config = require('../config');

// 获取命令行参数
const serverId = process.argv[2];
const query = process.argv[3] || '你好，请告诉我今天的天气如何？';

// 检查参数
if (!serverId) {
  console.error('请提供MCP服务器ID作为第一个参数');
  console.error('用法: node gateway-test.js [serverId] [query]');
  console.error('示例: node gateway-test.js MiniMax "查询北京天气"');
  process.exit(1);
}

// 创建请求数据
const requestData = {
  query,
  options: {
    userId: 'test-user-' + Date.now(),
    sessionId: 'test-session-' + Date.now()
  },
  timestamp: new Date().toISOString()
};

// 设置测试API基础URL
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const gatewayUrl = `${apiBaseUrl}/mcp/gateway/${serverId}`;

console.log(`测试MCP网关功能:`);
console.log(`服务器ID: ${serverId}`);
console.log(`查询内容: ${query}`);
console.log(`请求URL: ${gatewayUrl}`);
console.log(`请求数据: ${JSON.stringify(requestData, null, 2)}`);
console.log('开始发送请求...\n');

// 发送请求
(async () => {
  try {
    const startTime = Date.now();
    const response = await axios.post(gatewayUrl, requestData);
    const endTime = Date.now();
    
    console.log(`请求成功! 耗时: ${endTime - startTime}ms`);
    console.log('状态:', response.data.status);
    console.log('消息:', response.data.message);
    console.log('时间戳:', response.data.timestamp);
    
    console.log('\n响应数据:');
    // 格式化输出JSON数据
    console.log(JSON.stringify(response.data.data, null, 2));
  } catch (error) {
    console.error('请求失败:');
    
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`状态码: ${error.response.status}`);
      console.error('错误数据:', error.response.data);
    } else if (error.request) {
      // 请求发送成功，但没有收到响应
      console.error('未收到响应。服务器可能未启动或网络问题');
    } else {
      // 设置请求时发生错误
      console.error('错误信息:', error.message);
    }
  }
})(); 