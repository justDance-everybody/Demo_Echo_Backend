// MockSpeech.js - 模拟Web Speech API以便自动化测试
import Logger from './Logger';

class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'zh-CN';
    this.maxAlternatives = 1;
    
    // 事件处理器
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.onspeechstart = null;
    this.onspeechend = null;
    
    this._isRecording = false;
    Logger.debug('MockSpeech', 'SpeechRecognition创建');
  }

  // 开始语音识别
  start() {
    if (this._isRecording) throw new Error('语音识别已在运行中');
    
    this._isRecording = true;
    Logger.info('MockSpeech', 'SpeechRecognition.start()');
    
    setTimeout(() => {
      if (this.onstart) this.onstart(new Event('start'));
    }, 10);
    
    setTimeout(() => {
      if (this.onspeechstart) this.onspeechstart(new Event('speechstart'));
    }, 50);
    
    return this;
  }

  // 停止语音识别
  stop() {
    if (!this._isRecording) return;
    
    this._isRecording = false;
    Logger.info('MockSpeech', 'SpeechRecognition.stop()');
    
    setTimeout(() => {
      if (this.onspeechend) this.onspeechend(new Event('speechend'));
    }, 20);
    
    setTimeout(() => {
      if (this.onend) this.onend(new Event('end'));
    }, 50);
    
    return this;
  }

  // 中止语音识别
  abort() {
    return this.stop();
  }

  // 模拟语音识别结果
  simulateResult(text, confidence = 0.9, isFinal = true) {
    if (!this._isRecording) {
      Logger.warn('MockSpeech', 'simulateResult调用时识别器未启动', { text });
      return false;
    }
    
    Logger.info('MockSpeech', 'simulateResult', { text, confidence, isFinal });
    
    // 创建模拟的SpeechRecognitionResult
    const results = [
      {
        isFinal,
        [0]: {
          transcript: text,
          confidence
        }
      }
    ];
    
    // 将结果包装为SpeechRecognitionEvent
    const resultEvent = {
      type: 'result',
      resultIndex: 0,
      results,
      interpretation: text,
      emma: null,
      returnValue: true
    };
    
    // 如果是非最终结果
    if (!isFinal && this.interimResults && this.onresult) {
      this.onresult(resultEvent);
    }
    
    // 如果是最终结果
    if (isFinal && this.onresult) {
      setTimeout(() => {
        this.onresult(resultEvent);
        
        // 模拟语音结束
        if (this.onspeechend) {
          setTimeout(() => this.onspeechend(new Event('speechend')), 100);
        }
        
        // 如果不是连续模式，模拟结束
        if (!this.continuous) {
          this._isRecording = false;
          if (this.onend) {
            setTimeout(() => this.onend(new Event('end')), 150);
          }
        }
      }, 300);
    }
    
    return true;
  }

  // 模拟识别错误
  simulateError(errorCode = 'not-allowed') {
    if (!this._isRecording) return false;
    
    Logger.warn('MockSpeech', 'simulateError', { errorCode });
    
    const errorEvent = {
      type: 'error',
      error: errorCode,
      message: `模拟错误: ${errorCode}`
    };
    
    if (this.onerror) {
      setTimeout(() => this.onerror(errorEvent), 100);
    }
    
    // 始终触发结束事件
    this._isRecording = false;
    if (this.onend) {
      setTimeout(() => this.onend(new Event('end')), 150);
    }
    
    return true;
  }

  // 模拟无语音输入
  simulateNoSpeech() {
    return this.simulateError('no-speech');
  }

  // 模拟语音无法识别
  simulateNoMatch() {
    return this.simulateError('no-match');
  }

  // 检查是否正在录音
  isRecording() {
    return this._isRecording;
  }
}

class MockSpeechSynthesis {
  constructor() {
    this.pending = false;
    this.speaking = false;
    this.paused = false;
    this._queue = [];
    this.onvoiceschanged = null;
    this._voices = [
      { name: 'Chinese Female', lang: 'zh-CN', default: true },
      { name: 'Chinese Male', lang: 'zh-CN', default: false },
      { name: 'English Female', lang: 'en-US', default: false }
    ];
    
    Logger.debug('MockSpeech', 'SpeechSynthesis创建');
  }

  // 获取可用的语音
  getVoices() {
    return this._voices;
  }

  // 朗读文本
  speak(utterance) {
    if (!utterance) return;
    
    this._queue.push(utterance);
    this.pending = this._queue.length > 0;
    
    Logger.info('MockSpeech', 'SpeechSynthesis.speak()', { 
      text: utterance.text,
      queueLength: this._queue.length
    });
    
    // 如果没有正在进行的朗读，开始朗读
    if (!this.speaking) {
      this._processQueue();
    }
  }

  // 处理队列中的朗读
  _processQueue() {
    if (this._queue.length === 0 || this.paused) return;
    
    const utterance = this._queue[0];
    this.speaking = true;
    this.pending = this._queue.length > 1;
    
    Logger.info('MockSpeech', 'SpeechSynthesis开始朗读', { text: utterance.text });
    
    // 触发开始事件
    if (utterance.onstart) {
      setTimeout(() => utterance.onstart(new Event('start')), 10);
    }
    
    // 计算朗读持续时间 (简单估算: 每个字符约100ms)
    const duration = utterance.text.length * 100;
    
    // 模拟边界事件 (简化处理)
    if (utterance.onboundary) {
      const words = utterance.text.split(/\s+/);
      let charIndex = 0;
      
      words.forEach((word, index) => {
        setTimeout(() => {
          const boundaryEvent = {
            charIndex,
            charLength: word.length,
            name: 'word',
            utterance
          };
          utterance.onboundary(boundaryEvent);
        }, (duration / words.length) * index);
        
        charIndex += word.length + 1; // +1 for the space
      });
    }
    
    // 模拟朗读结束
    setTimeout(() => {
      this._queue.shift();
      
      // 触发结束事件
      if (utterance.onend) {
        utterance.onend(new Event('end'));
      }
      
      Logger.info('MockSpeech', 'SpeechSynthesis结束朗读', { text: utterance.text });
      
      // 更新状态
      this.speaking = this._queue.length > 0 && !this.paused;
      this.pending = this._queue.length > 0;
      
      // 处理队列中的下一个朗读
      if (this._queue.length > 0 && !this.paused) {
        this._processQueue();
      }
    }, duration);
  }

  // 暂停朗读
  pause() {
    if (!this.speaking) return;
    this.paused = true;
    Logger.info('MockSpeech', 'SpeechSynthesis.pause()');
  }

  // 恢复朗读
  resume() {
    if (!this.paused) return;
    this.paused = false;
    Logger.info('MockSpeech', 'SpeechSynthesis.resume()');
    
    if (this._queue.length > 0) {
      this._processQueue();
    }
  }

  // 取消所有朗读
  cancel() {
    Logger.info('MockSpeech', 'SpeechSynthesis.cancel()', {
      queueLength: this._queue.length
    });
    
    this._queue = [];
    this.pending = false;
    this.speaking = false;
    // 保持 paused 状态不变
  }
}

class MockSpeechSynthesisUtterance {
  constructor(text = '') {
    this.text = text;
    this.lang = 'zh-CN';
    this.pitch = 1;
    this.rate = 1;
    this.volume = 1;
    this.voice = null;
    
    // 事件处理器
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onpause = null;
    this.onresume = null;
    this.onboundary = null;
    this.onmark = null;
    
    Logger.debug('MockSpeech', 'SpeechSynthesisUtterance创建', { text });
  }
}

// 模拟全局 Web Speech API
class MockSpeech {
  constructor() {
    this.recognition = new MockSpeechRecognition();
    this.synthesis = new MockSpeechSynthesis();
    this.SpeechRecognition = MockSpeechRecognition;
    this.SpeechGrammarList = class {};
    this.SpeechSynthesis = MockSpeechSynthesis;
    this.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    
    Logger.info('MockSpeech', '初始化完成');
  }

  // 安装模拟语音API到window对象
  install() {
    if (typeof window === 'undefined') {
      console.warn('找不到window对象，无法安装模拟语音API');
      return false;
    }
    
    // 保存原始实现
    this._originalImplementation = {
      SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
      webkitSpeechRecognition: window.webkitSpeechRecognition,
      SpeechGrammarList: window.SpeechGrammarList || window.webkitSpeechGrammarList,
      webkitSpeechGrammarList: window.webkitSpeechGrammarList,
      speechSynthesis: window.speechSynthesis,
      SpeechSynthesisUtterance: window.SpeechSynthesisUtterance
    };
    
    // 安装模拟实现
    window.SpeechRecognition = this.SpeechRecognition;
    window.webkitSpeechRecognition = this.SpeechRecognition;
    window.SpeechGrammarList = this.SpeechGrammarList;
    window.webkitSpeechGrammarList = this.SpeechGrammarList;
    window.speechSynthesis = this.synthesis;
    window.SpeechSynthesisUtterance = this.SpeechSynthesisUtterance;
    
    // 为方便调用，添加到window对象
    window.mockSpeech = this;
    
    Logger.info('MockSpeech', '已安装到window对象');
    return true;
  }

  // 恢复原始语音API
  uninstall() {
    if (typeof window === 'undefined' || !this._originalImplementation) return false;
    
    // 恢复原始实现
    window.SpeechRecognition = this._originalImplementation.SpeechRecognition;
    window.webkitSpeechRecognition = this._originalImplementation.webkitSpeechRecognition;
    window.SpeechGrammarList = this._originalImplementation.SpeechGrammarList;
    window.webkitSpeechGrammarList = this._originalImplementation.webkitSpeechGrammarList;
    window.speechSynthesis = this._originalImplementation.speechSynthesis;
    window.SpeechSynthesisUtterance = this._originalImplementation.SpeechSynthesisUtterance;
    
    // 删除mock实例
    delete window.mockSpeech;
    
    Logger.info('MockSpeech', '已恢复原始实现');
    return true;
  }
  
  // 模拟用户说话
  speak(text, confidence = 0.9) {
    if (!this.recognition.isRecording()) {
      Logger.warn('MockSpeech', '模拟说话失败：语音识别未启动', { text });
      return false;
    }
    
    Logger.info('MockSpeech', '模拟用户说话', { text });
    
    // 模拟中间结果
    setTimeout(() => {
      this.recognition.simulateResult(text.substring(0, Math.floor(text.length / 2)), 
                                    confidence * 0.7, false);
    }, 300);
    
    // 模拟最终结果
    setTimeout(() => {
      this.recognition.simulateResult(text, confidence, true);
    }, 800);
    
    return true;
  }
  
  // 模拟用户确认 ("是的"/"确认"/"好的")
  speakConfirmation(confidence = 0.95) {
    const confirmPhrases = ['是的', '确认', '好的', '对', '可以', '正确'];
    const phrase = confirmPhrases[Math.floor(Math.random() * confirmPhrases.length)];
    return this.speak(phrase, confidence);
  }
  
  // 模拟用户拒绝 ("不是"/"取消"/"错了")
  speakRejection(confidence = 0.95) {
    const rejectPhrases = ['不是', '取消', '错了', '不对', '不行', '不可以'];
    const phrase = rejectPhrases[Math.floor(Math.random() * rejectPhrases.length)];
    return this.speak(phrase, confidence);
  }
}

export default new MockSpeech(); 