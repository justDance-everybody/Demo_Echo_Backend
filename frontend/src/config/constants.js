// 应用常量定义文件

// 交互状态常量
export const INTERACTION_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening', 
  THINKING: 'thinking',
  CONFIRMING: 'confirming',
  EXECUTING: 'executing',
  SPEAKING: 'speaking',
  ERROR: 'error'
};

// 语音状态常量
export const VOICE_STATES = {
  IDLE: 'IDLE',
  STT_ACTIVE: 'STT_ACTIVE',
  TTS_ACTIVE: 'TTS_ACTIVE', 
  BOTH_ACTIVE: 'BOTH_ACTIVE',
  ERROR: 'ERROR'
};

// 语音事件常量
export const VOICE_EVENTS = {
  STT_START: 'STT_START',
  STT_STOP: 'STT_STOP',
  TTS_START: 'TTS_START',
  TTS_STOP: 'TTS_STOP',
  ERROR: 'ERROR',
  FORCE_STOP: 'FORCE_STOP'
};

// 意图识别常量
export const INTENT_TYPES = {
  CONFIRM: 'CONFIRM',
  CANCEL: 'CANCEL', 
  RETRY: 'RETRY',
  UNKNOWN: 'UNKNOWN'
};

// 确认关键词
export const CONFIRM_KEYWORDS = {
  CONFIRM: ['确认', '好的', '是的', '执行', '对', '行', '可以', '同意'],
  CANCEL: ['取消', '不要', '算了', '不', '停止', '不行', '拒绝'],
  RETRY: ['重试', '再试', '重新', '再来', '重做']
};

// API端点常量
export const API_ENDPOINTS = {
  INTERPRET: '/api/interpret',
  EXECUTE: '/api/execute',
  AUTH: '/api/auth',
  TOOLS: '/api/tools'
};

// 错误类型常量
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VOICE: 'VOICE_ERROR',
  TOOL: 'TOOL_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// 语音识别错误类型
export const VOICE_ERROR_TYPES = {
  NO_SPEECH: 'no-speech',
  AUDIO_CAPTURE: 'audio-capture',
  NOT_ALLOWED: 'not-allowed',
  NETWORK: 'network',
  SERVICE_NOT_ALLOWED: 'service-not-allowed',
  BAD_GRAMMAR: 'bad-grammar',
  LANGUAGE_NOT_SUPPORTED: 'language-not-supported'
};

// 无害的语音错误（不需要向用户报告）
export const HARMLESS_VOICE_ERRORS = [
  VOICE_ERROR_TYPES.NO_SPEECH,
  VOICE_ERROR_TYPES.AUDIO_CAPTURE,
  VOICE_ERROR_TYPES.NOT_ALLOWED
];

// 主题常量
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// 组件尺寸常量
export const COMPONENT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium', 
  LARGE: 'large'
};

// 按钮变体常量
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  GHOST: 'ghost',
  LINK: 'link'
};

// 消息状态常量
export const MESSAGE_STATUS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// 本地存储键名常量
export const STORAGE_KEYS = {
  THEME: 'app_theme',
  USER_PREFERENCES: 'user_preferences',
  SESSION_DATA: 'session_data',
  VOICE_SETTINGS: 'voice_settings'
};

// 时间常量（毫秒）
export const TIMEOUTS = {
  VOICE_CONFIRM: 15000,     // 语音确认超时
  TTS_TO_STT_DELAY: 800,    // TTS到STT的延迟
  ERROR_DISPLAY: 5000,      // 错误显示时间
  AUTO_RESET: 30000,        // 自动重置时间
  VOICE_RETRY_DELAY: 2000,  // 语音重试延迟
  DEBOUNCE: 300,            // 防抖延迟
  ANIMATION: 300            // 动画时长
};

// 重试配置常量
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_FACTOR: 2,
  MAX_DELAY: 10000
};

// 语音配置常量
export const VOICE_CONFIG = {
  DEFAULT_LANG: 'zh-CN',
  DEFAULT_RATE: 1,
  DEFAULT_PITCH: 1,
  DEFAULT_VOLUME: 1,
  RECOGNITION_TIMEOUT: 10000,
  SILENCE_TIMEOUT: 3000
};

// 验证规则常量
export const VALIDATION_RULES = {
  MIN_TRANSCRIPT_LENGTH: 1,
  MAX_TRANSCRIPT_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128
};

// 功能开关常量
export const FEATURE_FLAGS = {
  VOICE_CONFIRMATION: true,
  AUTO_RETRY: true,
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  ANALYTICS: false,
  EXPERIMENTAL_FEATURES: false
};

// 导出所有常量的集合
export const CONSTANTS = {
  INTERACTION_STATES,
  VOICE_STATES,
  VOICE_EVENTS,
  INTENT_TYPES,
  CONFIRM_KEYWORDS,
  API_ENDPOINTS,
  ERROR_TYPES,
  VOICE_ERROR_TYPES,
  HARMLESS_VOICE_ERRORS,
  THEME_MODES,
  COMPONENT_SIZES,
  BUTTON_VARIANTS,
  MESSAGE_STATUS,
  STORAGE_KEYS,
  TIMEOUTS,
  RETRY_CONFIG,
  VOICE_CONFIG,
  VALIDATION_RULES,
  FEATURE_FLAGS
};

export default CONSTANTS;