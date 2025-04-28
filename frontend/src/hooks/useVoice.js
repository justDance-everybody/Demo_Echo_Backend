import { useState, useEffect, useRef } from 'react';

/**
 * 语音识别和语音合成的自定义Hook
 * @param {Object} options - 配置选项
 * @param {string} options.lang - 语言，默认为中文
 * @param {boolean} options.continuous - 是否持续识别
 * @param {boolean} options.interimResults - 是否返回中间结果
 * @returns {Object} 包含语音识别和合成相关的状态和方法
 */
const useVoice = (options = {}) => {
  const {
    lang = 'zh-CN',
    continuous = true,
    interimResults = true,
  } = options;

  // 状态
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 引用
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // 初始化
  useEffect(() => {
    // 初始化语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);
        if (final) {
          setFinalTranscript(prev => prev + final + ' ');
        }
        setTranscript(final || interim);
      };

      recognition.onerror = (event) => {
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError('您的浏览器不支持语音识别功能');
    }

    // 初始化语音合成
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setError('您的浏览器不支持语音合成功能');
    }

    // 清理函数
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, [continuous, interimResults, lang]);

  // 开始语音识别
  const startListening = () => {
    setFinalTranscript('');
    setInterimTranscript('');
    setTranscript('');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('语音识别启动失败:', error);
        // 如果已经在识别中，先中止再重启
        if (error.name === 'InvalidStateError') {
          recognitionRef.current.abort();
          setTimeout(() => {
            recognitionRef.current.start();
          }, 100);
        }
      }
    } else {
      setError('语音识别未初始化');
    }
  };

  // 停止语音识别
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // 语音合成
  const speak = (text, voiceOptions = {}) => {
    if (synthRef.current) {
      // 停止当前正在播放的语音
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceOptions.lang || lang;
      utterance.rate = voiceOptions.rate || 1;
      utterance.pitch = voiceOptions.pitch || 1;
      utterance.volume = voiceOptions.volume || 1;

      // 如果指定了声音，尝试使用
      if (voiceOptions.voice) {
        const voices = synthRef.current.getVoices();
        const selectedVoice = voices.find(voice => 
          voice.name === voiceOptions.voice || 
          voice.lang === voiceOptions.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('语音合成错误:', event);
        setIsSpeaking(false);
        setError('语音合成失败');
      };

      synthRef.current.speak(utterance);
    } else {
      setError('语音合成未初始化');
    }
  };

  // 停止语音合成
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // 重置所有状态
  const reset = () => {
    setFinalTranscript('');
    setInterimTranscript('');
    setTranscript('');
    setError(null);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort();
    }
    if (synthRef.current && isSpeaking) {
      synthRef.current.cancel();
    }
  };

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    reset
  };
};

export default useVoice; 