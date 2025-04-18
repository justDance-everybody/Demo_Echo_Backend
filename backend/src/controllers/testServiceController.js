const mcpService = require('../services/mcpService');
const logger = require('../utils/logger');

/**
 * 获取可用的MCP服务器列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getAvailableMCPServers = async (req, res) => {
  try {
    logger.info('请求获取可用MCP服务器列表');
    
    const servers = await mcpService.getMCPServers();
    
    return res.status(200).json({
      status: 'success',
      servers
    });
  } catch (error) {
    logger.error(`获取MCP服务器列表失败: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      message: '无法获取MCP服务器列表'
    });
  }
};

/**
 * 处理语音请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} - 处理结果
 */
const processVoiceRequest = async (req, res) => {
  const { voiceText, mapServerId, ttsServerId } = req.body;
  
  // 验证请求
  if (!voiceText) {
    logger.warn('收到无效的语音请求：缺少voiceText参数');
    return res.status(400).json({ error: '缺少语音文本参数' });
  }
  
  try {
    logger.info(`处理语音请求: "${voiceText}"`);
    
    // 调用地图服务查询
    const mapResult = await mcpService.queryAMapService(voiceText, mapServerId);
    
    // 分析结果
    const poiInfo = extractPoiInfo(mapResult);
    
    // 如果没有找到相关信息，返回默认回复
    if (!poiInfo) {
      logger.info('未找到相关POI信息，返回默认回复');
      return res.json({
        text: `很抱歉，我找不到与"${voiceText}"相关的地点信息。`,
        audioUrl: null
      });
    }
    
    // 生成文本响应
    const textResponse = generateTextResponse(poiInfo);
    logger.info(`生成的文本响应: ${textResponse}`);
    
    // 将文本转换为语音
    const audioUrl = await mcpService.textToSpeechMinimax(textResponse, ttsServerId);
    
    // 返回响应
    return res.json({
      text: textResponse,
      audioUrl
    });
    
  } catch (error) {
    logger.error(`处理语音请求时出错: ${error.message}`);
    return res.status(500).json({ error: `处理请求失败: ${error.message}` });
  }
};

/**
 * 从地图结果中提取POI信息
 * @param {Object} mapResult - 地图API结果
 * @returns {Object|null} - 提取的POI信息或null
 */
const extractPoiInfo = (mapResult) => {
  try {
    if (!mapResult || !mapResult.data) {
      logger.warn('地图结果为空或格式不正确');
      return null;
    }
    
    // 尝试从不同格式的数据中获取POI
    let pois = null;
    if (mapResult.data.pois && Array.isArray(mapResult.data.pois)) {
      pois = mapResult.data.pois;
    } else if (mapResult.data.poiList && Array.isArray(mapResult.data.poiList)) {
      pois = mapResult.data.poiList;
    } else if (Array.isArray(mapResult.data)) {
      pois = mapResult.data;
    }
    
    if (!pois || pois.length === 0) {
      logger.warn('地图结果中没有POI信息');
      return null;
    }
    
    // 使用第一个POI结果
    return pois[0];
  } catch (error) {
    logger.error(`提取POI信息时出错: ${error.message}`);
    return null;
  }
};

/**
 * 根据POI信息生成文本响应
 * @param {Object} poiInfo - POI信息
 * @returns {string} - 生成的文本响应
 */
const generateTextResponse = (poiInfo) => {
  const { name, address, type, tel } = poiInfo;
  
  let response = `我找到了${type ? type + '：' : ''}"${name}"`;
  
  if (address) {
    response += `，地址是：${address}`;
  }
  
  if (tel) {
    response += `，联系电话：${tel}`;
  }
  
  response += '。需要我为您提供更多信息吗？';
  
  return response;
};

module.exports = {
  getAvailableMCPServers,
  processVoiceRequest
}; 