const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

// 保存临时调用数据的目录
const TMP_DIR = path.resolve(__dirname, '../../tmp');

/**
 * 确保临时目录存在
 */
const ensureTmpDir = () => {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    logger.info(`创建临时目录: ${TMP_DIR}`);
  }
};

/**
 * 获取所有可用的MCP服务器列表
 * @returns {Promise<Array>} 可用服务器列表
 */
const getMCPServers = async () => {
  try {
    const configFilePath = path.join(config.mcp.configPath, 'mcp_servers.json');
    logger.info(`读取MCP服务器配置文件: ${configFilePath}`);
    
    if (!fs.existsSync(configFilePath)) {
      logger.error(`MCP服务器配置文件不存在: ${configFilePath}`);
      throw new Error('MCP服务器配置文件不存在');
    }
    
    const configData = fs.readFileSync(configFilePath, 'utf8');
    const serverConfig = JSON.parse(configData);
    
    const servers = [];
    
    // 提取服务器信息
    if (serverConfig.mcpServers) {
      for (const [serverId, serverInfo] of Object.entries(serverConfig.mcpServers)) {
        if (serverInfo.enabled !== false) {  // 只包含启用的服务器
          servers.push({
            id: serverId,
            name: serverInfo.name || serverId,
            description: serverInfo.description || '',
            type: serverInfo.url ? 'http' : 'command'
          });
        }
      }
    }
    
    logger.info(`找到 ${servers.length} 个可用的MCP服务器`);
    return servers;
  } catch (error) {
    logger.error(`获取MCP服务器列表失败: ${error.message}`);
    throw new Error(`无法获取MCP服务器列表: ${error.message}`);
  }
};

/**
 * 调用MCP客户端执行查询
 * @param {string} serverId - MCP服务器ID
 * @param {string} query - 查询文本
 * @param {Object} options - 附加选项
 * @returns {Promise<string>} - 查询结果
 */
const callMCPClient = async (serverId, query, options = {}) => {
  ensureTmpDir();
  
  const requestId = uuidv4();
  const inputFile = path.join(TMP_DIR, `${requestId}_input.json`);
  const outputFile = path.join(TMP_DIR, `${requestId}_output.json`);

  // 准备完整请求数据
  const requestData = {
    query,
    ...(options.data || {}),
  };

  // 写入查询到临时文件
  fs.writeFileSync(inputFile, JSON.stringify(requestData), 'utf8');
  
  logger.info(`调用MCP客户端, 服务器ID: ${serverId}, 请求ID: ${requestId}`);
  
  // 模拟响应用于测试
  if (config.mcp.useMockResponses) {
    logger.info('使用模拟响应模式');
    
    // 从配置中获取模拟响应设置
    const mockResponse = getMockResponse(serverId, query, options);
    return JSON.stringify(mockResponse);
  }
  
  // 构建Python命令和参数
  const pythonProcess = spawn(config.mcp.pythonPath, [
    config.mcp.clientPath,
    serverId,
    '--input', inputFile,
    '--output', outputFile,
    '--one-shot'
  ]);
  
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      if (config.mcp.debugMode) {
        logger.debug(`MCP客户端输出: ${data.toString()}`);
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      logger.error(`MCP客户端错误: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`MCP客户端退出，状态码: ${code}, 错误: ${stderr}`);
        // 清理临时文件
        cleanupFiles(inputFile);
        return reject(new Error(`MCP客户端执行失败，状态码: ${code}`));
      }
      
      try {
        // 读取输出文件
        if (fs.existsSync(outputFile)) {
          const result = fs.readFileSync(outputFile, 'utf8');
          logger.info(`MCP客户端执行成功，结果大小: ${result.length} 字节`);
          
          // 清理临时文件
          cleanupFiles(inputFile, outputFile);
          
          resolve(result);
        } else {
          logger.error(`MCP客户端输出文件不存在: ${outputFile}`);
          cleanupFiles(inputFile);
          reject(new Error('MCP客户端未生成输出文件'));
        }
      } catch (error) {
        logger.error(`读取MCP客户端输出时出错: ${error.message}`);
        // 清理临时文件
        cleanupFiles(inputFile, outputFile);
        reject(error);
      }
    });
    
    pythonProcess.on('error', (error) => {
      logger.error(`启动MCP客户端时出错: ${error.message}`);
      // 清理临时文件
      cleanupFiles(inputFile, outputFile);
      reject(error);
    });
  });
};

/**
 * 获取模拟响应
 * @param {string} serverId - MCP服务器ID
 * @param {string} query - 用户查询文本
 * @param {Object} options - 附加选项
 * @returns {Object} - 模拟响应对象
 */
const getMockResponse = (serverId, query, options = {}) => {
  logger.info(`为服务器ID "${serverId}"生成模拟响应`);
  
  try {
    // 尝试从配置文件中获取服务器信息
    const configFilePath = path.join(config.mcp.configPath, 'mcp_servers.json');
    if (!fs.existsSync(configFilePath)) {
      logger.warn(`MCP服务器配置文件不存在: ${configFilePath}，将使用通用模拟响应`);
      return getGenericMockResponse(serverId, query);
    }
    
    const configData = fs.readFileSync(configFilePath, 'utf8');
    const serverConfig = JSON.parse(configData);
    
    if (!serverConfig.mcpServers || !serverConfig.mcpServers[serverId]) {
      logger.warn(`在配置中未找到服务器ID: ${serverId}，将使用通用模拟响应`);
      return getGenericMockResponse(serverId, query);
    }
    
    // 获取服务器配置信息
    const serverInfo = serverConfig.mcpServers[serverId];
    const serverType = serverInfo.type || 
                       (serverInfo.url ? 'http' : 
                       (serverInfo.command ? 'command' : 'unknown'));
    
    logger.info(`服务器"${serverId}"类型: ${serverType}`);
    
    // 根据服务器类型或名称判断模拟响应类型
    if (serverInfo.url && serverInfo.url.includes('amap') || 
        serverId.includes('amap') || 
        serverInfo.name?.toLowerCase().includes('地图')) {
      return getMapMockResponse(serverId, query, options);
    } 
    else if (serverInfo.url && serverInfo.url.includes('minimax') || 
             serverId.includes('minimax') || serverId.includes('MiniMax') || 
             serverInfo.name?.toLowerCase().includes('语音')) {
      return getTtsMockResponse(serverId, query, options);
    }
    else if (serverId.includes('playwright') || 
             serverInfo.name?.toLowerCase().includes('浏览器')) {
      return getBrowserMockResponse(serverId, query, options);
    }
    else if (serverId.includes('web3') || serverId.includes('blockchain') || 
             serverInfo.name?.toLowerCase().includes('区块链')) {
      return getBlockchainMockResponse(serverId, query, options);
    }
    else {
      // 对于无法识别类型的服务器，返回通用响应
      return getGenericMockResponse(serverId, query);
    }
  } catch (error) {
    logger.error(`生成模拟响应时出错: ${error.message}`);
    return getGenericMockResponse(serverId, query);
  }
};

/**
 * 获取通用模拟响应
 * @param {string} serverId - 服务器ID
 * @param {string} query - 用户查询
 * @returns {Object} - 模拟响应对象
 */
const getGenericMockResponse = (serverId, query) => {
  return {
    status: 'success',
    data: {
      content: `你好，我收到了你的问题："${query}"。我是一个通用AI助手，很高兴为你服务。`
    },
    textResponse: `你好，我收到了你的问题："${query}"。我是一个通用AI助手，很高兴为你服务。`
  };
};

/**
 * 获取地图服务模拟响应
 * @param {string} serverId - 服务器ID
 * @param {string} query - 用户查询
 * @param {Object} options - 附加选项
 * @returns {Object} - 模拟响应对象
 */
const getMapMockResponse = (serverId, query, options) => {
  // 根据查询内容生成不同的模拟地点信息
  let pois = [];
  const keywords = query.toLowerCase();

  if (keywords.includes('天安门') || keywords.includes('北京')) {
    pois.push({
      name: '天安门',
      address: '北京市东城区东长安街',
      type: '旅游景点',
      tel: '',
      location: { lat: 39.908722, lng: 116.397499 }
    });
  } else if (keywords.includes('故宫') || keywords.includes('紫禁城')) {
    pois.push({
      name: '故宫博物院',
      address: '北京市东城区景山前街4号',
      type: '博物馆',
      tel: '010-85007527',
      location: { lat: 39.916345, lng: 116.397048 }
    });
  } else if (keywords.includes('上海') || keywords.includes('外滩')) {
    pois.push({
      name: '上海外滩',
      address: '上海市黄浦区中山东一路',
      type: '风景名胜',
      tel: '',
      location: { lat: 31.233648, lng: 121.490604 }
    });
  } else if (keywords.includes('餐厅') || keywords.includes('吃饭') || keywords.includes('美食')) {
    pois = [
      {
        name: '老北京烤鸭店',
        address: '北京市朝阳区建国门外大街1号',
        type: '中餐厅',
        tel: '010-12345678',
        location: { lat: 39.908722, lng: 116.397499 }
      },
      {
        name: '海底捞火锅',
        address: '北京市海淀区中关村大街19号',
        type: '火锅店',
        tel: '010-87654321',
        location: { lat: 39.916345, lng: 116.397048 }
      }
    ];
  } else {
    // 默认返回一个地点，避免没有结果
    pois.push({
      name: '模拟地点',
      address: '这是一个模拟的地址',
      type: '模拟类型',
      tel: '000-00000000',
      location: { lat: 39.908722, lng: 116.397499 }
    });
  }

  return {
    status: 'success',
    data: { pois },
    count: pois.length
  };
};

/**
 * 获取语音服务模拟响应
 * @param {string} serverId - 服务器ID
 * @param {string} query - 用户查询
 * @param {Object} options - 附加选项
 * @returns {Object} - 模拟响应对象
 */
const getTtsMockResponse = (serverId, query, options) => {
  // 判断是否是TTS请求
  const isTtsRequest = query.includes('转换为语音') || query.includes('生成语音') || 
    (options && options.action === 'tts');

  const mockAudioUrl = config.minimax?.mockAudioUrl || 
                       'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3';

  if (isTtsRequest) {
    return {
      status: 'success',
      data: {
        content: `已将文本转换为语音`,
        audio_url: mockAudioUrl,
        duration: 5.2
      },
      audioUrl: mockAudioUrl
    };
  } else {
    // 普通对话请求
    return {
      status: 'success',
      data: {
        content: `这是来自语音服务的模拟回复：我已经收到了您的消息："${query}"。我能够回答问题、提供信息和帮助您完成各种任务。请问您今天需要什么帮助？`,
        audio_url: null,
        duration: 0
      },
      textResponse: `这是来自语音服务的模拟回复：我已经收到了您的消息："${query}"。我能够回答问题、提供信息和帮助您完成各种任务。请问您今天需要什么帮助？`
    };
  }
};

/**
 * 获取浏览器服务模拟响应
 * @param {string} serverId - 服务器ID
 * @param {string} query - 用户查询
 * @param {Object} options - 附加选项
 * @returns {Object} - 模拟响应对象
 */
const getBrowserMockResponse = (serverId, query, options) => {
  return {
    status: 'success',
    data: {
      content: `我可以听到你说："${query}"。我是浏览器助手，可以帮助你浏览和交互网页。请问有什么我可以帮助你的吗？`,
      actions: [
        { name: '打开网站', description: '可以打开指定的网站' },
        { name: '截图', description: '对当前页面进行截图' },
        { name: '点击', description: '点击页面上的元素' }
      ]
    },
    textResponse: `我可以听到你说："${query}"。我是浏览器助手，可以帮助你浏览和交互网页。请问有什么我可以帮助你的吗？`
  };
};

/**
 * 获取区块链服务模拟响应
 * @param {string} serverId - 服务器ID
 * @param {string} query - 用户查询
 * @param {Object} options - 附加选项
 * @returns {Object} - 模拟响应对象
 */
const getBlockchainMockResponse = (serverId, query, options) => {
  const balanceRequest = query.includes('余额') || query.includes('查看余额') || 
    query.toLowerCase().includes('balance');
  
  if (balanceRequest) {
    return {
      status: 'success',
      data: {
        address: '5Gh7znDdJ4m8SV6dZEZzH9CxwCh8Bfome2aKKMjx9MxZ',
        balance: '12.345',
        tokens: [
          { symbol: 'SOL', balance: '12.345', usdValue: '1234.5' },
          { symbol: 'USDC', balance: '1000', usdValue: '1000' }
        ]
      },
      textResponse: `你的钱包余额是12.345 SOL（约$1234.5）和1000 USDC（约$1000）。`
    };
  } else {
    return {
      status: 'success',
      data: {
        content: `你好，我是区块链助手。你的问题是："${query}"。我可以帮助你管理加密货币和交互区块链。可以执行查询余额、发送代币、查看交易历史等操作。`
      },
      textResponse: `你好，我是区块链助手。你的问题是："${query}"。我可以帮助你管理加密货币和交互区块链。可以执行查询余额、发送代币、查看交易历史等操作。`
    };
  }
};

/**
 * 清理临时文件
 * @param {...string} files - 需要清理的文件路径
 */
const cleanupFiles = (...files) => {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        logger.debug(`已删除临时文件: ${file}`);
      } catch (error) {
        logger.error(`删除临时文件失败: ${file}, 错误: ${error.message}`);
      }
    }
  });
};

/**
 * 通用MCP服务调用函数 - 直接使用指定的MCP服务器处理查询
 * @param {string} serverId - MCP服务器ID
 * @param {string} query - 用户查询文本
 * @returns {Promise<Object>} - 处理结果
 */
const callMCPService = async (serverId, query) => {
  try {
    logger.info(`调用MCP服务: ${serverId}, 查询: ${query}`);
    
    const result = await callMCPClient(serverId, query);
    const parsedResult = JSON.parse(result);
    
    logger.info(`MCP服务 ${serverId} 调用成功`);
    return parsedResult;
  } catch (error) {
    logger.error(`调用MCP服务 ${serverId} 失败: ${error.message}`);
    throw new Error(`MCP服务调用失败: ${error.message}`);
  }
};

/**
 * 调用高德地图MCP服务
 * @param {string} query - 地点查询文本
 * @param {string} [serverId] - 可选的服务器ID，如果未提供则使用配置中的默认ID
 * @returns {Promise<Object>} - 查询结果
 */
const queryAMapService = async (query, serverId) => {
  try {
    // 使用提供的服务器ID或配置中的默认ID
    const mapServerId = serverId || config.mcp.amapServerId || getDefaultMapServerId();
    logger.info(`调用地图MCP服务，服务器ID: ${mapServerId}，查询: ${query}`);
    
    const result = await callMCPClient(mapServerId, query);
    const parsedResult = JSON.parse(result);
    
    logger.info(`地图MCP服务(${mapServerId})调用成功`);
    return parsedResult;
  } catch (error) {
    logger.error(`调用地图MCP服务失败: ${error.message}`);
    throw new Error(`地图服务查询失败: ${error.message}`);
  }
};

/**
 * 获取默认地图服务器ID
 * @returns {string} - 默认地图服务器ID
 */
const getDefaultMapServerId = () => {
  try {
    // 尝试读取配置文件获取默认服务器
    const configFilePath = path.join(config.mcp.configPath, 'mcp_servers.json');
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      const serverConfig = JSON.parse(configData);
      
      // 查找包含"amap"或"地图"的服务器ID
      if (serverConfig.mcpServers) {
        for (const [serverId, serverInfo] of Object.entries(serverConfig.mcpServers)) {
          if (serverId.includes('amap') || 
              (serverInfo.name && serverInfo.name.toLowerCase().includes('地图')) ||
              (serverInfo.description && serverInfo.description.toLowerCase().includes('地图'))) {
            return serverId;
          }
        }
      }
      
      // 如果有默认服务器，也可以考虑使用
      if (serverConfig.defaultServer) {
        return serverConfig.defaultServer;
      }
    }
    
    // 如果找不到，返回一个通用ID
    return process.env.DEFAULT_AMAP_SERVER_ID || 'amap-maps';
  } catch (error) {
    logger.error(`获取默认地图服务器ID时出错: ${error.message}`);
    return 'amap-maps';
  }
};

/**
 * 调用文本转语音MCP服务
 * @param {string} text - 需要转换为语音的文本
 * @param {string} [serverId] - 可选的服务器ID，如果未提供则使用配置中的默认ID
 * @returns {Promise<string>} - 语音URL
 */
const textToSpeechMinimax = async (text, serverId) => {
  try {
    // 使用提供的服务器ID或配置中的默认ID
    const ttsServerId = serverId || config.mcp.minimaxServerId || getDefaultTtsServerId();
    logger.info(`调用文本转语音MCP服务，服务器ID: ${ttsServerId}，文本: ${text.substring(0, 50)}...`);
    
    // 构造特定的TTS查询
    const ttsQuery = `请将以下文本转换为语音并返回URL: ${text}`;
    const options = { action: 'tts' };
    
    const result = await callMCPClient(ttsServerId, ttsQuery, options);
    const parsedResult = JSON.parse(result);
    
    // 提取音频URL，具体字段名需要根据实际MCP服务返回调整
    let audioUrl = null;
    
    if (parsedResult.data && parsedResult.data.audio_url) {
      audioUrl = parsedResult.data.audio_url;
    } else if (parsedResult.audioUrl) {
      audioUrl = parsedResult.audioUrl;
    } else if (parsedResult.data && parsedResult.data.audioUrl) {
      audioUrl = parsedResult.data.audioUrl;
    } else {
      // 尝试匹配URL
      const urlMatch = result.match(/https?:\/\/[^\s"']+\.(?:mp3|wav|ogg|m4a)/i);
      if (urlMatch) {
        audioUrl = urlMatch[0];
      }
    }
    
    if (!audioUrl) {
      throw new Error('无法从MCP响应中提取音频URL');
    }
    
    logger.info(`文本转语音MCP服务(${ttsServerId})调用成功，音频URL: ${audioUrl}`);
    return audioUrl;
  } catch (error) {
    logger.error(`调用文本转语音MCP服务失败: ${error.message}`);
    throw new Error(`语音合成失败: ${error.message}`);
  }
};

/**
 * 获取默认文本转语音服务器ID
 * @returns {string} - 默认文本转语音服务器ID
 */
const getDefaultTtsServerId = () => {
  try {
    // 尝试读取配置文件获取默认服务器
    const configFilePath = path.join(config.mcp.configPath, 'mcp_servers.json');
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      const serverConfig = JSON.parse(configData);
      
      // 查找包含"minimax"或"语音"的服务器ID
      if (serverConfig.mcpServers) {
        for (const [serverId, serverInfo] of Object.entries(serverConfig.mcpServers)) {
          if (serverId.includes('minimax') || serverId.includes('MiniMax') ||
              (serverInfo.name && (
                serverInfo.name.toLowerCase().includes('语音') || 
                serverInfo.name.toLowerCase().includes('minimax')
              )) ||
              (serverInfo.description && (
                serverInfo.description.toLowerCase().includes('语音') || 
                serverInfo.description.toLowerCase().includes('minimax')
              ))) {
            return serverId;
          }
        }
      }
      
      // 如果在环境变量中设置了默认服务器
      if (process.env.DEFAULT_MINIMAX_SERVER_ID) {
        return process.env.DEFAULT_MINIMAX_SERVER_ID;
      }
    }
    
    // 如果找不到，返回一个通用ID
    return 'MiniMax';
  } catch (error) {
    logger.error(`获取默认文本转语音服务器ID时出错: ${error.message}`);
    return 'MiniMax';
  }
};

module.exports = {
  getMCPServers,
  callMCPService,
  queryAMapService,
  textToSpeechMinimax
}; 