// MCP客户端实现

/**
 * MCP客户端核心实现
 * 负责与MCP服务器通信，执行服务调用
 */

const axios = require('axios');
const config = require('config');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

// 存储待确认的操作
const pendingConfirmations = new Map();

// MCP客户端类
class McpClient {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || config.get('mcp.serverUrl');
    this.initialized = false;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000 // 30秒超时
    });
  }

  // 初始化客户端
  async init() {
    try {
      // 检查MCP服务器连接
      const response = await this.httpClient.get('/health');
      if (response.status === 200) {
        this.initialized = true;
        logger.info('MCP Server connection established');
        return true;
      }
    } catch (error) {
      logger.warn(`MCP Server connection failed: ${error.message}`);
      logger.info('Will retry connecting to MCP Server on first request');
    }
    return false;
  }

  // 执行MCP服务调用
  async execute(operation, params, requireConfirmation = false, userId = null) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // 记录请求
      logger.info(`Executing MCP operation: ${operation}`, { 
        params, 
        requireConfirmation,
        userId 
      });

      // 如果需要确认，先生成确认ID并存储请求
      if (requireConfirmation) {
        const confirmationId = uuidv4();
        const operationSummary = this.generateOperationSummary(operation, params);
        
        pendingConfirmations.set(confirmationId, {
          operation,
          params,
          userId,
          timestamp: Date.now()
        });

        // 设置确认超时（10分钟后自动清除）
        setTimeout(() => {
          if (pendingConfirmations.has(confirmationId)) {
            pendingConfirmations.delete(confirmationId);
            logger.info(`Confirmation ${confirmationId} expired`);
          }
        }, 10 * 60 * 1000);

        // 返回需要确认的响应
        return {
          status: 'confirmation_required',
          operationSummary,
          confirmationId
        };
      }

      // 直接执行操作
      return await this.callMcpService(operation, params);
    } catch (error) {
      logger.error(`MCP execution error: ${error.message}`, { operation, params });
      throw error;
    }
  }

  // 确认执行操作
  async confirm(confirmationId, confirmed) {
    if (!pendingConfirmations.has(confirmationId)) {
      throw new Error('Confirmation ID not found or expired');
    }

    const { operation, params, userId } = pendingConfirmations.get(confirmationId);
    
    // 无论是否确认，都删除这个确认记录
    pendingConfirmations.delete(confirmationId);

    if (!confirmed) {
      logger.info(`Operation ${operation} rejected by user`);
      return {
        status: 'rejected',
        message: 'Operation was rejected by the user'
      };
    }

    // 用户确认，执行操作
    logger.info(`Executing confirmed operation: ${operation}`);
    return await this.callMcpService(operation, params);
  }

  // 生成操作摘要
  generateOperationSummary(operation, params) {
    // 根据操作类型生成对用户友好的摘要
    let summary = `执行操作: ${operation}`;
    
    if (operation.includes('transfer')) {
      summary = `转账操作: 发送 ${params.amount} 到地址 ${this.abbreviateAddress(params.toAddress)}`;
    } else if (operation.includes('getBalance')) {
      summary = `查询余额: 地址 ${this.abbreviateAddress(params.address)}`;
    } else if (operation.includes('executeSwap')) {
      summary = `代币交换: 用 ${params.amount} ${params.inputMint} 换取 ${params.outputMint}`;
    }
    
    return summary;
  }

  // 地址缩写（显示前5位和后5位）
  abbreviateAddress(address) {
    if (!address || address.length <= 10) return address;
    return `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;
  }

  // 调用MCP服务
  async callMcpService(operation, params) {
    try {
      const response = await this.httpClient.post('/execute', {
        operation,
        params
      });
      
      logger.info(`MCP operation ${operation} succeeded`, { 
        responseStatus: response.status 
      });
      
      return {
        status: 'success',
        result: response.data
      };
    } catch (error) {
      logger.error(`MCP service call failed: ${error.message}`, { operation, params });
      
      if (error.response) {
        // 服务器返回了错误响应
        return {
          status: 'error',
          error: error.response.data.error || 'Unknown server error',
          code: error.response.status
        };
      } else if (error.request) {
        // 请求发送了但没有收到响应
        return {
          status: 'error',
          error: 'No response from MCP server',
          code: 'CONNECTION_ERROR'
        };
      } else {
        // 请求设置时发生错误
        return {
          status: 'error',
          error: error.message,
          code: 'REQUEST_ERROR'
        };
      }
    }
  }
}

module.exports = new McpClient();
