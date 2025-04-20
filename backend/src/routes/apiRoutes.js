/**
 * 统一API路由处理模块
 * 提供标准化的API入口，统一请求和响应格式
 */

const express = require('express');
const router = express.Router();
const mcpService = require('../services/mcpService');
const mcpGatewayService = require('../services/mcpGatewayService');
const testServiceController = require('../controllers/testServiceController');
const logger = require('../utils/logger');

/**
 * 标准化响应格式
 * @param {Object} res - Express响应对象
 * @param {Number} statusCode - HTTP状态码
 * @param {String} status - 业务状态 (success, error, waiting)
 * @param {Object} data - 响应数据
 * @param {String} message - 响应消息
 */
const standardResponse = (res, statusCode = 200, status = 'success', data = null, message = '') => {
  return res.status(statusCode).json({
    status, 
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * 统一错误处理
 */
const errorHandler = (res, error) => {
  logger.error(`API错误: ${error.message}`, { error });
  
  const statusCode = error.statusCode || 500;
  return standardResponse(
    res, 
    statusCode, 
    'error', 
    null, 
    error.message || '服务器内部错误'
  );
};

/**
 * @api {post} /api/v1/chat 处理用户聊天请求
 * @apiDescription 统一处理所有用户聊天/指令请求
 * @apiName Chat
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} query 用户输入的文本
 * @apiParam {String} userId 用户ID
 * @apiParam {String} [sessionId] 会话ID，如未提供则自动创建
 * @apiParam {Object} [context] 上下文信息
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.post('/chat', async (req, res) => {
  try {
    const { query, userId, sessionId, context } = req.body;
    
    if (!query || !userId) {
      return standardResponse(res, 400, 'error', null, '缺少必要参数');
    }
    
    // 调用测试服务处理请求 (将来会替换为AI网关层)
    const result = await testServiceController.processRequest(query, userId, sessionId, context);
    
    return standardResponse(res, 200, 'success', result, '请求处理成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {post} /api/v1/voice 处理用户语音请求
 * @apiDescription 统一处理所有用户语音请求
 * @apiName Voice
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} voiceText 语音转换的文本
 * @apiParam {String} userId 用户ID
 * @apiParam {String} [sessionId] 会话ID，如未提供则自动创建
 * @apiParam {Object} [context] 上下文信息
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.post('/voice', async (req, res) => {
  try {
    const { voiceText, userId, sessionId, context } = req.body;
    
    if (!voiceText || !userId) {
      return standardResponse(res, 400, 'error', null, '缺少必要参数');
    }
    
    // 调用语音处理服务 (先用测试服务模拟)
    const result = await testServiceController.processVoiceRequest(req, res);
    
    // 注意: 这里不直接返回，因为processVoiceRequest已经发送了响应
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {get} /api/v1/services 获取可用服务列表
 * @apiDescription 获取所有可用的MCP服务
 * @apiName GetServices
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.get('/services', async (req, res) => {
  try {
    const servers = await mcpService.getMCPServers();
    
    return standardResponse(res, 200, 'success', { servers }, '获取服务列表成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {post} /api/v1/mcp/execute 执行MCP服务
 * @apiDescription 直接执行指定的MCP服务
 * @apiName ExecuteMCP
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} serverId MCP服务ID
 * @apiParam {String} query 用户查询
 * @apiParam {Object} [options] 附加选项
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.post('/mcp/execute', async (req, res) => {
  try {
    const { serverId, query, options } = req.body;
    
    if (!serverId || !query) {
      return standardResponse(res, 400, 'error', null, '缺少必要参数');
    }
    
    const result = await mcpService.callMCPClient(serverId, query, options);
    
    return standardResponse(res, 200, 'success', { result: JSON.parse(result) }, 'MCP服务执行成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {post} /api/v1/mcp/gateway/:serverId 通过MCP_client处理请求
 * @apiDescription 通过指定的MCP服务器处理请求
 * @apiName MCPGateway
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} serverId MCP服务器ID (路径参数)
 * @apiParam {Object} body 请求体，包含查询内容
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.post('/mcp/gateway/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const requestData = req.body;
    
    logger.info(`收到MCP网关请求，服务器ID: ${serverId}`);
    
    // 检查服务器是否存在
    const serverExists = await mcpGatewayService.checkServerExists(serverId);
    if (!serverExists) {
      return standardResponse(res, 404, 'error', null, `指定的MCP服务器不存在: ${serverId}`);
    }
    
    // 通过MCP_client处理请求
    const result = await mcpGatewayService.processRequestViaMCPClient(serverId, requestData);
    
    return standardResponse(res, 200, 'success', result, 'MCP请求处理成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {post} /api/v1/mcp/tools/:serverId 获取MCP服务器工具列表
 * @apiDescription 获取指定MCP服务器的可用工具列表
 * @apiName GetMCPTools
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} serverId MCP服务器ID (路径参数)
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.get('/mcp/tools/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    logger.info(`获取MCP服务器工具列表，服务器ID: ${serverId}`);
    
    // 检查服务器是否存在
    const serverExists = await mcpGatewayService.checkServerExists(serverId);
    if (!serverExists) {
      return standardResponse(res, 404, 'error', null, `指定的MCP服务器不存在: ${serverId}`);
    }
    
    // 获取工具列表
    const tools = await mcpGatewayService.getServerTools(serverId);
    
    return standardResponse(res, 200, 'success', { tools }, '获取工具列表成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

/**
 * @api {post} /api/v1/mcp/tool/:serverId/:toolName 执行特定工具
 * @apiDescription 在指定MCP服务器上执行特定工具
 * @apiName ExecuteMCPTool
 * @apiGroup API
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} serverId MCP服务器ID (路径参数)
 * @apiParam {String} toolName 工具名称 (路径参数)
 * @apiParam {Object} body 工具参数
 * 
 * @apiSuccess {String} status 请求状态
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} message 状态消息
 * @apiSuccess {String} timestamp 时间戳
 */
router.post('/mcp/tool/:serverId/:toolName', async (req, res) => {
  try {
    const { serverId, toolName } = req.params;
    const toolParams = req.body;
    
    logger.info(`执行MCP工具，服务器ID: ${serverId}，工具: ${toolName}`);
    
    // 检查服务器是否存在
    const serverExists = await mcpGatewayService.checkServerExists(serverId);
    if (!serverExists) {
      return standardResponse(res, 404, 'error', null, `指定的MCP服务器不存在: ${serverId}`);
    }
    
    // 执行工具调用
    const result = await mcpGatewayService.executeToolCall(serverId, toolName, toolParams);
    
    return standardResponse(res, 200, 'success', result, '工具执行成功');
  } catch (error) {
    return errorHandler(res, error);
  }
});

module.exports = router; 