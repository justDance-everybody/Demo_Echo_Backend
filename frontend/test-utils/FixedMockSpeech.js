// FixedMockSpeech.js - 修复版语音API模拟工具
import Logger from './Logger';
import MockSpeech from './MockSpeech';

/**
 * 修复版的MockSpeech安装器
 * 通过monkey patch方式处理window.speechSynthesis只有getter的问题
 */
class FixedMockSpeech {
  constructor() {
    this.original = MockSpeech;
    this.originalImplementation = null;
    this.installed = false;
  }

  /**
   * 安装语音API模拟
   * 使用更安全的方式修改window对象
   */
  install() {
    if (typeof window === 'undefined') {
      console.warn('找不到window对象，无法安装模拟语音API');
      return false;
    }

    if (this.installed) {
      console.warn('模拟语音API已安装');
      return true;
    }

    // 保存原始实现
    this.originalImplementation = {
      SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
      webkitSpeechRecognition: window.webkitSpeechRecognition,
      SpeechGrammarList: window.SpeechGrammarList || window.webkitSpeechGrammarList,
      webkitSpeechGrammarList: window.webkitSpeechGrammarList,
      // 不保存speechSynthesis，因为它只是getter
      SpeechSynthesisUtterance: window.SpeechSynthesisUtterance
    };

    // 安装SpeechRecognition和其他构造函数
    window.SpeechRecognition = this.original.SpeechRecognition;
    window.webkitSpeechRecognition = this.original.SpeechRecognition;
    window.SpeechGrammarList = this.original.SpeechGrammarList;
    window.webkitSpeechGrammarList = this.original.SpeechGrammarList;
    window.SpeechSynthesisUtterance = this.original.SpeechSynthesisUtterance;

    // 使用monkey patch处理speechSynthesis
    this._patchSpeechSynthesis();

    // 为方便调用，添加到window对象
    window.fixedMockSpeech = this;
    window.mockSpeech = this.original;

    this.installed = true;
    Logger.info('FixedMockSpeech', '模拟语音API已安装（修复版）');

    return true;
  }

  /**
   * 卸载语音API模拟
   */
  uninstall() {
    if (!this.installed || typeof window === 'undefined' || !this.originalImplementation) {
      return false;
    }

    // 恢复原始实现
    window.SpeechRecognition = this.originalImplementation.SpeechRecognition;
    window.webkitSpeechRecognition = this.originalImplementation.webkitSpeechRecognition;
    window.SpeechGrammarList = this.originalImplementation.SpeechGrammarList;
    window.webkitSpeechGrammarList = this.originalImplementation.webkitSpeechGrammarList;
    window.SpeechSynthesisUtterance = this.originalImplementation.SpeechSynthesisUtterance;

    // 移除speechSynthesis的monkey patch
    this._unpatchSpeechSynthesis();

    // 删除mock实例
    delete window.fixedMockSpeech;
    delete window.mockSpeech;

    this.installed = false;
    Logger.info('FixedMockSpeech', '模拟语音API已卸载（修复版）');

    return true;
  }

  /**
   * 通过monkey patch方式处理speechSynthesis
   * 拦截它的方法调用，而不是直接替换对象
   */
  _patchSpeechSynthesis() {
    if (!window.speechSynthesis) {
      Logger.warn('FixedMockSpeech', '找不到speechSynthesis对象，无法进行patch');
      return;
    }

    const mockSynthesis = this.original.synthesis;

    // 保存原始方法
    this._originalSynthesisMethods = {
      speak: window.speechSynthesis.speak,
      cancel: window.speechSynthesis.cancel,
      pause: window.speechSynthesis.pause,
      resume: window.speechSynthesis.resume,
      getVoices: window.speechSynthesis.getVoices
    };

    // 替换方法
    window.speechSynthesis.speak = (utterance) => {
      Logger.info('FixedMockSpeech', 'Monkey patched speechSynthesis.speak()');
      return mockSynthesis.speak(utterance);
    };

    window.speechSynthesis.cancel = () => {
      Logger.info('FixedMockSpeech', 'Monkey patched speechSynthesis.cancel()');
      return mockSynthesis.cancel();
    };

    window.speechSynthesis.pause = () => {
      Logger.info('FixedMockSpeech', 'Monkey patched speechSynthesis.pause()');
      return mockSynthesis.pause();
    };

    window.speechSynthesis.resume = () => {
      Logger.info('FixedMockSpeech', 'Monkey patched speechSynthesis.resume()');
      return mockSynthesis.resume();
    };

    window.speechSynthesis.getVoices = () => {
      Logger.info('FixedMockSpeech', 'Monkey patched speechSynthesis.getVoices()');
      return mockSynthesis.getVoices();
    };

    // 替换属性
    this._defineSpeechSynthesisProperty('pending', mockSynthesis);
    this._defineSpeechSynthesisProperty('speaking', mockSynthesis);
    this._defineSpeechSynthesisProperty('paused', mockSynthesis);

    // 模拟onvoiceschanged事件
    if (typeof window.speechSynthesis.onvoiceschanged === 'function') {
      const originalHandler = window.speechSynthesis.onvoiceschanged;
      Object.defineProperty(window.speechSynthesis, 'onvoiceschanged', {
        get: () => originalHandler,
        set: (handler) => {
          Logger.info('FixedMockSpeech', 'Set onvoiceschanged handler');
          mockSynthesis.onvoiceschanged = handler;
          originalHandler = handler;
        },
        configurable: true
      });
    }

    Logger.info('FixedMockSpeech', 'speechSynthesis已通过monkey patch方式替换');
  }

  /**
   * 定义speechSynthesis对象的属性
   */
  _defineSpeechSynthesisProperty(propertyName, mockSynthesis) {
    // 保存原始getter
    let originalGetter;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window.speechSynthesis, propertyName);
      if (descriptor) {
        originalGetter = descriptor.get;
      }
    } catch (e) {
      Logger.warn('FixedMockSpeech', `获取${propertyName}属性失败`, e);
    }

    // 定义新属性
    try {
      Object.defineProperty(window.speechSynthesis, propertyName, {
        get: () => {
          Logger.debug('FixedMockSpeech', `获取speechSynthesis.${propertyName}属性`);
          return mockSynthesis[propertyName];
        },
        configurable: true
      });
    } catch (e) {
      Logger.error('FixedMockSpeech', `无法替换${propertyName}属性`, e);
    }
  }

  /**
   * 移除speechSynthesis的monkey patch
   */
  _unpatchSpeechSynthesis() {
    if (!window.speechSynthesis || !this._originalSynthesisMethods) {
      return;
    }

    // 恢复原始方法
    Object.entries(this._originalSynthesisMethods).forEach(([methodName, originalMethod]) => {
      if (originalMethod) {
        window.speechSynthesis[methodName] = originalMethod;
      }
    });

    // 重置属性描述符
    // (注意：由于无法完全恢复原始getter，这里只能尽力而为)
    Logger.info('FixedMockSpeech', 'speechSynthesis的monkey patch已移除');
  }

  /**
   * 代理到原始MockSpeech的方法
   */
  speak(text, confidence = 0.9) {
    return this.original.speak(text, confidence);
  }

  speakConfirmation(confidence = 0.95) {
    return this.original.speakConfirmation(confidence);
  }

  speakRejection(confidence = 0.95) {
    return this.original.speakRejection(confidence);
  }

  get recognition() {
    return this.original.recognition;
  }

  get synthesis() {
    return this.original.synthesis;
  }
}

export default new FixedMockSpeech(); 