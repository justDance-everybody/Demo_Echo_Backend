const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 使用LLM总结地图数据
 * @param {Object} mapData - 高德地图返回的数据
 * @returns {Promise<string>} - 总结的文本
 */
const summarizeMapData = async (mapData) => {
  try {
    logger.info('正在使用LLM总结地图数据');
    
    // 对地图数据进行预处理，提取关键信息
    const poi = mapData.pois && mapData.pois.length > 0 ? mapData.pois[0] : null;
    
    if (!poi) {
      return '抱歉，我找不到与您查询相关的地点信息。';
    }
    
    const promptData = {
      location: poi.name,
      address: poi.address,
      type: poi.type,
      tel: poi.tel,
      distance: poi.distance
    };
    
    // 构建提示
    const prompt = `
    请将以下位置信息总结为简洁的2-3句话中文回复:
    地点名称: ${promptData.location}
    地址: ${promptData.address}
    类型: ${promptData.type}
    电话: ${promptData.tel || '无'}
    距离: ${promptData.distance ? promptData.distance + '米' : '未知'}
    
    总结要求:
    1. 使用自然、友好的语气
    2. 包含地点名称、位置和地址等关键信息
    3. 如果有特殊信息如营业时间，请一并包含
    4. 回答必须是中文
    `;
    
    // 调用LLM API
    // 注意：这里是简化的实现，实际使用中应根据您选用的LLM服务商调整请求格式
    const response = await axios.post(config.llm.endpoint, {
      prompt: prompt,
      max_tokens: 150,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    // 提取LLM返回的文本
    // 注意：不同LLM的响应格式可能不同，需要相应调整
    const summaryText = response.data.choices[0].text.trim();
    
    logger.info('LLM总结完成');
    return summaryText;
  } catch (error) {
    logger.error(`LLM总结失败: ${error.message}`, { error });
    
    // 发生错误时返回备用回复
    if (mapData.pois && mapData.pois.length > 0) {
      const poi = mapData.pois[0];
      return `${poi.name}位于${poi.address}。${poi.tel ? `联系电话是${poi.tel}。` : ''}`;
    } else {
      return '抱歉，我无法获取您查询的地点信息。';
    }
  }
};

/**
 * 模拟LLM总结 (用于测试或LLM服务不可用时)
 * @param {Object} mapData - 高德地图返回的数据
 * @returns {string} - 总结的文本
 */
const mockSummarizeMapData = (mapData) => {
  try {
    const poi = mapData.pois && mapData.pois.length > 0 ? mapData.pois[0] : null;
    
    if (!poi) {
      return '抱歉，我找不到与您查询相关的地点信息。';
    }
    
    return `${poi.name}位于${poi.address || '未知地址'}。这是一个${poi.type || '地点'}${poi.tel ? `，联系电话是${poi.tel}` : ''}。${poi.distance ? `离您的位置大约${poi.distance}米。` : ''}`;
  } catch (error) {
    logger.error(`模拟LLM总结失败: ${error.message}`);
    return '抱歉，我无法处理这个地点的信息。';
  }
};

module.exports = {
  summarizeMapData,
  mockSummarizeMapData
}; 