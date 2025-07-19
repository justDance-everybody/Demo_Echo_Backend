import { useState, useCallback, useEffect, useRef } from 'react';
import { checkMicrophonePermission } from '../utils/microphoneUtils';
import voiceStateManager from '../utils/VoiceStateManager';

/**
 * 语音识别钩子函数
 * 封装浏览器的Web Speech API
 * @returns {Object} 语音识别状态和控制方法
 */
const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const isStoppingRef = useRef(false); // 新增一个ref来跟踪停止状态
  const currentRequestIdRef = useRef(null);

  // 初始化语音识别
  useEffect(() => {
    // 检测浏览器支持情况
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // 配置语音识别参数
      recognition.continuous = false; // 识别到停顿后自动停止
      recognition.lang = 'zh-CN'; // 设置识别语言为中文
      recognition.interimResults = false; // 只返回最终结果
      recognition.maxAlternatives = 1; // 只返回最可能的识别结果
      
      // 保存到 ref 中，避免重复创建
      recognitionRef.current = recognition;
      
      // 清理函数
      return () => {
        if (recognitionRef.current) {
          try {
            // 尝试停止正在进行的语音识别
            if (isListening) {
              recognitionRef.current.stop();
            }
          } catch (e) {
            console.warn('Error stopping recognition on cleanup:', e);
          }
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser');
      setError('您的浏览器不支持语音识别功能');
    }
  }, [isListening]);



  // 安全地停止语音识别
  const safeStopRecognition = useCallback(() => {
    return new Promise(resolve => {
      if (!recognitionRef.current) {
        console.log("[useVoice] 语音识别未初始化，无需停止");
        setIsListening(false);
        isStoppingRef.current = false;
        resolve();
        return;
      }
      
      // 如果已经在停止过程中，等待完成
      if (isStoppingRef.current) {
        console.log("[useVoice] 已在停止过程中，等待完成");
        const checkInterval = setInterval(() => {
          if (!isStoppingRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        // 最多等待2秒
        setTimeout(() => {
          clearInterval(checkInterval);
          isStoppingRef.current = false;
          resolve();
        }, 2000);
        return;
      }
      
      // 如果没有在监听，直接返回
      if (!isListening) {
        console.log("[useVoice] 语音识别未在监听状态，无需停止");
        resolve();
        return;
      }
      
      // 标记为正在停止中
      isStoppingRef.current = true;
      
      // 设置超时保护，防止永远等待
      const stopTimeout = setTimeout(() => {
        console.warn("[useVoice] 停止语音识别超时，强制完成");
        isStoppingRef.current = false;
        setIsListening(false);
        resolve();
      }, 3000);
      
      // 设置一个函数，在onend事件后解析promise
      const originalOnEnd = recognitionRef.current.onend;
      recognitionRef.current.onend = (event) => {
        clearTimeout(stopTimeout);
        // 调用原始onend处理函数
        if (originalOnEnd && typeof originalOnEnd === 'function') {
          try {
            originalOnEnd(event);
          } catch (e) {
            console.warn("[useVoice] 调用原始onend处理函数出错:", e);
          }
        }
        
        // 标记停止完成
        isStoppingRef.current = false;
        console.log('[useVoice] 语音识别已完全停止');
        setIsListening(false);
        
        // 释放语音状态管理器中的STT状态
        if (currentRequestIdRef.current) {
          voiceStateManager.releaseSTT(currentRequestIdRef.current);
          currentRequestIdRef.current = null;
        }
        
        resolve();
      };
      
      try {
        console.log("[useVoice] 安全停止语音识别...");
        recognitionRef.current.stop();
      } catch (e) {
        console.log("[useVoice] 停止语音识别出错 (可能已经停止):", e);
        clearTimeout(stopTimeout);
        isStoppingRef.current = false;
        setIsListening(false);
        resolve();
      }
    });
  }, [isListening]);

  // 开始监听
  const startListening = useCallback(async () => {
    console.log("[useVoice] Attempting to start listening...");
    
    // 防止重复启动 - 更严格的检查
    if (isListening || isStoppingRef.current) {
      console.log(`[useVoice] 语音识别状态冲突: isListening=${isListening}, isStopping=${isStoppingRef.current}`);
      return;
    }
    
    // 检查是否已有活跃的请求
    if (currentRequestIdRef.current) {
      console.log('[useVoice] 已有活跃的STT请求，跳过启动');
      return;
    }
    
    setError(null);
    setTranscript('');
    
    if (!recognitionRef.current) {
      console.error("[useVoice] 语音识别未初始化或不受支持");
      setError('语音识别未初始化或不受支持');
      return;
    }
    
    // 先检查麦克风权限
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      console.error("[useVoice] 无法获取麦克风权限");
      setError('无法获取麦克风权限，请检查浏览器设置');
      return;
    }
    
    try {
       // 请求STT状态
       const requestId = await voiceStateManager.requestSTTStart();
       currentRequestIdRef.current = requestId;
      // 重置事件处理程序
      // 开始识别时触发
      recognitionRef.current.onstart = () => {
        console.log(`[useVoice] Voice recognition started with ID: ${requestId}`);
        retryCountRef.current = 0; // 成功开始后重置重试计数
        setIsListening(true);
      };
      
      // 结束识别时触发
      recognitionRef.current.onend = () => {
        console.log(`[useVoice] Voice recognition ended for ${requestId}`);
        isStoppingRef.current = false;
        setIsListening(false);
        
        // 释放状态
        if (currentRequestIdRef.current === requestId) {
          voiceStateManager.releaseSTT(requestId);
          currentRequestIdRef.current = null;
        }
      };

      // 收到结果时触发
      recognitionRef.current.onresult = (event) => {
        if (event.results.length > 0) {
          const result = event.results[0][0].transcript;
          console.log('[useVoice] Voice recognition result:', result);
          setTranscript(result);
        } else {
          console.warn('[useVoice] 接收到空结果');
        }
      };
      
      // 发生错误时触发
      recognitionRef.current.onerror = (event) => {
        console.error(`[useVoice] Voice recognition error for ${requestId}:`, event.error);
        
        let errorMessage = '语音识别发生错误';
        let shouldRetry = false;
        
        // 根据错误类型提供更具体的信息
        switch (event.error) {
          case 'no-speech':
            errorMessage = '未检测到语音输入';
            shouldRetry = true; // 可以重试此类错误
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'network':
            errorMessage = '网络错误，请检查您的连接';
            shouldRetry = true; // 可以重试网络错误
            break;
          case 'aborted':
            // 通常是由用户或程序主动中断，不需要显示错误
            console.log('[useVoice] 语音识别被中止');
            // 释放状态
            if (currentRequestIdRef.current === requestId) {
              voiceStateManager.releaseSTT(requestId);
              currentRequestIdRef.current = null;
            }
            return;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
            shouldRetry = true; // 尝试重试其他错误
        }
        
        setError(errorMessage);
        setIsListening(false);
        
        // 释放状态
        if (currentRequestIdRef.current === requestId) {
          voiceStateManager.releaseSTT(requestId);
          currentRequestIdRef.current = null;
        }
        
        // 自动重试逻辑
        if (shouldRetry && retryCountRef.current < maxRetries) {
          console.log(`[useVoice] 自动重试语音识别 (${retryCountRef.current + 1}/${maxRetries})...`);
          retryCountRef.current += 1;
          
          // 短暂延迟后重试
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('[useVoice] 重试语音识别失败:', e);
            }
          }, 1000);
        } else if (retryCountRef.current >= maxRetries) {
          console.error('[useVoice] 达到最大重试次数，放弃重试');
          setError('语音识别失败，请检查麦克风并重试');
        }
      };

      // 启动语音识别前等待一段时间确保一切就绪
      console.log(`[useVoice] 准备启动语音识别，请求ID: ${requestId}`);
      
      // 添加启动保护，防止在已经启动的情况下重复启动
      const startTimeout = setTimeout(() => {
        // 再次检查状态，防止在延迟期间状态发生变化
        if (isListening || isStoppingRef.current || currentRequestIdRef.current !== requestId) {
          console.log("[useVoice] 启动前检查：状态已变化，取消启动");
          // 释放STT状态
          if (currentRequestIdRef.current === requestId) {
            voiceStateManager.releaseSTT(requestId);
            currentRequestIdRef.current = null;
          }
          return;
        }
        
        try {
          console.log("[useVoice] 调用 recognition.start()...");
          recognitionRef.current.start();
        } catch (error) {
          console.error('[useVoice] 启动语音识别失败:', error);
          
          // 释放STT状态
          if (currentRequestIdRef.current === requestId) {
            voiceStateManager.releaseSTT(requestId);
            currentRequestIdRef.current = null;
          }
          
          // 检查是否是因为已经启动而失败
          if (error.message && error.message.includes('already started')) {
            console.log("[useVoice] 语音识别已经启动，设置状态为监听中");
            setIsListening(true);
          } else {
            setError('启动语音识别失败: ' + error.message);
            setIsListening(false);
          }
        }
      }, 500); // 增加延迟时间
      
      // 返回清理函数
      return () => {
        clearTimeout(startTimeout);
      };
      
    } catch (error) {
      console.error('[useVoice] 请求STT状态失败:', error);
      // 只记录非TTS冲突和超时错误
      if (!error.message.includes('TTS is currently active') && 
          !error.message.includes('STT request timeout')) {
        setError(error.message);
      } else {
        console.log('[useVoice] TTS冲突或超时，不设置错误状态');
      }
      setIsListening(false);
    }
  }, [checkMicrophonePermission, safeStopRecognition, isListening]);

  // 停止监听
  const stopListening = useCallback(async () => {
    console.log("[useVoice] Attempting to stop listening...");
    retryCountRef.current = 0; // 重置重试计数
    
    await safeStopRecognition();
  }, [safeStopRecognition]);

  // 重置状态
  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    retryCountRef.current = 0;
    stopListening();
  }, [stopListening]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset
  };
};

export default useVoice;