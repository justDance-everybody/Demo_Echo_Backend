// frontend/src/pages/MainPage/MainPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder/VoiceRecorder';
import StatusBar from '../../components/StatusBar/StatusBar';
import FourStageProgressBar, { FOUR_STAGES } from '../../components/FourStageProgressBar';
import apiClient from '../../services/apiClient'; 
import useTTS from '../../hooks/useTTS'; 
import useVoice from '../../hooks/useVoice';
import ConfirmationModal from '../../components/ConfirmationModal';
import ResultDisplay from '../../components/ResultDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import './MainPage.css'; 
import { toast } from '../../components/common/Toast';
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
    
    // 将现有状态映射到四个阶段
    const getCurrentProgressStage = useCallback(() => {
        switch (status) {
            case 'idle':
                // 如果有结果数据，说明刚刚完成，保持显示完成状态
                if (resultData) {
                    return FOUR_STAGES.COMPLETED;
                }
                return null; // 空闲状态不显示进度条
            case 'listening':
                return FOUR_STAGES.UNDERSTANDING; // 开始录音时显示理解阶段
            case 'thinking':
            case 'interpreting':
                return FOUR_STAGES.UNDERSTANDING;
            case 'listening_confirm':
            case 'confirming':
                return FOUR_STAGES.CONFIRMING;
            case 'executing':
                return FOUR_STAGES.EXECUTING;
            case 'speaking':
                // 如果有结果数据，说明执行完成
                if (resultData) {
                    return FOUR_STAGES.COMPLETED;
                }
                return FOUR_STAGES.EXECUTING;
            case 'error':
                return null; // 错误状态不显示进度条
            default:
                return null;
        }
    }, [status, resultData]);

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
                setStatus('speaking');
                
                // 优化播报内容选择（优先使用 tts_message）
                let textToSpeak;
                if (execResult.data.tts_message) {
                    textToSpeak = execResult.data.tts_message;
                } else if (execResult.data.summary) {
                    textToSpeak = execResult.data.summary;
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

                // 将正文 message 强制设置为 tts_message/summary，避免默认文案
                const uiMessage = (execResult.data.tts_message && String(execResult.data.tts_message).trim())
                  || (execResult.data.summary && String(execResult.data.summary).trim())
                  || undefined;
                setResultData({ status: 'success', data: execResult.data, message: uiMessage });
                
                console.log(`[Session: ${execResult.sessionId || currentSessionId}] 准备显示结果，让ResultDisplay处理TTS播放`);
                
                // 不在这里直接播放TTS，让ResultDisplay统一处理
                // 避免与ResultDisplay的autoSpeak冲突
                setStatus('idle');
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
        
        // 从pendingAction获取工具信息（更健壮的派生逻辑）
        const deriveToolCall = (pa) => {
            if (!pa) return { toolId: undefined, params: {} };
            if (pa.tool_calls && pa.tool_calls.length > 0) {
                const first = pa.tool_calls[0] || {};
                const derivedId = first.tool_id || first.toolId || first?.tool?.id || first?.tool?.tool_id || first.name;
                const derivedParams = first.parameters || first.params || first.arguments || first.args || first.payload || {};
                return { toolId: derivedId, params: derivedParams };
            }
            const derivedId = pa.tool_id || pa.toolId || pa.action || pa.intent_id || pa.intent || pa.service_id || pa.serverId;
            const derivedParams = pa.parameters || pa.params || pa.arguments || pa.args || pa.payload || {};
            return { toolId: derivedId, params: derivedParams };
        };

        const { toolId, params } = deriveToolCall(pendingAction);
        const userId = 1;

        if (!toolId) {
            console.error('未能从 interpret 结果中解析到可执行的工具ID。pendingAction=', pendingAction);
            toast.error('未能识别要执行的操作，请重试或更具体描述。');
            setStatus('error');
            return;
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
            
            {/* 四阶段进度条 */}
            <AnimatePresence>
                {getCurrentProgressStage() && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="progress-container"
                    >
                        <FourStageProgressBar 
                            currentStage={getCurrentProgressStage()}
                            showDescription={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* 调试信息 - 可以在开发时显示 */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{ 
                    position: 'fixed', 
                    top: '60px', 
                    right: '10px', 
                    background: 'rgba(0,0,0,0.8)', 
                    color: 'white', 
                    padding: '10px', 
                    borderRadius: '5px',
                    fontSize: '12px',
                    zIndex: 1000
                }}>
                    <div>状态: {status}</div>
                    <div>进度阶段: {getCurrentProgressStage() || '无'}</div>
                    <div>有结果数据: {resultData ? '是' : '否'}</div>
                    <div style={{ marginTop: '10px' }}>
                        <button 
                            onClick={() => setStatus('listening')}
                            style={{ margin: '2px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            测试录音
                        </button>
                        <button 
                            onClick={() => setStatus('thinking')}
                            style={{ margin: '2px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            测试理解
                        </button>
                        <button 
                            onClick={() => setStatus('confirming')}
                            style={{ margin: '2px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            测试确认
                        </button>
                        <button 
                            onClick={() => setStatus('executing')}
                            style={{ margin: '2px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            测试执行
                        </button>
                        <button 
                            onClick={() => {
                                setStatus('speaking');
                                setResultData({ status: 'success', data: { message: '测试完成' } });
                            }}
                            style={{ margin: '2px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            测试完成
                        </button>
                    </div>
                </div>
            )}
            
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
                                    autoSpeak={!isConfirmModalOpen} // 当显示确认对话框时禁用自动播放
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