const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 调用Minimax API进行文本到语音的转换
 * @param {string} text - 要转换为语音的文本
 * @param {Object} options - 语音合成选项
 * @returns {Promise<string>} - 语音URL
 */
const textToSpeech = async (text, options = {}) => {
  try {
    logger.info(`正在调用Minimax TTS API, 文本长度: ${text.length}`);

    const defaultOptions = {
      voice_id: 'female-01', // 默认使用女声
      model: 'standard',     // 使用标准模型
      speed: 1.0,            // 正常语速
      vol: 1.0               // 正常音量
    };

    const ttsOptions = { ...defaultOptions, ...options };
    
    const response = await axios.post(config.minimax.ttsEndpoint, {
      text: text,
      ...ttsOptions
    }, {
      headers: {
        'Authorization': `Bearer ${config.minimax.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15秒超时
    });

    // 获取语音URL
    // 注意：根据Minimax的实际API调整返回字段的解析
    const audioUrl = response.data.audio_url;
    
    if (!audioUrl) {
      throw new Error('语音合成API未返回有效的音频URL');
    }

    logger.info('语音合成成功，已获取音频URL');
    return audioUrl;
  } catch (error) {
    logger.error(`Minimax TTS API调用失败: ${error.message}`, { error });
    throw new Error(`语音合成失败: ${error.message}`);
  }
};

/**
 * 模拟语音合成（用于测试或API不可用时）
 * @param {string} text - 要转换为语音的文本
 * @returns {string} - 模拟的语音URL
 */
const mockTextToSpeech = (text) => {
  logger.info('使用模拟语音合成服务');
  
  // 生成随机的音频ID，模拟真实API
  const audioId = Math.random().toString(36).substring(2, 15);
  return `https://example.com/mock-tts/${audioId}.mp3`;
};

module.exports = {
  textToSpeech,
  mockTextToSpeech
}; 