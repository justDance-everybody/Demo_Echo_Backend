// 统一错误处理系统
import { INTERACTION_STATES } from '../contexts/InteractionContext';

// 错误类型枚举
export const ERROR_TYPES = {
  VOICE_RECOGNITION: 'VOICE_RECOGNITION',
  TEXT_TO_SPEECH: 'TEXT_TO_SPEECH',
  API_REQUEST: 'API_REQUEST',
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  TOOL_EXECUTION: 'TOOL_EXECUTION',
  STATE_TRANSITION: 'STATE_TRANSITION',
  UNKNOWN: 'UNKNOWN'
};

// 错误严重程度
export const ERROR_SEVERITY = {
  LOW: 'LOW',       // 可忽略的错误
  MEDIUM: 'MEDIUM', // 需要用户知晓但不影响继续使用
  HIGH: 'HIGH',     // 需要重置当前操作
  CRITICAL: 'CRITICAL' // 需要完全重启
};

// 错误恢复策略
export const RECOVERY_STRATEGIES = {
  IGNORE: 'IGNORE',           // 忽略错误
  RETRY: 'RETRY',             // 重试操作
  RESET_CURRENT: 'RESET_CURRENT', // 重置当前操作
  RESET_ALL: 'RESET_ALL',     // 重置所有状态
  USER_ACTION: 'USER_ACTION'  // 需要用户手动处理
};

// 错误配置映射
const ERROR_CONFIG = {
  [ERROR_TYPES.VOICE_RECOGNITION]: {
    'no-speech': { severity: ERROR_SEVERITY.LOW, strategy: RECOVERY_STRATEGIES.IGNORE },
    'audio-capture': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'not-allowed': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'network': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'timeout': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  },
  [ERROR_TYPES.TEXT_TO_SPEECH]: {
    'synthesis-unavailable': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'synthesis-failed': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  },
  [ERROR_TYPES.API_REQUEST]: {
    '401': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    '403': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    '404': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT },
    '500': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.RETRY },
    'timeout': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  },
  [ERROR_TYPES.NETWORK]: {
    'offline': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'connection-failed': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY }
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    'token-expired': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'invalid-credentials': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION },
    'default': { severity: ERROR_SEVERITY.HIGH, strategy: RECOVERY_STRATEGIES.USER_ACTION }
  },
  [ERROR_TYPES.TOOL_EXECUTION]: {
    'tool-not-found': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT },
    'invalid-parameters': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT },
    'execution-failed': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RETRY },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  },
  [ERROR_TYPES.STATE_TRANSITION]: {
    'invalid-transition': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT },
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  },
  [ERROR_TYPES.UNKNOWN]: {
    'default': { severity: ERROR_SEVERITY.MEDIUM, strategy: RECOVERY_STRATEGIES.RESET_CURRENT }
  }
};

// 用户友好的错误消息
const ERROR_MESSAGES = {
  [ERROR_TYPES.VOICE_RECOGNITION]: {
    'no-speech': '没有检测到语音，请重试',
    'audio-capture': '无法访问麦克风，请检查权限设置',
    'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问',
    'network': '网络连接问题，请检查网络后重试',
    'timeout': '语音识别超时，请重试',
    'default': '语音识别出现问题，请重试'
  },
  [ERROR_TYPES.TEXT_TO_SPEECH]: {
    'synthesis-unavailable': '语音合成功能不可用',
    'synthesis-failed': '语音播放失败，请重试',
    'default': '语音播放出现问题'
  },
  [ERROR_TYPES.API_REQUEST]: {
    '401': '身份验证失败，请重新登录',
    '403': '权限不足，无法执行此操作',
    '404': '请求的资源不存在',
    '500': '服务器内部错误，请稍后重试',
    'timeout': '请求超时，请重试',
    'default': 'API请求失败，请重试'
  },
  [ERROR_TYPES.NETWORK]: {
    'offline': '网络连接已断开，请检查网络连接',
    'connection-failed': '网络连接失败，请重试',
    'default': '网络错误，请检查连接'
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    'token-expired': '登录已过期，请重新登录',
    'invalid-credentials': '登录凭证无效，请重新登录',
    'default': '身份验证失败，请重新登录'
  },
  [ERROR_TYPES.TOOL_EXECUTION]: {
    'tool-not-found': '请求的工具不存在',
    'invalid-parameters': '工具参数无效',
    'execution-failed': '工具执行失败，请重试',
    'default': '工具执行出现问题'
  },
  [ERROR_TYPES.STATE_TRANSITION]: {
    'invalid-transition': '状态转换无效',
    'default': '状态管理出现问题'
  },
  [ERROR_TYPES.UNKNOWN]: {
    'default': '出现未知错误，请重试'
  }
};

// 统一错误处理器类
export class UnifiedErrorHandler {
  constructor({
    interactionActions,
    voiceCoordinator,
    onUserAction,
    enableLogging = true
  }) {
    this.interactionActions = interactionActions;
    this.voiceCoordinator = voiceCoordinator;
    this.onUserAction = onUserAction;
    this.enableLogging = enableLogging;
    this.retryCount = new Map(); // 记录重试次数
  }

  // 主要错误处理方法
  handleError(error, errorType = ERROR_TYPES.UNKNOWN, context = {}) {
    const errorKey = this._getErrorKey(error);
    const config = this._getErrorConfig(errorType, errorKey);
    const message = this._getErrorMessage(errorType, errorKey);
    
    if (this.enableLogging) {
      console.error(`[UnifiedErrorHandler] ${errorType}:${errorKey}`, {
        error,
        config,
        context
      });
    }

    // 根据严重程度和策略处理错误
    this._executeRecoveryStrategy(config, error, errorType, message, context);
  }

  // 获取错误键
  _getErrorKey(error) {
    if (typeof error === 'string') return error;
    if (error?.error) return error.error;
    if (error?.code) return error.code.toString();
    if (error?.status) return error.status.toString();
    if (error?.message) {
      // 从错误消息中提取关键词
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) return 'timeout';
      if (message.includes('network')) return 'network';
      if (message.includes('offline')) return 'offline';
      if (message.includes('unauthorized')) return '401';
      if (message.includes('forbidden')) return '403';
    }
    return 'default';
  }

  // 获取错误配置
  _getErrorConfig(errorType, errorKey) {
    const typeConfig = ERROR_CONFIG[errorType] || ERROR_CONFIG[ERROR_TYPES.UNKNOWN];
    return typeConfig[errorKey] || typeConfig['default'];
  }

  // 获取错误消息
  _getErrorMessage(errorType, errorKey) {
    const typeMessages = ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    return typeMessages[errorKey] || typeMessages['default'];
  }

  // 执行恢复策略
  _executeRecoveryStrategy(config, error, errorType, message, context) {
    const { severity, strategy } = config;
    const retryKey = `${errorType}:${this._getErrorKey(error)}`;

    switch (strategy) {
      case RECOVERY_STRATEGIES.IGNORE:
        if (this.enableLogging) {
          console.log(`[UnifiedErrorHandler] Ignoring ${severity} error: ${message}`);
        }
        break;

      case RECOVERY_STRATEGIES.RETRY:
        this._handleRetry(retryKey, error, errorType, message, context);
        break;

      case RECOVERY_STRATEGIES.RESET_CURRENT:
        this._handleResetCurrent(message);
        break;

      case RECOVERY_STRATEGIES.RESET_ALL:
        this._handleResetAll(message);
        break;

      case RECOVERY_STRATEGIES.USER_ACTION:
        this._handleUserAction(message, errorType, context);
        break;

      default:
        this._handleResetCurrent(message);
    }
  }

  // 处理重试策略
  _handleRetry(retryKey, error, errorType, message, context, maxRetries = 3) {
    const currentRetries = this.retryCount.get(retryKey) || 0;
    
    if (currentRetries < maxRetries) {
      this.retryCount.set(retryKey, currentRetries + 1);
      
      if (this.enableLogging) {
        console.log(`[UnifiedErrorHandler] Retrying ${retryKey} (${currentRetries + 1}/${maxRetries})`);
      }
      
      // 延迟重试
      setTimeout(() => {
        if (context.retryCallback && typeof context.retryCallback === 'function') {
          context.retryCallback();
        } else {
          // 默认重试逻辑：重置到IDLE状态并重新开始
          this.interactionActions.setState(INTERACTION_STATES.IDLE);
          setTimeout(() => {
            this.voiceCoordinator.startListening();
          }, 1000);
        }
      }, Math.pow(2, currentRetries) * 1000); // 指数退避
    } else {
      // 重试次数用完，转为重置当前操作
      this.retryCount.delete(retryKey);
      this._handleResetCurrent(`${message}（重试失败）`);
    }
  }

  // 处理重置当前操作
  _handleResetCurrent(message) {
    this.interactionActions.setError(message);
    this.interactionActions.setState(INTERACTION_STATES.ERROR);
    this.voiceCoordinator.forceStopAll();
    
    // 播报错误消息并重置
    this.voiceCoordinator.speak(message, () => {
      setTimeout(() => {
        this.interactionActions.setState(INTERACTION_STATES.IDLE);
        this.interactionActions.setError(null);
        this.voiceCoordinator.startListening();
      }, 1000);
    });
  }

  // 处理完全重置
  _handleResetAll(message) {
    this.voiceCoordinator.forceStopAll();
    this.interactionActions.reset();
    this.interactionActions.setError(message);
    this.retryCount.clear();
    
    // 播报错误消息
    this.voiceCoordinator.speak(message);
  }

  // 处理需要用户操作的错误
  _handleUserAction(message, errorType, context) {
    this.interactionActions.setError(message);
    this.interactionActions.setState(INTERACTION_STATES.ERROR);
    this.voiceCoordinator.forceStopAll();
    
    if (this.onUserAction && typeof this.onUserAction === 'function') {
      this.onUserAction(message, errorType, context);
    } else {
      // 默认用户操作：播报错误并等待用户手动重置
      this.voiceCoordinator.speak(message);
    }
  }

  // 清除重试计数
  clearRetryCount(errorType = null) {
    if (errorType) {
      for (const key of this.retryCount.keys()) {
        if (key.startsWith(errorType)) {
          this.retryCount.delete(key);
        }
      }
    } else {
      this.retryCount.clear();
    }
  }

  // 获取当前重试状态
  getRetryStatus() {
    return Object.fromEntries(this.retryCount);
  }
}

// 创建错误处理器的工厂函数
export function createUnifiedErrorHandler(dependencies) {
  return new UnifiedErrorHandler(dependencies);
}

export default UnifiedErrorHandler;