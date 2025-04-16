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
 * 调用MCP客户端执行查询
 * @param {string} serverId - MCP服务器ID
 * @param {string} query - 查询文本
 * @returns {Promise<string>} - 查询结果
 */
const callMCPClient = async (serverId, query) => {
  ensureTmpDir();
  
  const requestId = uuidv4();
  const inputFile = path.join(TMP_DIR, `${requestId}_input.json`);
  const outputFile = path.join(TMP_DIR, `${requestId}_output.json`);

  // 写入查询到临时文件
  fs.writeFileSync(inputFile, JSON.stringify({ query }), 'utf8');
  
  logger.info(`调用MCP客户端, 服务器ID: ${serverId}, 请求ID: ${requestId}`);
  
  // 模拟响应用于测试
  if (config.mcp.useMockResponses) {
    logger.info('使用模拟响应模式');
    
    if (serverId === config.mcp.amapServerId) {
      return JSON.stringify({
        status: 'success',
        data: {
          pois: [
            {
              name: '天安门',
              address: '北京市东城区东长安街',
              type: '旅游景点',
              tel: '',
              location: { lat: 39.908722, lng: 116.397499 }
            }
          ]
        }
      });
    } else if (serverId === config.mcp.minimaxServerId) {
      return JSON.stringify({
        status: 'success',
        data: {
          // 使用真实的公共音频URL
          audio_url: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
          duration: 5.2
        }
      });
    } else {
      throw new Error(`未知的服务器ID: ${serverId}`);
    }
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
 * 调用高德地图MCP服务
 * @param {string} query - 地点查询文本
 * @returns {Promise<Object>} - 查询结果
 */
const queryAMapService = async (query) => {
  try {
    logger.info(`调用高德地图MCP服务，查询: ${query}`);
    
    const result = await callMCPClient(config.mcp.amapServerId, query);
    const parsedResult = JSON.parse(result);
    
    logger.info('高德地图MCP服务调用成功');
    return parsedResult;
  } catch (error) {
    logger.error(`调用高德地图MCP服务失败: ${error.message}`);
    throw new Error(`地图服务查询失败: ${error.message}`);
  }
};

/**
 * 调用Minimax TTS MCP服务
 * @param {string} text - 需要转换为语音的文本
 * @returns {Promise<string>} - 语音URL
 */
const textToSpeechMinimax = async (text) => {
  try {
    logger.info(`调用Minimax TTS MCP服务，文本: ${text.substring(0, 50)}...`);
    
    // 构造特定的TTS查询
    const ttsQuery = `请将以下文本转换为语音并返回URL: ${text}`;
    
    const result = await callMCPClient(config.mcp.minimaxServerId, ttsQuery);
    const parsedResult = JSON.parse(result);
    
    // 提取音频URL，具体字段名需要根据实际MCP服务返回调整
    let audioUrl = null;
    
    if (parsedResult.data && parsedResult.data.audio_url) {
      audioUrl = parsedResult.data.audio_url;
    } else if (parsedResult.audio_url) {
      audioUrl = parsedResult.audio_url;
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
    
    logger.info(`Minimax TTS MCP服务调用成功，音频URL: ${audioUrl}`);
    return audioUrl;
  } catch (error) {
    logger.error(`调用Minimax TTS MCP服务失败: ${error.message}`);
    throw new Error(`语音合成失败: ${error.message}`);
  }
};

module.exports = {
  queryAMapService,
  textToSpeechMinimax
}; 