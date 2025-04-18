const express = require('express');
const testServiceController = require('../controllers/testServiceController');
const mcpService = require('../services/mcpService');

const router = express.Router();

/**
 * 获取可用MCP服务器列表
 * GET /api/test-service/mcp-servers
 */
router.get('/api/test-service/mcp-servers', async (req, res) => {
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
router.post('/api/test-service/voice', testServiceController.processVoiceRequest);

module.exports = router; 