// frontend/src/pages/MainPage/MainPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder/VoiceRecorder';
import StatusBar from '../../components/StatusBar/StatusBar';
import apiClient from '../../services/apiClient'; 
import useTTS from '../../hooks/useTTS'; 
import useVoice from '../../hooks/useVoice';
import ConfirmationModal from '../../components/ConfirmationModal';
import ResultDisplay from '../../components/ResultDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import './MainPage.css'; 
import useIntent from '../../hooks/useIntent';

console.log('Test persistence');

const MainPage = () => {
    const [status, setStatus] = useState('idle');
    const [lastTranscript, setLastTranscript] = useState('');
    const [lastResponse, setLastResponse] = useState(null);
    const sessionIdRef = useRef(null); 
    const { speak, cancel: cancelTTS, isSpeaking } = useTTS(); 
    const { startListening, transcript: voiceTranscript, isListening, error: voiceError, reset: resetVoice, stopListening } = useVoice();
    const { classifyIntent } = useIntent();
    
    const [pendingAction, setPendingAction] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [resultData, setResultData] = useState(null);
    
    // 侧边栏状态
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [availableTools, setAvailableTools] = useState([]);
    
    // 添加自动重置计时器引用
    const resetTimerRef = useRef(null);
    const errorCountRef = useRef(0);

    useEffect(() => {
        if (!sessionIdRef.current) {
            sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
            console.log('Initialized Session ID:', sessionIdRef.current);
        }
        
        // 尝试获取可用工具列表
        const fetchTools = async () => {
            try {
                // 调用API获取工具列表
                const tools = await apiClient.getTools();
                if (tools && tools.length > 0) {
                    // 将工具列表映射为前端所需格式
                    const formattedTools = tools.map(tool => ({
                        id: tool.tool_id,
                        name: tool.name,
                        description: tool.description || `${tool.name}工具`,
                        type: tool.type,
                        source: tool.source
                    }));
                    
                    setAvailableTools(formattedTools);
                    console.log('成功获取工具列表:', formattedTools);
                } else {
                    console.warn('工具列表为空');
                    // 使用备用数据
                    setAvailableTools([
                        { id: 'maps_weather', name: '天气查询', description: '查询指定城市的天气情况' },
                        { id: 'calendar', name: '日程管理', description: '查看和管理日程安排' }
                    ]);
                }
            } catch (error) {
                console.error('获取工具列表失败:', error);
                // 使用备用数据
                setAvailableTools([
                    { id: 'maps_weather', name: '天气查询', description: '查询指定城市的天气情况' },
                    { id: 'calendar', name: '日程管理', description: '查看和管理日程安排' }
                ]);
            }
        };
        
        fetchTools();
    }, []);
    
    // 添加重置函数
    const resetUIState = useCallback(() => {
        console.log('重置界面状态...');
        setStatus('idle');
        setPendingAction(null);
        setIsConfirmModalOpen(false);
        setResultData(null);
        errorCountRef.current = 0;
        resetVoice();
        // 保留最后一次的文本记录，但可以选择清除
        // setLastTranscript('');
        // setLastResponse(null);
    }, [resetVoice]);

    const handleVoiceResult = useCallback(async (transcript) => {
        // 清除任何现有的重置计时器
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        
        const currentSessionId = sessionIdRef.current; 
        if (!currentSessionId) {
            console.error('Session ID is not initialized.');
            setStatus('error');
            setLastResponse({ status: 'error', message: '会话初始化失败，请刷新页面重试。' });
            return;
        }
        
        console.log(`[Session: ${currentSessionId}] Received transcript:`, transcript);
        setLastTranscript(transcript);
        setStatus('thinking');
        setLastResponse(null);
        setResultData(null);
        setPendingAction(null);
        setIsConfirmModalOpen(false);

        try {
            const result = await apiClient.interpret(transcript, currentSessionId, 1); 
            console.log(`[Session: ${currentSessionId}] Interpret API Result:`, result);

            // 检查并保存返回的sessionId
            if (result.sessionId && result.sessionId !== currentSessionId) {
                console.log(`更新sessionId: ${currentSessionId} -> ${result.sessionId}`);
                sessionIdRef.current = result.sessionId;
            }

            if (result.tool_calls && result.tool_calls.length > 0) {
                console.log(`[Session: ${result.sessionId || currentSessionId}] Tool call required. Pending action set.`);
                setPendingAction(result);
                const textToConfirm = result.confirm_text || result.confirmText || '您确定要执行此操作吗？';
                setConfirmText(textToConfirm);
                setIsConfirmModalOpen(true);

                // 调用 speak 并传入 onEnd 回调
                speak(textToConfirm, () => {
                    // TTS 播放结束后，启动 STT 监听用户确认
                    console.log("MainPage: 确认信息播报完毕，准备开始监听用户回复...");
                    console.log("[MainPage] speak onEnd callback triggered. Current status before set:", status);
                    setStatus('listening_confirm');
                    
                    // 不再在这里直接启动语音识别，而是通过传给ConfirmationModal的props来控制
                    console.log("[MainPage] 设置状态为listening_confirm，等待ConfirmationModal组件中的语音识别启动");
                });
            } else if (result.action === 'respond' && result.content) {
                console.log(`[Session: ${result.sessionId || currentSessionId}] Direct response received.`);
                setLastResponse({ status: 'info', message: result.content });
                setStatus('speaking');
                speak(result.content, resetUIState);
            } else {
                const textToConfirm = result.confirm_text || result.confirmText;
                if (textToConfirm) {
                    console.log(`[Session: ${result.sessionId || currentSessionId}] Confirmation text only received.`);
                    setPendingAction(result);
                    setConfirmText(textToConfirm);
                    setIsConfirmModalOpen(true);
                    speak(textToConfirm, () => {
                        console.log("MainPage: 确认信息(无工具调用)播报完毕，准备开始监听用户回复...");
                        console.log("[MainPage] speak onEnd callback triggered (no tool call). Current status before set:", status);
                        setStatus('listening_confirm');
                        
                        // 不再在这里直接启动语音识别，而是通过传给ConfirmationModal的props来控制
                        console.log("[MainPage] 设置状态为listening_confirm，等待ConfirmationModal组件中的语音识别启动");
                    });
                } else {
                    console.log(`[Session: ${result.sessionId || currentSessionId}] Response format detection:`, result);
                    const message = JSON.stringify(result);
                    setLastResponse({ status: 'info', message: `收到未知格式的响应: ${message}` });
                    setStatus('speaking');
                    speak("收到未知格式的响应，请检查控制台", resetUIState);
                }
            }
        } catch (error) {
            console.error(`[Session: ${currentSessionId}] Interpret API call failed:`, error);
            const message = `抱歉，理解您的指令时出错：${error.message || '网络请求失败'}`;
            setLastResponse({ status: 'error', message });
            setStatus('error');
            speak(message, resetUIState);
            
            // 增加错误计数
            errorCountRef.current += 1;
            
            // 错误后5秒自动重置
            resetTimerRef.current = setTimeout(resetUIState, 5000);
        }
    }, [speak, resetUIState, startListening, isListening, stopListening]);

    // 提取工具执行和结果处理逻辑到单独的函数
    const executeToolAndHandleResult = useCallback(async (toolId, params, currentSessionId, userId) => {
        try {
            const execResult = await apiClient.execute(toolId, params, currentSessionId, userId);
            console.log(`[Session: ${currentSessionId}] Execute API Result:`, execResult);

            // 检查并保存返回的sessionId
            if (execResult.sessionId && execResult.sessionId !== currentSessionId) {
                console.log(`执行后更新sessionId: ${currentSessionId} -> ${execResult.sessionId}`);
                sessionIdRef.current = execResult.sessionId;
            }

            if (execResult.success && execResult.data) {
                console.log(`[Session: ${execResult.sessionId || currentSessionId}] Tool execution successful.`);
                setResultData({ status: 'success', data: execResult.data });
                setStatus('speaking');
                
                // 优化播报内容选择
                let textToSpeak;
                if (execResult.data.summary) {
                    textToSpeak = execResult.data.summary;
                } else if (execResult.data.tts_message) {
                    textToSpeak = execResult.data.tts_message;
                } else if (typeof execResult.data === 'string') {
                    textToSpeak = execResult.data;
                } else if (execResult.data.result || execResult.data.message) {
                    textToSpeak = execResult.data.result || execResult.data.message;
                } else {
                    // 如果没有合适的字段，尝试提取有用信息
                    const simplifiedData = {};
                    const keyOrder = ['message', 'result', 'summary', 'status', 'city', 'date', 'weather'];
                    
                    // 优先提取特定关键字段
                    keyOrder.forEach(key => {
                        if (execResult.data[key] !== undefined) {
                            simplifiedData[key] = execResult.data[key];
                        }
                    });
                    
                    // 尝试将简化后的对象转为字符串播报
                    const simpleString = Object.entries(simplifiedData)
                                          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                                          .join(', ');
                    textToSpeak = simpleString || "操作成功，但没有提供详细信息";
                }
                
                console.log(`[Session: ${execResult.sessionId || currentSessionId}] 即将播报结果: "${textToSpeak}"`);
                
                // 使用增强的流式语音播报，确保状态正确更新
                speak(textToSpeak, resetUIState);
            } else {
                console.error(`[Session: ${execResult.sessionId || currentSessionId}] Tool execution failed:`, execResult.error);
                const message = `抱歉，执行操作时失败：${execResult.error?.message || '未知错误'}`;
                setResultData({ status: 'error', message });
                setStatus('error');
                speak(message, resetUIState);
                
                // 错误后5秒自动重置
                resetTimerRef.current = setTimeout(resetUIState, 5000);
            }
        } catch (error) {
            console.error(`[Session: ${currentSessionId}] Execute API call failed:`, error);
            const message = `抱歉，执行操作时出错：${error.message || '网络请求失败'}`;
            setResultData({ status: 'error', message });
            setStatus('error');
            speak(message, resetUIState);
            
            // 错误后5秒自动重置
            resetTimerRef.current = setTimeout(resetUIState, 5000);
        }
    }, [speak, resetUIState]);

    const handleUserConfirm = useCallback(() => {
        console.log(`[Session: ${sessionIdRef.current}] 用户确认了操作`);
        setIsConfirmModalOpen(false);
        
        // 取消可能正在播放的确认文本
        if (isSpeaking) {
            cancelTTS();
        }
        if (isListening) {
            // stopListening(); // useVoice Hook 的 onresult 后会自动停止
        }
        
        // 处理用户确认
        setStatus('executing');
        
        // 从pendingAction获取工具信息
        let toolId, params, userId = 1;
        
        if (pendingAction?.tool_calls && pendingAction.tool_calls.length > 0) {
            // 新格式: 工具调用数组
            const firstToolCall = pendingAction.tool_calls[0];
            toolId = firstToolCall.tool_id;
            params = firstToolCall.parameters || {};
        } else {
            console.warn(`[Session: ${sessionIdRef.current}] 没有明确的 tool_calls，尝试执行... (可能需要后端支持无工具的确认流程)`);
            // 这里可以尝试设置一个默认动作或提示错误
            // 暂时允许继续，看后端execute如何处理
            toolId = pendingAction?.action || 'default_confirm_action'; // 假设有一个默认动作
            params = pendingAction?.params || {};
        }
        
        const currentSessionId = sessionIdRef.current;

        console.log(`[Session: ${currentSessionId}] 准备执行工具: ${toolId}，参数:`, params);
        
        // 清除任何现有的自动重置计时器
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        
        // 执行工具调用
        executeToolAndHandleResult(toolId, params, currentSessionId, userId);
    }, [pendingAction, speak, cancelTTS, resetUIState, isSpeaking, isListening, executeToolAndHandleResult]);

    const handleUserRetry = useCallback(() => {
        cancelTTS();
        setIsConfirmModalOpen(false);
        console.log('User chose to retry.');
        setStatus('idle');
        setLastResponse(null);
        setPendingAction(null);
    }, [cancelTTS]);

    const handleUserCancel = useCallback(() => {
        console.log(`[Session: ${sessionIdRef.current}] 用户取消了操作`);
        setIsConfirmModalOpen(false);
        speak("好的，操作已取消。", resetUIState);
    }, [speak, resetUIState]);

    useEffect(() => {
        if (!isSpeaking && (status === 'speaking' || status === 'error' || status === 'info')) {
            console.log('TTS finished, setting status to idle.');
            setStatus('idle');
        }
    }, [isSpeaking, status]);

  useEffect(() => {
        return () => {
            // 组件卸载时清理资源
            cancelTTS();
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, [cancelTTS]);

    const handleVoiceError = useCallback((error) => {
        console.error('VoiceRecorder Error:', error);
        setStatus('error');
        setLastResponse({ status: 'error', message: `语音识别错误: ${error}` });
        
        // 错误次数累计
        errorCountRef.current += 1;
        
        // 如果连续错误超过3次，延长自动重置时间或显示特殊提示
        if (errorCountRef.current >= 3) {
            speak('语音识别似乎遇到了持续问题，您可能需要检查麦克风权限或刷新页面。');
            errorCountRef.current = 0;
        } else {
            resetTimerRef.current = setTimeout(resetUIState, 5000);
        }
    }, [speak, resetUIState]);
    
    // 添加手动重置按钮处理函数
    const handleReset = useCallback(() => {
        resetUIState();
    }, [resetUIState]);
    
    // 处理侧边栏切换
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);
    
    // 处理工具选择
    const handleToolSelect = useCallback((toolId) => {
        // 这里可以实现选择工具后的操作，比如直接触发工具调用或显示工具详情
        console.log(`Selected tool: ${toolId}`);
        setIsSidebarOpen(false);
    }, []);

    // 处理语音确认的函数
    const handleVoiceConfirmation = useCallback((voiceInput) => {
        console.log("[MainPage] 收到语音确认输入:", voiceInput);
        if (!voiceInput || status !== 'listening_confirm') return;
        
        // 使用意图分类来处理语音输入
        const intent = classifyIntent(voiceInput);
        console.log("[MainPage] 语音确认意图分类结果:", intent);
        
        // 根据意图执行相应操作
        switch (intent) {
            case 'CONFIRM':
                console.log("[MainPage] 识别到确认意图，执行操作");
                handleUserConfirm();
                break;
            case 'RETRY':
                console.log("[MainPage] 识别到重试意图，重置状态");
                handleUserRetry();
                break;
            case 'CANCEL':
                console.log("[MainPage] 识别到取消意图，取消操作");
                handleUserCancel();
                break;
            default:
                console.log("[MainPage] 未能明确识别意图，等待用户手动操作");
                // 可以选择播放提示音或显示提示信息
                speak("抱歉，我没听清楚您的回答，请说确认、取消或重试。", () => {
                    // 重新启动语音识别
                    if (!isListening) {
                        startListening();
                    }
                });
                break;
        }
    }, [status, classifyIntent, handleUserConfirm, handleUserRetry, handleUserCancel, speak, isListening, startListening]);
    
    // 更新useEffect，监听语音输入并处理确认
    useEffect(() => {
        if (status === 'listening_confirm' && voiceTranscript && !isListening) {
            // 当处于监听确认状态，且收到了新的识别结果，且监听已停止
            console.log("[MainPage] 确认状态: 收到用户确认/取消的语音:", voiceTranscript);
            handleVoiceConfirmation(voiceTranscript);
            resetVoice(); // 处理完后重置 useVoice 状态
        }
    }, [status, voiceTranscript, isListening, resetVoice, handleVoiceConfirmation]);

    // 处理语音识别错误
    useEffect(() => {
        if (voiceError) {
            console.error("语音识别Hook报告错误:", voiceError);
            // 根据错误类型决定是否向用户播报
            if (status === 'listening_confirm') {
                 speak("抱歉，我没听清，请说确认或取消。", () => {
                    setStatus('listening_confirm');
                    startListening();
                 });
            } else {
                 // 其他情况下的错误，可能需要重置
                 resetUIState();
            }
            resetVoice(); // 清除错误状态
        }
    }, [voiceError, status, speak, resetUIState, resetVoice, startListening]);

    // UI Rendering
    return (
        <motion.div
            className="main-page"
            data-testid="main-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <StatusBar currentStatus={status} lastTranscript={lastTranscript} lastResponse={lastResponse} />
            
            {/* 侧边栏切换按钮 */}
            <button 
                className="sidebar-toggle-btn"
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? "关闭工具菜单" : "打开工具菜单"}
            >
                {isSidebarOpen ? "×" : "≡"}
            </button>
            
            <div className="main-content-wrapper">
                {/* 侧边栏 */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div 
                            className="sidebar"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2>可用工具</h2>
                            <div className="tools-list">
                                {availableTools.map(tool => (
                                    <div 
                                        key={tool.id}
                                        className="tool-item"
                                        onClick={() => handleToolSelect(tool.id)}
                                    >
                                        <h3>{tool.name}</h3>
                                        <p>{tool.description}</p>
                                        <div className="tool-meta">
                                            <span className="tool-type">{tool.type === 'mcp' ? 'MCP工具' : 'HTTP接口'}</span>
                                            {tool.source && <span className="tool-source">来源: {tool.source}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* 主内容区 */}
                <div className="content-area">
                    <div className="messages-container">
                        {lastTranscript && (
                            <motion.div 
                                className="transcript user-message"
              initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
            >
                                <div className="message-header">你说</div>
                                <div className="message-content">{lastTranscript}</div>
                            </motion.div>
                        )}
                        
                        {typeof lastResponse === 'string' && lastResponse && (
                            <motion.div 
                                className="ai-response system-message"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="message-header">AI</div>
                                <div className="message-content">{lastResponse}</div>
                            </motion.div>
                        )}
                        
                        {lastResponse && typeof lastResponse === 'object' && lastResponse.status !== 'success' && (
                            <motion.div
              initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="result-container"
            >
              <ResultDisplay
                                    status={lastResponse.status}
                                    message={lastResponse.message} 
                                    autoSpeak={false}
              />
                            </motion.div>
                        )}
                        
                        {resultData && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="result-container"
                            >
                                <ResultDisplay 
                                    status={resultData.status}
                                    data={resultData.data} 
                                    message={resultData.message}
                                    autoSpeak={true}
                                    onDismiss={handleReset}
                                />
                            </motion.div>
                        )}
                    </div>
        
        {/* 重置按钮 */}
                    {status !== 'idle' && status !== 'listening' && (
                        <motion.button 
          className="reset-button"
                            onClick={handleReset}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            重新开始
                        </motion.button>
                    )}
                    
                    {/* 语音输入按钮 */}
                    <VoiceRecorder 
                        onResult={handleVoiceResult} 
                        onError={handleVoiceError}
                        setStatus={setStatus}
                        disabled={status !== 'idle' && status !== 'listening'} // 允许在idle和listening状态下使用
                    />
      </div>
            </div>
            
            {/* 确认对话框 */}
            <AnimatePresence>
                {isConfirmModalOpen && (
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        confirmText={confirmText}
                        onConfirm={handleUserConfirm}
                        onRetry={handleUserRetry}
                        onCancel={handleUserCancel}
                        isListening={isListening}
                        isTTSSpeaking={isSpeaking}
                        useVoiceConfirmation={true}
                        startSTTListening={startListening}
                        stopSTTListening={stopListening}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MainPage; 