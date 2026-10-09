/**
 * 麦克风权限检查和管理工具
 * 提供更友好的权限请求和错误提示
 */

// 权限状态常量
export const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt',
  UNKNOWN: 'unknown'
};

// 错误类型常量
export const ERROR_TYPES = {
  NO_DEVICE: 'no_device',
  PERMISSION_DENIED: 'permission_denied',
  DEVICE_BUSY: 'device_busy',
  BROWSER_NOT_SUPPORTED: 'browser_not_supported',
  UNKNOWN: 'unknown'
};

/**
 * 检查浏览器是否支持麦克风权限
 */
export const isMicrophoneSupported = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * 检查浏览器是否支持语音识别
 */
export const isSpeechRecognitionSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

/**
 * 获取麦克风权限状态
 */
export const getMicrophonePermissionStatus = async () => {
  if (!isMicrophoneSupported()) {
    return PERMISSION_STATUS.UNKNOWN;
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    return permissionStatus.state;
  } catch (error) {
    console.warn('无法查询麦克风权限状态:', error);
    return PERMISSION_STATUS.UNKNOWN;
  }
};

/**
 * 检查可用的音频设备
 */
export const getAvailableAudioDevices = async () => {
  if (!isMicrophoneSupported()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    return audioInputs;
  } catch (error) {
    console.warn('无法枚举音频设备:', error);
    return [];
  }
};

/**
 * 请求麦克风权限
 */
export const requestMicrophonePermission = async () => {
  if (!isMicrophoneSupported()) {
    return {
      success: false,
      errorType: ERROR_TYPES.BROWSER_NOT_SUPPORTED,
      message: '您的浏览器不支持麦克风功能'
    };
  }

  try {
    // 检查是否有可用的音频设备
    const audioDevices = await getAvailableAudioDevices();
    if (audioDevices.length === 0) {
      return {
        success: false,
        errorType: ERROR_TYPES.NO_DEVICE,
        message: '未检测到麦克风设备，请连接麦克风后重试'
      };
    }

    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // 成功获取权限，释放流
    stream.getTracks().forEach(track => track.stop());
    
    return {
      success: true,
      message: '麦克风权限获取成功'
    };

  } catch (error) {
    console.error('麦克风权限请求失败:', error);
    
    // 根据错误类型返回不同的错误信息
    let errorType = ERROR_TYPES.UNKNOWN;
    let message = '未知错误';

    switch (error.name) {
      case 'NotFoundError':
        errorType = ERROR_TYPES.NO_DEVICE;
        message = '未检测到麦克风设备。请检查：\n1. 是否连接了麦克风\n2. 麦克风是否正常工作\n3. 是否被其他应用占用';
        break;
      case 'NotAllowedError':
        errorType = ERROR_TYPES.PERMISSION_DENIED;
        message = '麦克风权限被拒绝。请点击地址栏的🔒图标，允许麦克风权限';
        break;
      case 'NotReadableError':
        errorType = ERROR_TYPES.DEVICE_BUSY;
        message = '麦克风设备被占用。请关闭其他使用麦克风的应用';
        break;
      case 'OverconstrainedError':
        errorType = ERROR_TYPES.UNKNOWN;
        message = '麦克风设备不满足要求，请尝试其他麦克风';
        break;
      default:
        errorType = ERROR_TYPES.UNKNOWN;
        message = `麦克风访问失败: ${error.message}`;
    }

    return {
      success: false,
      errorType,
      message,
      originalError: error
    };
  }
};

/**
 * 获取用户友好的错误提示和解决建议
 */
export const getErrorSolution = (errorType) => {
  const solutions = {
    [ERROR_TYPES.NO_DEVICE]: {
      title: '未检测到麦克风',
      steps: [
        '检查麦克风是否正确连接',
        '确认麦克风在系统设置中可用',
        '尝试重新插拔USB麦克风',
        '重启浏览器后重试'
      ]
    },
    [ERROR_TYPES.PERMISSION_DENIED]: {
      title: '麦克风权限被拒绝',
      steps: [
        '点击地址栏左侧的🔒或🛡️图标',
        '将麦克风权限设置为"允许"',
        '刷新页面后重试',
        '或者在浏览器设置中允许此网站使用麦克风'
      ]
    },
    [ERROR_TYPES.DEVICE_BUSY]: {
      title: '麦克风设备被占用',
      steps: [
        '关闭其他使用麦克风的应用（如腾讯会议、录音软件等）',
        '检查是否有其他浏览器标签页在使用麦克风',
        '重启浏览器后重试'
      ]
    },
    [ERROR_TYPES.BROWSER_NOT_SUPPORTED]: {
      title: '浏览器不支持',
      steps: [
        '请使用Chrome、Firefox、Safari或Edge等现代浏览器',
        '确保浏览器版本较新',
        '如果是移动设备，请使用浏览器而非应用内置浏览器'
      ]
    }
  };

  return solutions[errorType] || {
    title: '未知错误',
    steps: [
      '刷新页面后重试',
      '检查网络连接',
      '尝试使用其他浏览器',
      '如果问题持续，请联系技术支持'
    ]
  };
}; 