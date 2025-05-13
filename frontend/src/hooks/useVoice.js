import { useState, useCallback, useEffect, useRef } from 'react';

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

  // 检查麦克风权限
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 成功获取麦克风权限
      console.log('[useVoice] 成功获取麦克风权限');
      // 释放媒体流
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('[useVoice] 获取麦克风权限失败:', err);
      setError(`麦克风权限错误: ${err.message}`);
      return false;
    }
  }, []);

  // 安全地停止语音识别
  const safeStopRecognition = useCallback(() => {
    return new Promise(resolve => {
      if (!recognitionRef.current || !isListening) {
        // 如果没有初始化或已经停止，直接返回
        console.log("[useVoice] 没有需要停止的语音识别会话");
        resolve();
        return;
      }
      
      // 标记为正在停止中
      isStoppingRef.current = true;
      
      // 设置一个函数，在onend事件后解析promise
      const originalOnEnd = recognitionRef.current.onend;
      recognitionRef.current.onend = (event) => {
        // 调用原始onend处理函数
        if (originalOnEnd) originalOnEnd(event);
        
        // 标记停止完成
        isStoppingRef.current = false;
        console.log('[useVoice] 语音识别已完全停止');
        setIsListening(false);
        resolve();
      };
      
      try {
        console.log("[useVoice] 安全停止语音识别...");
        recognitionRef.current.stop();
      } catch (e) {
        console.log("[useVoice] 停止语音识别出错 (可能已经停止):", e);
        isStoppingRef.current = false;
        setIsListening(false);
        resolve();
      }
    });
  }, [isListening]);

  // 开始监听
  const startListening = useCallback(async () => {
    console.log("[useVoice] Attempting to start listening...");
    
    // 如果已经在监听，先停止再重新开始
    if (isListening || isStoppingRef.current) {
      console.log("[useVoice] 已经在监听或正在停止中，等待停止完成后再启动");
      await safeStopRecognition();
      // 短暂延迟确保完全停止
      await new Promise(resolve => setTimeout(resolve, 300));
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
      // 重置事件处理程序
      // 开始识别时触发
      recognitionRef.current.onstart = () => {
        console.log('[useVoice] Voice recognition started');
        retryCountRef.current = 0; // 成功开始后重置重试计数
        setIsListening(true);
      };
      
      // 结束识别时触发
      recognitionRef.current.onend = () => {
        console.log('[useVoice] Voice recognition ended');
        isStoppingRef.current = false;
        setIsListening(false);
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
        console.error('[useVoice] Voice recognition error:', event.error);
        
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
            return;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
            shouldRetry = true; // 尝试重试其他错误
        }
        
        setError(errorMessage);
        setIsListening(false);
        
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
      console.log("[useVoice] 准备启动语音识别...");
      setTimeout(() => {
        try {
          console.log("[useVoice] 调用 recognition.start()...");
          recognitionRef.current.start();
        } catch (error) {
          console.error('[useVoice] 启动语音识别失败:', error);
          setError('启动语音识别失败: ' + error.message);
          setIsListening(false);
        }
      }, 300);
      
    } catch (error) {
      console.error('[useVoice] Error setting up speech recognition:', error);
      setError('设置语音识别失败');
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