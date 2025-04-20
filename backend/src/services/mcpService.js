/**
 * MCP服务模块
 * 提供MCP服务器相关的功能
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 获取MCP服务器列表
 * @returns {Promise<Array>} MCP服务器列表
 */
const getMCPServers = async () => {
  try {
    const configPath = path.join(config.mcp.configPath, 'mcp_servers.json');
    if (!fs.existsSync(configPath)) {
      logger.error(`MCP服务器配置文件不存在: ${configPath}`);
      return [];
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const serverConfig = JSON.parse(configData);
    
    if (!serverConfig.mcpServers) {
      logger.error('MCP服务器配置无效，缺少mcpServers节点');
      return [];
    }
    
    // 构建服务器列表，过滤掉已禁用的服务器
    const serverList = Object.entries(serverConfig.mcpServers)
      .filter(([_, server]) => server.enabled !== false)
      .map(([id, server]) => ({
        id,
        name: server.name || id,
        description: server.description || '',
        enabled: server.enabled !== false
      }));
      
    return serverList;
  } catch (error) {
    logger.error(`获取MCP服务器列表出错: ${error.message}`);
    return [];
  }
};

/**
 * 调用MCP客户端处理请求
 * @param {string} serverId - MCP服务器ID
 * @param {string} query - 查询内容
 * @param {Object} options - 附加选项
 * @returns {Promise<string>} - MCP客户端返回的结果
 */
const callMCPClient = (serverId, query, options = {}) => {
  return new Promise((resolve, reject) => {
    if (config.mcp.useMockResponses) {
      logger.info(`使用模拟响应模式，不实际调用MCP客户端`);
      // 返回模拟数据
      return resolve(JSON.stringify({
        success: true,
        mockData: true,
        serverId,
        query,
        options,
        result: "这是MCP服务的模拟响应"
      }));
    }
    
    // 构建Python命令和参数
    let pythonProcess;
    if (config.mcp.pythonPath.startsWith('uv run')) {
      // 使用uv run命令
      pythonProcess = spawn('uv', [
        'run',
        config.mcp.clientPath,
        serverId,
        '--query', query,
        '--debug'
      ]);
    } else {
      // 使用传统Python命令
      pythonProcess = spawn(config.mcp.pythonPath, [
        config.mcp.clientPath,
        serverId,
        '--query', query,
        '--debug'
      ]);
    }
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      logger.error(`MCP客户端错误: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`MCP客户端退出，状态码: ${code}, 错误: ${stderr}`);
        return reject(new Error(`MCP客户端执行失败，状态码: ${code}`));
      }
      
      resolve(stdout);
    });
    
    pythonProcess.on('error', (error) => {
      logger.error(`启动MCP客户端时出错: ${error.message}`);
      reject(error);
    });
  });
};

module.exports = {
  getMCPServers,
  callMCPClient
}; 