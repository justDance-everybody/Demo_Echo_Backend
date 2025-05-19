import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider as AntConfigProvider } from 'antd';
import { ConfigProvider as AntMobileConfigProvider } from 'antd-mobile';
import zhCN from 'antd/lib/locale/zh_CN';
import zhCNMobile from 'antd-mobile/es/locales/zh-CN';
import 'antd-mobile/bundle/style.css';
import './styles/tokens.css'; // 确保CSS变量在早期加载
import './index.css';
import './styles/MobileOptimization.css'; // 导入移动端优化样式
import App from './App';
import ThemeProvider from './theme/ThemeProvider';
import GlobalStyles from './styles/GlobalStyles';

// Start MSW worker in development if REACT_APP_USE_MOCKS is true
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_MOCKS === 'true') {
  console.log('Starting MSW for mocking API calls...');
  import('./mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass', // or 'warn' or a function
    });
    console.log('MSW worker started.');
  }).catch(err => {
    console.error('Failed to start MSW worker:', err);
  });
}

// Ant Design Mobile 自定义主题配置
const antMobileTheme = {
  token: {
    // 设置主色调，使用CSS变量，确保与我们的设计令牌系统一致
    colorPrimary: 'var(--color-primary)',
    colorSuccess: 'var(--color-success)',
    colorWarning: 'var(--color-warning)',
    colorDanger: 'var(--color-error)',
    colorTextBase: 'var(--text)',
    fontFamily: 'var(--font-family)',
    borderRadius: 8, // 8px
  },
};

// Ant Design 自定义主题配置
const antDesignTheme = {
  token: {
    colorPrimary: 'var(--color-primary)',
    colorSuccess: 'var(--color-success)',
    colorWarning: 'var(--color-warning)',
    colorError: 'var(--color-error)',
    colorTextBase: 'var(--text)',
    fontFamily: 'var(--font-family)',
    borderRadius: 8,
  },
};

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
    <ThemeProvider>
      <GlobalStyles />
      <AntConfigProvider locale={zhCN} theme={antDesignTheme}>
        <AntMobileConfigProvider locale={zhCNMobile} theme={antMobileTheme}>
        <App />
      </AntMobileConfigProvider>
    </AntConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
); 