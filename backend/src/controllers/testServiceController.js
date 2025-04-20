/**
 * 测试服务控制器
 * 提供测试功能接口
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * 处理聊天请求
 * @param {String} query - 用户查询
 * @param {String} userId - 用户ID
 * @param {String} sessionId - 会话ID
 * @param {Object} context - 上下文信息
 * @returns {Promise<Object>} - 处理结果
 */
const processRequest = async (query, userId, sessionId, context = {}) => {
  logger.info(`处理用户请求: ${query}, 用户ID: ${userId}`);
  
  // 这里仅返回模拟数据，实际应用中会调用AI服务
  return {
    reply: `这是对"${query}"的测试回复`,
    userId,
    sessionId: sessionId || 'test-session-123',
    timestamp: new Date().toISOString(),
    mockData: true
  };
};

/**
 * 处理语音请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const processVoiceRequest = async (req, res) => {
  try {
    const { voiceText, userId } = req.body;
    
    if (!voiceText || !userId) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数: voiceText或userId',
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info(`处理语音请求, 用户ID: ${userId}, 文本: ${voiceText}`);
    
    // 这里仅返回模拟数据，实际应用中会调用语音合成服务
    const result = {
      status: 'success',
      data: {
        reply: `这是对语音输入"${voiceText}"的测试响应`,
        userId,
        timestamp: new Date().toISOString(),
        audioUrl: 'https://example.com/test-audio.mp3', // 模拟的音频URL
        mockData: true
      },
      message: '语音处理成功',
      timestamp: new Date().toISOString()
    };
    
    return res.json(result);
  } catch (error) {
    logger.error(`语音处理失败: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      message: `语音处理失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  processRequest,
  processVoiceRequest
}; 