import { useState, useRef, useCallback } from 'react';
import useTTS from './useTTS';
import useVoice from './useVoice';

// 语音状态枚举
export const VOICE_STATES = {
  IDLE: 'IDLE',
  STT_ACTIVE: 'STT_ACTIVE',
  TTS_ACTIVE: 'TTS_ACTIVE',
  BOTH_ACTIVE: 'BOTH_ACTIVE',
  ERROR: 'ERROR'
};

// 语音事件类型
export const VOICE_EVENTS = {
  STT_START: 'STT_START',
  STT_STOP: 'STT_STOP',
  TTS_START: 'TTS_START',
  TTS_STOP: 'TTS_STOP',
  ERROR: 'ERROR',
  FORCE_STOP: 'FORCE_STOP'
};

/**
 * 语音协调器Hook
 * 管理STT和TTS的状态，防止冲突
 */
export function useVoiceCoordinator() {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // 获取语音相关hooks
  const { speak, cancel: cancelTTS, isSpeaking } = useTTS();
  const { startListening, stopListening, isListening, reset: resetVoice, transcript } = useVoice();
  
  // 状态管理引用
  const stateRef = useRef(VOICE_STATES.IDLE);
  const errorCallbackRef = useRef(null);
  
  // 更新状态
  const updateState = useCallback((newState) => {
    stateRef.current = newState;
    setVoiceState(newState);
  }, []);
  
  // 错误处理
  const handleError = useCallback((error, source) => {
    console.error(`Voice coordinator error from ${source}:`, error);
    setErrorMessage(`${source}: ${error.message || error}`);
    updateState(VOICE_STATES.ERROR);
    
    if (errorCallbackRef.current) {
      errorCallbackRef.current(error, source);
    }
  }, [updateState]);
  
  // 状态转换逻辑
  const transitionState = useCallback((event, data = {}) => {
    const currentState = stateRef.current;
    
    switch (event) {
      case VOICE_EVENTS.STT_START:
        if (currentState === VOICE_STATES.IDLE) {
          updateState(VOICE_STATES.STT_ACTIVE);
        } else if (currentState === VOICE_STATES.TTS_ACTIVE) {
          updateState(VOICE_STATES.BOTH_ACTIVE);
        }
        break;
        
      case VOICE_EVENTS.STT_STOP:
        if (currentState === VOICE_STATES.STT_ACTIVE) {
          updateState(VOICE_STATES.IDLE);
        } else if (currentState === VOICE_STATES.BOTH_ACTIVE) {
          updateState(VOICE_STATES.TTS_ACTIVE);
        }
        break;
        
      case VOICE_EVENTS.TTS_START:
        if (currentState === VOICE_STATES.IDLE) {
          updateState(VOICE_STATES.TTS_ACTIVE);
        } else if (currentState === VOICE_STATES.STT_ACTIVE) {
          updateState(VOICE_STATES.BOTH_ACTIVE);
        }
        break;
        
      case VOICE_EVENTS.TTS_STOP:
        if (currentState === VOICE_STATES.TTS_ACTIVE) {
          updateState(VOICE_STATES.IDLE);
        } else if (currentState === VOICE_STATES.BOTH_ACTIVE) {
          updateState(VOICE_STATES.STT_ACTIVE);
        }
        break;
        
      case VOICE_EVENTS.ERROR:
        handleError(data.error, data.source);
        break;
        
      case VOICE_EVENTS.FORCE_STOP:
        updateState(VOICE_STATES.IDLE);
        setErrorMessage(null);
        break;
        
      default:
        console.warn(`Unknown voice event: ${event}`);
    }
  }, [updateState, handleError]);
  
  // 协调的语音控制方法
  const coordinatedStartListening = useCallback(() => {
    try {
      // 如果TTS正在播放，先停止
      if (isSpeaking) {
        cancelTTS();
        // 等待TTS完全停止后再启动STT，增加延迟时间
        setTimeout(() => {
          // 再次检查TTS状态，确保已完全停止
          if (!isSpeaking && voiceState === VOICE_STATES.IDLE) {
            transitionState(VOICE_EVENTS.STT_START);
            startListening();
          } else {
            // 如果TTS仍在播放，再等待一段时间
            setTimeout(() => {
              transitionState(VOICE_EVENTS.STT_START);
              startListening();
            }, 200);
          }
        }, 300);
      } else {
        transitionState(VOICE_EVENTS.STT_START);
        startListening();
      }
    } catch (error) {
      transitionState(VOICE_EVENTS.ERROR, { error, source: 'STT' });
    }
  }, [isSpeaking, cancelTTS, startListening, transitionState, voiceState]);
  
  const coordinatedStopListening = useCallback(() => {
    try {
      transitionState(VOICE_EVENTS.STT_STOP);
      stopListening();
    } catch (error) {
      transitionState(VOICE_EVENTS.ERROR, { error, source: 'STT' });
    }
  }, [stopListening, transitionState]);
  
  const coordinatedSpeak = useCallback((text, onComplete) => {
    try {
      // 如果STT正在运行，先停止
      if (isListening) {
        stopListening();
      }
      
      transitionState(VOICE_EVENTS.TTS_START);
      
      speak(text, () => {
        transitionState(VOICE_EVENTS.TTS_STOP);
        if (onComplete) {
          onComplete();
        }
      });
    } catch (error) {
      transitionState(VOICE_EVENTS.ERROR, { error, source: 'TTS' });
    }
  }, [isListening, stopListening, speak, transitionState]);
  
  const coordinatedCancelTTS = useCallback(() => {
    try {
      transitionState(VOICE_EVENTS.TTS_STOP);
      cancelTTS();
    } catch (error) {
      transitionState(VOICE_EVENTS.ERROR, { error, source: 'TTS' });
    }
  }, [cancelTTS, transitionState]);
  
  // 强制停止所有语音活动
  const forceStopAll = useCallback(() => {
    try {
      if (isSpeaking) {
        cancelTTS();
      }
      if (isListening) {
        stopListening();
      }
      resetVoice();
      transitionState(VOICE_EVENTS.FORCE_STOP);
    } catch (error) {
      console.error('Error during force stop:', error);
      updateState(VOICE_STATES.IDLE);
    }
  }, [isSpeaking, isListening, cancelTTS, stopListening, resetVoice, transitionState, updateState]);
  
  // 状态查询方法
  const isAnyVoiceActive = useCallback(() => {
    return voiceState !== VOICE_STATES.IDLE && voiceState !== VOICE_STATES.ERROR;
  }, [voiceState]);
  
  const isSTTActive = useCallback(() => {
    return voiceState === VOICE_STATES.STT_ACTIVE || voiceState === VOICE_STATES.BOTH_ACTIVE;
  }, [voiceState]);
  
  const isTTSActive = useCallback(() => {
    return voiceState === VOICE_STATES.TTS_ACTIVE || voiceState === VOICE_STATES.BOTH_ACTIVE;
  }, [voiceState]);
  
  // 设置错误回调
  const setErrorCallback = useCallback((callback) => {
    errorCallbackRef.current = callback;
  }, []);
  
  return {
    // 状态
    voiceState,
    errorMessage,
    isAnyVoiceActive: isAnyVoiceActive(),
    isSTTActive: isSTTActive(),
    isTTSActive: isTTSActive(),
    lastTranscript: transcript, // 暴露transcript给外部使用
    
    // 协调的控制方法
    startListening: coordinatedStartListening,
    stopListening: coordinatedStopListening,
    speak: coordinatedSpeak,
    cancelTTS: coordinatedCancelTTS,
    forceStopAll,
    
    // 工具方法
    setErrorCallback,
    
    // 原始hooks的引用（用于特殊情况）
    rawTTS: { speak, cancel: cancelTTS, isSpeaking },
    rawSTT: { startListening, stopListening, isListening, reset: resetVoice, transcript }
  };
}

export default useVoiceCoordinator;