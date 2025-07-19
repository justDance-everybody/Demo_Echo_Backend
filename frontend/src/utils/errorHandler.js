import { message } from 'antd';

// 错误类型枚举
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VOICE: 'VOICE',
  API: 'API',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  UNKNOWN: 'UNKNOWN'
};

// 错误级别
export const ERROR_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// 错误消息映射
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    default: '网络连接异常，请检查网络设置',
    timeout: '请求超时，请稍后重试',
    offline: '网络连接已断开，请检查网络连接'
  },
  [ERROR_TYPES.VOICE]: {
    default: '语音功能异常',
    permission: '需要麦克风权限才能使用语音功能',
    notSupported: '当前浏览器不支持语音功能',
    recording: '录音过程中出现错误',
    playback: '语音播放失败'
  },
  [ERROR_TYPES.API]: {
    default: '服务异常，请稍后重试',
    unauthorized: '身份验证失败，请重新登录',
    forbidden: '没有权限执行此操作',
    notFound: '请求的资源不存在',
    serverError: '服务器内部错误'
  },
  [ERROR_TYPES.VALIDATION]: {
    default: '输入数据格式错误',
    required: '必填字段不能为空',
    format: '数据格式不正确'
  },
  [ERROR_TYPES.PERMISSION]: {
    default: '权限不足',
    microphone: '需要麦克风权限',
    camera: '需要摄像头权限'
  },
  [ERROR_TYPES.UNKNOWN]: {
    default: '未知错误，请稍后重试'
  }
};

/**
 * 错误分类器
 * @param {Error|string} error - 错误对象或错误消息
 * @returns {object} 包含错误类型和详细信息的对象
 */
function classifyError(error) {
  const errorMessage = error?.message || error || '';
  const errorCode = error?.code || error?.status;
  
  // 网络错误
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || 
      errorMessage.includes('timeout') || errorCode === 'NETWORK_ERROR') {
    return {
      type: ERROR_TYPES.NETWORK,
      subType: errorMessage.includes('timeout') ? 'timeout' : 'default'
    };
  }
  
  // 语音错误
  if (errorMessage.includes('microphone') || errorMessage.includes('audio') ||
      errorMessage.includes('speech') || errorMessage.includes('voice')) {
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return { type: ERROR_TYPES.VOICE, subType: 'permission' };
    }
    if (errorMessage.includes('not supported')) {
      return { type: ERROR_TYPES.VOICE, subType: 'notSupported' };
    }
    return { type: ERROR_TYPES.VOICE, subType: 'default' };
  }
  
  // API错误
  if (errorCode) {
    switch (errorCode) {
      case 401:
        return { type: ERROR_TYPES.API, subType: 'unauthorized' };
      case 403:
        return { type: ERROR_TYPES.API, subType: 'forbidden' };
      case 404:
        return { type: ERROR_TYPES.API, subType: 'notFound' };
      case 500:
      case 502:
      case 503:
        return { type: ERROR_TYPES.API, subType: 'serverError' };
      default:
        return { type: ERROR_TYPES.API, subType: 'default' };
    }
  }
  
  // 验证错误
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return { type: ERROR_TYPES.VALIDATION, subType: 'default' };
  }
  
  // 权限错误
  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return { type: ERROR_TYPES.PERMISSION, subType: 'default' };
  }
  
  // 未知错误
  return { type: ERROR_TYPES.UNKNOWN, subType: 'default' };
}

/**
 * 获取用户友好的错误消息
 * @param {string} type - 错误类型
 * @param {string} subType - 错误子类型
 * @param {string} originalMessage - 原始错误消息
 * @returns {string} 用户友好的错误消息
 */
function getUserFriendlyMessage(type, subType, originalMessage) {
  const typeMessages = ERROR_MESSAGES[type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
  const message = typeMessages[subType] || typeMessages.default;
  
  // 在开发环境下，附加原始错误信息
  if (process.env.NODE_ENV === 'development' && originalMessage) {
    return `${message} (${originalMessage})`;
  }
  
  return message;
}

/**
 * 确定错误级别
 * @param {string} type - 错误类型
 * @param {string} subType - 错误子类型
 * @returns {string} 错误级别
 */
function getErrorLevel(type, subType) {
  switch (type) {
    case ERROR_TYPES.NETWORK:
      return subType === 'offline' ? ERROR_LEVELS.CRITICAL : ERROR_LEVELS.ERROR;
    case ERROR_TYPES.VOICE:
      return subType === 'permission' ? ERROR_LEVELS.WARNING : ERROR_LEVELS.ERROR;
    case ERROR_TYPES.API:
      return subType === 'serverError' ? ERROR_LEVELS.CRITICAL : ERROR_LEVELS.ERROR;
    case ERROR_TYPES.VALIDATION:
      return ERROR_LEVELS.WARNING;
    case ERROR_TYPES.PERMISSION:
      return ERROR_LEVELS.WARNING;
    default:
      return ERROR_LEVELS.ERROR;
  }
}

/**
 * 创建标准化的错误处理器
 * @param {object} options - 配置选项
 * @returns {function} 错误处理函数
 */
export function createErrorHandler(options = {}) {
  const {
    showToast = true,
    logToConsole = true,
    onError = null,
    context = 'Unknown'
  } = options;
  
  return function handleError(error, additionalContext = '') {
    try {
      // 分类错误
      const { type, subType } = classifyError(error);
      
      // 获取错误信息
      const originalMessage = error?.message || error || '';
      const userMessage = getUserFriendlyMessage(type, subType, originalMessage);
      const level = getErrorLevel(type, subType);
      
      // 构建完整的错误信息
      const fullContext = additionalContext ? `${context} - ${additionalContext}` : context;
      
      // 控制台日志
      if (logToConsole) {
        const logMethod = level === ERROR_LEVELS.CRITICAL ? 'error' : 
                         level === ERROR_LEVELS.ERROR ? 'error' :
                         level === ERROR_LEVELS.WARNING ? 'warn' : 'info';
        
        console[logMethod](`[${fullContext}] ${type}/${subType}:`, {
          userMessage,
          originalError: error,
          level,
          timestamp: new Date().toISOString()
        });
      }
      
      // 显示用户提示
      if (showToast) {
        switch (level) {
          case ERROR_LEVELS.CRITICAL:
            message.error(userMessage, 5);
            break;
          case ERROR_LEVELS.ERROR:
            message.error(userMessage, 3);
            break;
          case ERROR_LEVELS.WARNING:
            message.warning(userMessage, 2);
            break;
          case ERROR_LEVELS.INFO:
            message.info(userMessage, 1);
            break;
        }
      }
      
      // 调用自定义错误处理器
      if (onError && typeof onError === 'function') {
        onError({
          type,
          subType,
          level,
          userMessage,
          originalError: error,
          context: fullContext,
          timestamp: new Date().toISOString()
        });
      }
      
      // 返回标准化的错误对象
      return {
        type,
        subType,
        level,
        userMessage,
        originalError: error,
        context: fullContext,
        handled: true
      };
      
    } catch (handlerError) {
      // 错误处理器本身出错的情况
      console.error('Error in error handler:', handlerError);
      
      if (showToast) {
        message.error('系统异常，请刷新页面重试');
      }
      
      return {
        type: ERROR_TYPES.UNKNOWN,
        subType: 'default',
        level: ERROR_LEVELS.CRITICAL,
        userMessage: '系统异常，请刷新页面重试',
        originalError: error,
        context,
        handled: false
      };
    }
  };
}

/**
 * 预定义的错误处理器
 */
export const defaultErrorHandler = createErrorHandler({
  context: 'Application',
  showToast: true,
  logToConsole: true
});

export const voiceErrorHandler = createErrorHandler({
  context: 'Voice',
  showToast: true,
  logToConsole: true
});

export const apiErrorHandler = createErrorHandler({
  context: 'API',
  showToast: true,
  logToConsole: true
});

/**
 * 异步错误处理包装器
 * @param {function} asyncFunction - 异步函数
 * @param {function} errorHandler - 错误处理器
 * @returns {function} 包装后的异步函数
 */
export function withErrorHandling(asyncFunction, errorHandler = defaultErrorHandler) {
  return async function(...args) {
    try {
      return await asyncFunction.apply(this, args);
    } catch (error) {
      errorHandler(error);
      throw error; // 重新抛出错误，让调用者决定如何处理
    }
  };
}

export default {
  createErrorHandler,
  defaultErrorHandler,
  voiceErrorHandler,
  apiErrorHandler,
  withErrorHandling,
  ERROR_TYPES,
  ERROR_LEVELS
};