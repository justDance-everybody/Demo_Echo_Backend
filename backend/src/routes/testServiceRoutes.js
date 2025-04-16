const express = require('express');
const testServiceController = require('../controllers/testServiceController');

const router = express.Router();

/**
 * 测试服务语音处理接口
 * POST /api/test-service/voice
 */
router.post('/voice', testServiceController.processVoiceRequest);

module.exports = router; 