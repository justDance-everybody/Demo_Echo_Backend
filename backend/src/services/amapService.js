const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 从文本中提取搜索关键词
 * @param {string} text - 输入文本
 * @returns {string} - 提取的关键词
 */
const extractKeywords = (text) => {
  // 简单实现：移除"在哪里"、"怎么走"等问句，保留地点名称
  // 实际项目中可能需要更复杂的NLP处理
  const removePhrases = [
    '在哪里', '在哪', '怎么走', '怎么去', '如何去', 
    '在什么地方', '位置', '地址', '我想知道', '告诉我'
  ];
  
  let result = text;
  removePhrases.forEach(phrase => {
    result = result.replace(phrase, '');
  });
  
  // 去除前后空格
  return result.trim();
};

/**
 * 根据关键词搜索地点
 * @param {string} keywords - 搜索关键词
 * @returns {Promise<Object>} - 搜索结果
 */
const searchPlace = async (keywords) => {
  try {
    logger.info(`正在搜索地点: ${keywords}`);
    
    const response = await axios.get(config.amap.searchEndpoint, {
      params: {
        keywords: keywords,
        key: config.amap.key,
        extensions: 'all',
        output: 'JSON',
        city: 'all'
      },
      timeout: 5000 // 设置超时时间
    });
    
    return response.data;
  } catch (error) {
    logger.error(`高德地图API调用失败: ${error.message}`, { error });
    throw new Error(`地图服务查询失败: ${error.message}`);
  }
};

module.exports = {
  extractKeywords,
  searchPlace
}; 