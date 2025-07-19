/**
 * 麦克风权限检查工具
 */

/**
 * 检查麦克风权限
 * @returns {Promise<boolean>} 是否有麦克风权限
 */
export const checkMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 成功获取麦克风权限
    console.log('[microphoneUtils] 成功获取麦克风权限');
    // 释放媒体流
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error('[microphoneUtils] 获取麦克风权限失败:', err);
    return false;
  }
};

/**
 * 检查浏览器是否支持语音识别
 * @returns {boolean} 是否支持语音识别
 */
export const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

/**
 * 获取语音识别构造函数
 * @returns {Function|null} 语音识别构造函数
 */
export const getSpeechRecognition = () => {
  if ('SpeechRecognition' in window) {
    return window.SpeechRecognition;
  }
  if ('webkitSpeechRecognition' in window) {
    return window.webkitSpeechRecognition;
  }
  return null;
};