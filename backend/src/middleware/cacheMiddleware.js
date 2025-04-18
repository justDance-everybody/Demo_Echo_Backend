/**
 * Redis缓存中间件
 * 用于API请求的缓存处理
 * 任务: T005-1-1 设置Redis缓存
 */

const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * 创建缓存中间件
 * @param {number} duration - 缓存时间(秒)
 * @param {Function} keyGenerator - 自定义缓存键生成函数
 * @returns {Function} - Express中间件
 */
const cache = (duration = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    // 跳过非GET请求的缓存
    if (req.method !== 'GET') {
      return next();
    }

    // 生成缓存键
    const generateKey = () => {
      if (keyGenerator && typeof keyGenerator === 'function') {
        return keyGenerator(req);
      }
      // 默认使用URL作为缓存键
      return `api:${req.originalUrl || req.url}`;
    };

    const key = generateKey();

    try {
      // 检查缓存是否存在
      const cachedData = await cacheService.get(key);
      
      if (cachedData) {
        logger.info(`从缓存返回: ${key}`);
        // 添加缓存标识头
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // 缓存未命中，修改res.json方法以在返回前缓存结果
      const originalJson = res.json;
      res.json = function(data) {
        // 恢复原始json方法
        res.json = originalJson;
        
        // 缓存响应数据
        cacheService.set(key, data, duration)
          .then(() => logger.info(`已缓存: ${key}, 有效期: ${duration}秒`))
          .catch(err => logger.error(`缓存失败: ${err.message}`));
        
        // 添加缓存标识头
        res.set('X-Cache', 'MISS');
        
        // 调用原始json方法返回响应
        return res.json(data);
      };

      next();
    } catch (error) {
      logger.error(`缓存中间件错误: ${error.message}`);
      next();
    }
  };
};

/**
 * 清除指定路径的缓存
 * @param {string} path - API路径
 * @returns {Function} - Express中间件
 */
const clearCache = (path) => {
  return async (req, res, next) => {
    const key = `api:${path}`;
    
    try {
      await cacheService.del(key);
      logger.info(`已清除缓存: ${key}`);
    } catch (error) {
      logger.error(`清除缓存失败: ${error.message}`);
    }
    
    next();
  };
};

module.exports = {
  cache,
  clearCache
};