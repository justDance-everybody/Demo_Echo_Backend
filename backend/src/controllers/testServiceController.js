const mcpService = require('../services/mcpService');
const logger = require('../utils/logger');

/**
 * 处理语音文本请求，通过MCP客户端调用服务
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const processVoiceRequest = async (req, res) => {
  const { voiceText, userId, sessionId } = req.body;
  
  if (!voiceText) {
    return res.status(400).json({
      status: 'error',
      message: '语音文本不能为空'
    });
  }
  
  try {
    logger.info(`收到语音请求: ${voiceText}`, { userId, sessionId });
    
    // 步骤1: 调用高德地图MCP服务
    const mapResult = await mcpService.queryAMapService(voiceText);
    logger.info('地图服务查询成功');
    
    // 从地图结果提取关键信息用于文本生成
    const poiInfo = extractPoiInfo(mapResult);
    
    if (!poiInfo) {
      logger.warn('未找到地图结果，返回默认消息');
      return res.status(200).json({
        status: 'success',
        textResponse: '抱歉，我找不到与您查询相关的地点信息。',
        audioUrl: null,
        mapData: mapResult
      });
    }
    
    // 步骤2: 基于地图结果生成简洁文本响应
    const textResponse = generateTextResponse(poiInfo);
    logger.info(`生成文本响应: ${textResponse}`);
    
    // 步骤3: 调用Minimax TTS服务生成语音
    const audioUrl = await mcpService.textToSpeechMinimax(textResponse);
    logger.info(`获取语音URL: ${audioUrl}`);
    
    // 返回结果给前端
    return res.status(200).json({
      status: 'success',
      textResponse,
      audioUrl,
      mapData: mapResult
    });
  } catch (error) {
    logger.error(`处理语音请求失败: ${error.message}`, { error });
    
    return res.status(500).json({
      status: 'error',
      message: `处理失败: ${error.message}`
    });
  }
};

/**
 * 从地图API结果中提取POI信息
 * @param {Object} mapResult - 地图API结果
 * @returns {Object|null} - 提取的POI信息，如果不存在则返回null
 */
const extractPoiInfo = (mapResult) => {
  try {
    // 尝试不同的数据结构解析
    let pois;
    
    if (mapResult.data && mapResult.data.pois) {
      pois = mapResult.data.pois;
    } else if (mapResult.pois) {
      pois = mapResult.pois;
    } else {
      // 尝试JSON解析响应内容
      const contentStr = typeof mapResult === 'string' ? mapResult : JSON.stringify(mapResult);
      const poisMatch = contentStr.match(/"pois"\s*:\s*(\[.+?\])/);
      if (poisMatch && poisMatch[1]) {
        try {
          pois = JSON.parse(poisMatch[1]);
        } catch (e) {
          logger.error(`解析POIs JSON失败: ${e.message}`);
        }
      }
    }
    
    if (!pois || pois.length === 0) {
      return null;
    }
    
    const poi = pois[0];
    return {
      name: poi.name,
      address: poi.address,
      type: poi.type,
      tel: poi.tel,
      location: poi.location
    };
  } catch (error) {
    logger.error(`提取POI信息时出错: ${error.message}`);
    return null;
  }
};

/**
 * 基于POI信息生成简洁的文本响应
 * @param {Object} poiInfo - POI信息
 * @returns {string} - 生成的文本响应
 */
const generateTextResponse = (poiInfo) => {
  if (!poiInfo) {
    return '抱歉，我找不到与您查询相关的地点信息。';
  }
  
  let response = `${poiInfo.name}位于${poiInfo.address || '未知地址'}。`;
  
  if (poiInfo.type) {
    response += `这是一个${poiInfo.type}。`;
  }
  
  if (poiInfo.tel) {
    response += `联系电话是${poiInfo.tel}。`;
  }
  
  return response;
};

module.exports = {
  processVoiceRequest
}; 