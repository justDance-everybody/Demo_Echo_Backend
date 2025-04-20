/**
 * MCP网关服务
 * 提供解析请求并通过MCP_client处理的功能
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// 临时文件目录
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
 * 通过MCP_client处理请求
 * @param {string} serverId - MCP服务器ID
 * @param {Object} requestData - 请求数据
 * @returns {Promise<Object>} - 响应结果
 */
const processRequestViaMCPClient = async (serverId, requestData) => {
  ensureTmpDir();
  
  const requestId = uuidv4();
  const inputFile = path.join(TMP_DIR, `${requestId}_input.json`);
  const outputFile = path.join(TMP_DIR, `${requestId}_output.json`);

  logger.info(`网关请求MCP_client处理, 服务器ID: ${serverId}, 请求ID: ${requestId}`);
  logger.debug(`请求内容: ${JSON.stringify(requestData)}`);
  
  // 将请求数据转换为MCP_client需要的格式
  const clientRequestData = {
    query: requestData.query || "空查询",
    options: requestData.options || {},
    timestamp: requestData.timestamp || new Date().toISOString(),
    // 保留原始请求中的其他字段
    ...requestData
  };
  
  // 写入请求数据到临时文件
  fs.writeFileSync(inputFile, JSON.stringify(clientRequestData), 'utf8');
  
  // 检查是否使用uv run命令
  let pythonProcess;
  if (config.mcp.pythonPath.startsWith('uv run')) {
    // 使用uv run命令
    pythonProcess = spawn('uv', [
      'run',
      config.mcp.clientPath,
      serverId,
      '--request', inputFile,
      '--output', outputFile,
      '--debug'
    ]);
  } else {
    // 使用传统Python命令
    pythonProcess = spawn(config.mcp.pythonPath, [
      config.mcp.clientPath,
      serverId,
      '--request', inputFile,
      '--output', outputFile,
      '--debug'
    ]);
  }
  
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
          
          try {
            const jsonResult = JSON.parse(result);
            resolve(jsonResult);
          } catch (parseError) {
            logger.warn(`MCP客户端输出不是有效的JSON: ${parseError.message}`);
            // 即使不是JSON也原样返回
            resolve({ rawResponse: result });
          }
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
 * 执行特定工具调用
 * @param {string} serverId - MCP服务器ID
 * @param {string} toolName - 工具名称
 * @param {Object} toolParams - 工具参数
 * @returns {Promise<Object>} - 工具执行结果
 */
const executeToolCall = async (serverId, toolName, toolParams) => {
  logger.info(`请求执行工具调用, 服务器ID: ${serverId}, 工具: ${toolName}`);
  
  // 创建一个请求格式，包含工具调用信息
  const requestData = {
    action: 'call_tool',  // 修改为mcp_client.py中定义的操作类型
    tool: toolName,       // 修改字段名以匹配mcp_client.py
    params: toolParams,   // 保持一致的参数名
    timestamp: new Date().toISOString()
  };
  
  return await processRequestViaMCPClient(serverId, requestData);
};

/**
 * 获取服务器可用工具列表
 * @param {string} serverId - MCP服务器ID
 * @returns {Promise<Array>} - 工具列表
 */
const getServerTools = async (serverId) => {
  logger.info(`获取服务器工具列表, 服务器ID: ${serverId}`);
  
  // 创建一个请求格式，包含获取工具列表的标识
  const requestData = {
    action: 'list_tools',  // 修改为mcp_client.py中定义的操作类型
    timestamp: new Date().toISOString()
  };
  
  const result = await processRequestViaMCPClient(serverId, requestData);
  return result.tools || [];
};

/**
 * 清理临时文件
 * @param  {...string} files - 要删除的文件路径
 */
const cleanupFiles = (...files) => {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        logger.debug(`已删除临时文件: ${file}`);
      } catch (error) {
        logger.warn(`删除临时文件时出错: ${file}, ${error.message}`);
      }
    }
  });
};

/**
 * 检查MCP服务器是否存在
 * @param {string} serverId - MCP服务器ID
 * @returns {Promise<boolean>} - 服务器是否存在
 */
const checkServerExists = async (serverId) => {
  try {
    const configFilePath = path.join(config.mcp.configPath, 'mcp_servers.json');
    
    if (!fs.existsSync(configFilePath)) {
      logger.error(`MCP服务器配置文件不存在: ${configFilePath}`);
      return false;
    }
    
    const configData = fs.readFileSync(configFilePath, 'utf8');
    const serverConfig = JSON.parse(configData);
    
    return (serverConfig.mcpServers && serverConfig.mcpServers[serverId] && serverConfig.mcpServers[serverId].enabled !== false);
  } catch (error) {
    logger.error(`检查MCP服务器是否存在时出错: ${error.message}`);
    return false;
  }
};

module.exports = {
  processRequestViaMCPClient,
  executeToolCall,
  getServerTools,
  checkServerExists
}; 