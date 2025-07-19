/**
 * 语音状态管理器
 * 统一管理语音识别和TTS的状态，避免冲突
 */
class VoiceStateManager {
  constructor() {
    this.isSTTActive = false;
    this.isTTSActive = false;
    this.sttQueue = [];
    this.ttsQueue = [];
    this.listeners = new Set();
    this.debugMode = true;
  }

  // 添加状态监听器
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 通知所有监听器状态变化
  notifyListeners() {
    const state = {
      isSTTActive: this.isSTTActive,
      isTTSActive: this.isTTSActive,
      canStartSTT: !this.isSTTActive && !this.isTTSActive,
      canStartTTS: !this.isTTSActive
    };
    
    if (this.debugMode) {
      console.log('[VoiceStateManager] State changed:', state);
    }
    
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (e) {
        console.error('[VoiceStateManager] Listener error:', e);
      }
    });
  }

  // STT 状态管理
  requestSTTStart(requestId = null) {
    const id = requestId || `stt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.isSTTActive) {
      console.warn(`[VoiceStateManager] STT already active, queuing request ${id}`);
      return new Promise((resolve, reject) => {
        this.sttQueue.push({ id, resolve, reject });
      });
    }
    
    if (this.isTTSActive) {
      console.warn(`[VoiceStateManager] TTS is active, waiting for it to finish before starting STT ${id}`);
      return new Promise((resolve, reject) => {
        // 设置超时，避免无限等待
        const timeoutId = setTimeout(() => {
          const index = this.sttQueue.findIndex(item => item.id === id);
          if (index !== -1) {
            this.sttQueue.splice(index, 1);
            console.warn(`[VoiceStateManager] STT request ${id} timeout after 5s`);
            reject(new Error('STT request timeout: TTS took too long'));
          }
        }, 5000); // 减少到5秒超时
        
        // 将STT请求加入队列，等待TTS完成
        this.sttQueue.push({ 
          id, 
          resolve: (result) => {
            clearTimeout(timeoutId);
            resolve(result);
          }, 
          reject: (error) => {
            clearTimeout(timeoutId);
            reject(error);
          } 
        });
      });
    }
    
    this.isSTTActive = true;
    this.notifyListeners();
    
    if (this.debugMode) {
      console.log(`[VoiceStateManager] STT started: ${id}`);
    }
    
    return Promise.resolve(id);
  }

  releaseSTT(requestId = null) {
    if (!this.isSTTActive) {
      console.warn('[VoiceStateManager] STT not active, ignoring release');
      return;
    }
    
    this.isSTTActive = false;
    
    if (this.debugMode) {
      console.log(`[VoiceStateManager] STT released: ${requestId}`);
    }
    
    this.notifyListeners();
    
    // 处理队列中的下一个STT请求
    if (this.sttQueue.length > 0 && !this.isTTSActive) {
      const next = this.sttQueue.shift();
      setTimeout(() => {
        if (next && typeof next.resolve === 'function' && typeof next.reject === 'function') {
          this.requestSTTStart(next.id)
            .then(next.resolve)
            .catch(next.reject);
        }
      }, 100);
    }
  }

  // TTS 状态管理
  requestTTSStart(requestId = null) {
    const id = requestId || `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.isTTSActive) {
      console.warn(`[VoiceStateManager] TTS already active, queuing request ${id}`);
      return new Promise((resolve, reject) => {
        this.ttsQueue.push({ id, resolve, reject });
      });
    }
    
    // TTS可以中断STT
    if (this.isSTTActive) {
      console.log(`[VoiceStateManager] TTS interrupting STT for ${id}`);
      this.isSTTActive = false;
    }
    
    this.isTTSActive = true;
    this.notifyListeners();
    
    if (this.debugMode) {
      console.log(`[VoiceStateManager] TTS started: ${id}`);
    }
    
    return Promise.resolve(id);
  }

  releaseTTS(requestId = null) {
    if (!this.isTTSActive) {
      console.warn('[VoiceStateManager] TTS not active, ignoring release');
      return;
    }
    
    this.isTTSActive = false;
    
    if (this.debugMode) {
      console.log(`[VoiceStateManager] TTS released: ${requestId}`);
    }
    
    this.notifyListeners();
    
    // 处理队列中的下一个TTS请求
    if (this.ttsQueue.length > 0) {
      const next = this.ttsQueue.shift();
      setTimeout(() => {
        if (next && typeof next.resolve === 'function' && typeof next.reject === 'function') {
          this.requestTTSStart(next.id)
            .then(next.resolve)
            .catch(next.reject);
        }
      }, 100);
    } else {
      // TTS队列为空，处理等待的STT请求
      if (this.sttQueue.length > 0 && !this.isSTTActive) {
        const next = this.sttQueue.shift();
        this.isSTTActive = true;
        this.notifyListeners();
        
        if (this.debugMode) {
          console.log(`[VoiceStateManager] Processing queued STT request: ${next.id}`);
        }
        
        if (next && typeof next.resolve === 'function') {
          next.resolve(next.id);
        }
      }
    }
  }

  // 强制停止所有语音活动
  forceStopAll() {
    console.log('[VoiceStateManager] Force stopping all voice activities');
    
    this.isSTTActive = false;
    this.isTTSActive = false;
    
    // 清空队列
    this.sttQueue.forEach(item => {
      item.reject(new Error('Force stopped'));
    });
    this.ttsQueue.forEach(item => {
      item.reject(new Error('Force stopped'));
    });
    
    this.sttQueue = [];
    this.ttsQueue = [];
    
    this.notifyListeners();
  }

  // 获取当前状态
  getState() {
    return {
      isSTTActive: this.isSTTActive,
      isTTSActive: this.isTTSActive,
      canStartSTT: !this.isSTTActive && !this.isTTSActive,
      canStartTTS: !this.isTTSActive,
      sttQueueLength: this.sttQueue.length,
      ttsQueueLength: this.ttsQueue.length
    };
  }

  // 设置调试模式
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

// 创建全局单例
const voiceStateManager = new VoiceStateManager();

export default voiceStateManager;