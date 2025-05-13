import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider as AntConfigProvider } from 'antd';
import { ConfigProvider as AntMobileConfigProvider } from 'antd-mobile';
import zhCN from 'antd/lib/locale/zh_CN';
import zhCNMobile from 'antd-mobile/es/locales/zh-CN';
import 'antd-mobile/bundle/style.css';
import './index.css';
import App from './App';

// Polyfill for SpeechRecognition
if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
  console.warn('浏览器不支持SpeechRecognition API，语音功能将无法使用。');
}

// 添加语音调试工具
window.voiceDebugger = {
  // 启用/禁用调试日志
  enableDebug: true,
  
  // 检查浏览器语音支持
  checkVoiceSupport: () => {
    const sttSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const ttsSupport = !!(window.speechSynthesis);
    
    return {
      stt: sttSupport, 
      tts: ttsSupport,
      ttsVoices: window.speechSynthesis ? window.speechSynthesis.getVoices().length : 0
    };
  },
  
  // 检查麦克风权限
  checkMicPermission: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { permitted: true };
    } catch (err) {
      return { permitted: false, error: err.message };
    }
  },
  
  // 测试TTS
  testTTS: (text = "测试文本到语音功能") => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }
};

console.log('日志收集器已激活。使用 window.voiceDebugger 查看语音功能状态');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AntConfigProvider locale={zhCN}>
      <AntMobileConfigProvider locale={zhCNMobile}>
        <App />
      </AntMobileConfigProvider>
    </AntConfigProvider>
  </React.StrictMode>
); 