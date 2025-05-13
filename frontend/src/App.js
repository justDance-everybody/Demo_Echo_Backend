import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage/MainPage';
import VoiceAIMobile from './pages/MainPage/VoiceAIMobile';
import TestPage from './tests/TestPage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css'; // Assuming App.css still exists

function App() {
  // 增加应用级别的错误处理和语音功能诊断
  useEffect(() => {
    // 检查浏览器语音支持
    const checkVoiceSupport = () => {
      const sttSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const ttsSupport = !!(window.speechSynthesis);
      
      console.log('语音功能支持状态:', { 
        语音识别: sttSupport ? '支持' : '不支持', 
        语音合成: ttsSupport ? '支持' : '不支持',
        语音合成声音数量: ttsSupport ? window.speechSynthesis.getVoices().length : 0
      });
      
      return { stt: sttSupport, tts: ttsSupport };
    };
    
    const voiceSupport = checkVoiceSupport();
    
    // 如果不支持语音功能，显示警告
    if (!voiceSupport.stt || !voiceSupport.tts) {
      console.warn('您的浏览器可能不完全支持语音功能，某些功能可能不可用');
    }
    
    // 捕获全局未处理的错误，特别是与语音相关的
    window.addEventListener('error', (event) => {
      console.error('全局错误:', event.error);
      if (event.error && event.error.message && 
          (event.error.message.includes('speech') || 
           event.error.message.includes('voice') || 
           event.error.message.includes('audio'))) {
        console.error('检测到与语音相关的错误:', event.error);
      }
    });
    
    return () => {
      window.removeEventListener('error', () => {});
    };
  }, []);

  return (
    <div className="App">
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/classic" element={<MainPage />} />
            <Route path="/" element={<VoiceAIMobile />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}

export default App; 