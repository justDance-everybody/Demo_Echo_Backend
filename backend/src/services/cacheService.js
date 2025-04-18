/**
 * Redis缓存服务
 * 实现数据缓存机制，提高API响应速度
 * 任务: T005-1-1 设置Redis缓存
 */

const redis = require('redis');
const { promisify } = require('util');
const logger = require('../utils/logger');
const config = require('../config');

// 创建Redis客户端
const redisConfig = config.redis || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
};

// 创建Redis客户端
const client = redis.createClient(redisConfig);

// 将Redis回调函数转换为Promise
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const expireAsync = promisify(client.expire).bind(client);
const existsAsync = promisify(client.exists).bind(client);

// 连接事件处理
client.on('connect', () => {
  logger.info('Redis客户端已连接');
});

client.on('error', (err) => {
  logger.error(`Redis客户端错误: ${err.message}`);
});

/**
 * 缓存服务
 */
class CacheService {
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} expireTime - 过期时间(秒)
   * @returns {Promise<boolean>} - 设置结果
   */
  async set(key, value, expireTime = 3600) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await setAsync(key, stringValue);
      
      if (expireTime > 0) {
        await expireAsync(key, expireTime);
      }
      
      return true;
    } catch (error) {
      logger.error(`设置缓存失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any>} - 缓存值
   */
  async get(key) {
    try {
      const value = await getAsync(key);
      
      if (!value) return null;
      
      try {
        // 尝试解析JSON
        return JSON.parse(value);
      } catch (e) {
        // 如果不是JSON，则返回原始值
        return value;
      }
    } catch (error) {
      logger.error(`获取缓存失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} - 删除结果
   */
  async del(key) {
    try {
      await delAsync(key);
      return true;
    } catch (error) {
      logger.error(`删除缓存失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} - 是否存在
   */
  async exists(key) {
    try {
      const result = await existsAsync(key);
      return result === 1;
    } catch (error) {
      logger.error(`检查缓存键失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = new CacheService();