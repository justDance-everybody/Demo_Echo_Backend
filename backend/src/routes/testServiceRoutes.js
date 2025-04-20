const express = require('express');
const testServiceController = require('../controllers/testServiceController');
const mcpGatewayService = require('../services/mcpGatewayService');
const mcpService = require('../services/mcpService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 获取可用MCP服务器列表
 * GET /api/test-service/mcp-servers
 */
router.get('/mcp-servers', async (req, res) => {
  try {
    const servers = await mcpService.getMCPServers();
    res.json({ servers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 测试服务语音处理接口
 * POST /api/test-service/voice
 */
router.post('/voice', testServiceController.processVoiceRequest);

/**
 * 测试MiniMax语音合成接口
 * POST /api/test-service/text-to-speech
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数: text',
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info(`请求语音合成, 文本长度: ${text.length}`);
    
    // 调用MiniMax MCP服务进行语音合成
    const result = await mcpGatewayService.executeToolCall(
      'minimax-mcp-js',  // 服务器ID
      'textToSpeech',    // 工具名称
      { text }           // 工具参数
    );
    
    return res.json({
      status: 'success',
      data: result,
      message: '语音合成成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`语音合成失败: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      message: `语音合成失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 