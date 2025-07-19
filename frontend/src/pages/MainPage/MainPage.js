// frontend/src/pages/MainPage/MainPage.js
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder/VoiceRecorder';
import StatusBar from '../../components/StatusBar/StatusBar';
import InteractionProgressIndicator from '../../components/InteractionProgressIndicator';
import apiClient from '../../services/apiClient'; 
import useTTS from '../../hooks/useTTS'; 
import useVoice from '../../hooks/useVoice';
import ConfirmationModal from '../../components/ConfirmationModal';
import ResultDisplay from '../../components/ResultDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthContext';
import { useInteraction, INTERACTION_STATES } from '../../contexts/InteractionContext';
import { useVoiceCoordinator } from '../../hooks/useVoiceCoordinator';
import { createUnifiedErrorHandler, ERROR_TYPES } from '../../utils/unifiedErrorHandler';
import './MainPage.css'; 
import useIntent from '../../hooks/useIntent';
import { 
    MAIN_PAGE_STYLES, 
    getStateStyle, 
    shouldShowResetButton, 
    getContainerClassName, 
    getAnimationProps, 
    getComponentProps 
} from './MainPageStyles';
import { UI_CONFIG } from '../../config/uiConfig';
import { COMPONENT_LAYOUTS, ANIMATION_LAYOUTS } from '../../styles/layouts';
import { TIMEOUTS, CONFIRM_KEYWORDS } from '../../config/constants';

console.log('Test persistence');

const MainPage = () => {
    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
    
    // 使用统一的交互状态管理
    const {
        currentState,
        lastTranscript,
        lastResponse,
        pendingAction,
        resultData,
        isConfirmModalOpen,
        confirmText,
        error,
        sessionId,
        setState,
        setTranscript,
        setResponse,
        setPendingAction,
        setResultData,
        setError,
        reset,
        closeConfirmModal,
        openConfirmModal
    } = useInteraction();
    
    // 语音相关hooks
    const { speak, cancel: cancelTTS, isSpeaking } = useTTS(); 
    const { startListening, transcript: voiceTranscript, isListening, error: voiceError, reset: resetVoice } = useVoice();
    const voiceCoordinator = useVoiceCoordinator();
    
    // 统一错误处理器
    const errorHandlerRef = useRef(null);
    if (!errorHandlerRef.current) {
        errorHandlerRef.current = createUnifiedErrorHandler({
            interactionActions: {
                setState,
                setError,
                reset
            },
            voiceCoordinator,
            onUserAction: (message, errorType, context) => {
                console.log('User action required:', message, errorType);
                // 可以在这里添加特殊的用户操作处理逻辑
            },
            enableLogging: true
        });
    }
    
    // 简化的状态引用
    const resetTimerRef = useRef(null);

    useEffect(() => {
        if (!sessionId) {
            // sessionId由InteractionContext管理，这里不需要手动设置
            console.log('Session ID from context:', sessionId);
        }
        
        // 移除复杂的工具获取逻辑，简化为MVP需求
    }, [isAuthenticated, authLoading, sessionId]);
    
    // 添加重置函数
    const resetUIState = useCallback(() => {
        console.log('重置界面状态...');
        setState(INTERACTION_STATES.IDLE);
        setPendingAction(null);
        closeConfirmModal();
        setResultData(null);
        voiceCoordinator.forceStopAll();
        // 保留最后一次的文本记录，但可以选择清除
        // setTranscript('');
        // setResponse(null);
        
        // 重新启动语音监听
        setTimeout(() => {
            voiceCoordinator.startListening();
        }, UI_CONFIG.delays.voiceActivation);
    }, [setState, setPendingAction, closeConfirmModal, setResultData, voiceCoordinator]);

    const handleVoiceResult = useCallback(async (transcript) => {
        // 检查用户认证状态
        if (!isAuthenticated) {
            console.error('用户未认证，无法处理语音请求');
            setState(INTERACTION_STATES.ERROR);
            setResponse({ status: 'error', message: '请先登录后再使用语音功能。' });
            voiceCoordinator.speak('请先登录后再使用语音功能', resetUIState);
            return;
        }
        
        // 清除任何现有的重置计时器
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        
        if (!sessionId) {
            console.error('Session ID is not initialized.');
            setState(INTERACTION_STATES.ERROR);
            setResponse({ status: 'error', message: '会话初始化失败，请刷新页面重试。' });
            return;
        }
        
        console.log(`[Session: ${sessionId}] Received transcript:`, transcript);
        setTranscript(transcript);
        setState(INTERACTION_STATES.SPEAKING);
        setResponse(null);
        setResultData(null);
        setPendingAction(null);
        closeConfirmModal();

        // 第一步：复述用户的指令
        const repeatMessage = `我听到您说：${transcript}。正在为您处理...`;
        console.log(`[Session: ${sessionId}] 复述用户指令:`, repeatMessage);
        
        voiceCoordinator.speak(repeatMessage, async () => {
            // 复述完成后，开始意图识别
            console.log(`[Session: ${sessionId}] 复述完成，开始意图识别`);
            setState(INTERACTION_STATES.THINKING);
            
            try {
                const result = await apiClient.interpret(transcript, sessionId, 1); 
                console.log(`[Session: ${sessionId}] Interpret API Result:`, result);

                if (result.tool_calls && result.tool_calls.length > 0) {
                    console.log(`[Session: ${sessionId}] Tool call required. Pending action set.`);
                    setPendingAction(result);
                    const textToConfirm = result.confirm_text || result.confirmText || '您确定要执行此操作吗？';
                    
                    // 设置状态为SPEAKING，准备播报确认信息
                    setState(INTERACTION_STATES.SPEAKING);
                    
                    // 播报确认信息
                    voiceCoordinator.speak(textToConfirm, () => {
                        // 确认信息播报完毕，打开确认模态框并设置状态为CONFIRMING
                        console.log("MainPage: 确认信息播报完毕，打开确认模态框");
                        openConfirmModal(textToConfirm);
                        setState(INTERACTION_STATES.CONFIRMING);
                    });
                } else if ((result.action === 'respond' && result.content) || (result.type === 'direct_response' && result.content)) {
                    console.log(`[Session: ${sessionId}] Direct response received.`);
                    setResponse(result.content);
                    setState(INTERACTION_STATES.SPEAKING);
                    voiceCoordinator.speak(result.content, resetUIState);
                } else {
                    const textToConfirm = result.confirm_text || result.confirmText;
                    if (textToConfirm) {
                        console.log(`[Session: ${sessionId}] Confirmation text only received.`);
                        setPendingAction(result);
                        setState(INTERACTION_STATES.SPEAKING);
                        
                        voiceCoordinator.speak(textToConfirm, () => {
                            console.log("MainPage: 确认信息(无工具调用)播报完毕，打开确认模态框");
                            openConfirmModal(textToConfirm);
                            setState(INTERACTION_STATES.CONFIRMING);
                        });
                    } else {
                        console.log(`[Session: ${sessionId}] Response format detection:`, result);
                        const message = JSON.stringify(result);
                        setResponse(`收到未知格式的响应: ${message}`);
                        setState(INTERACTION_STATES.SPEAKING);
                        voiceCoordinator.speak("收到未知格式的响应，请检查控制台", resetUIState);
                    }
                }
            } catch (error) {
                console.error(`[Session: ${sessionId}] Interpret API call failed:`, error);
                errorHandlerRef.current.handleError(error, ERROR_TYPES.API_REQUEST, {
                    sessionId,
                    operation: 'interpret',
                    retryCallback: () => handleVoiceResult(transcript)
                });
            }
        });
    }, [voiceCoordinator, resetUIState, isAuthenticated, sessionId, setState, setTranscript, setResponse, setResultData, setPendingAction, closeConfirmModal, openConfirmModal]);

    // 简化的工具执行逻辑
    const executeToolAndHandleResult = useCallback(async (toolId, params, currentSessionId, userId) => {
        // 检查用户认证状态
        if (!isAuthenticated) {
            console.error('用户未认证，无法执行工具');
            setState('ERROR');
            setResultData({ status: 'error', message: '请先登录后再执行操作。' });
            voiceCoordinator.speak('请先登录后再执行操作');
            return;
        }
        
        try {
            setState('THINKING');
            const execResult = await apiClient.execute(toolId, params, currentSessionId, userId);
            
            if (execResult.success && execResult.data) {
                setResultData({ status: 'success', data: execResult.data });
                
                // 简化的文本提取逻辑
                const textToSpeak = execResult.data?.summary || 
                                  execResult.data?.tts_message || 
                                  execResult.data?.message || 
                                  execResult.data?.result || 
                                  '操作已完成';
                
                setState(INTERACTION_STATES.SPEAKING);
                voiceCoordinator.speak(textToSpeak, () => {
                    console.log('工具执行结果播报完毕，重置状态');
                    // 播报完成后重置到初始状态
                    resetUIState();
                });
            } else {
                throw new Error(execResult.error?.message || '工具执行失败');
            }
        } catch (error) {
            errorHandlerRef.current.handleError(error, ERROR_TYPES.TOOL_EXECUTION, {
                toolId,
                params,
                sessionId: currentSessionId,
                retryCallback: () => executeToolAndHandleResult(toolId, params, currentSessionId, userId)
            });
        }
    }, [isAuthenticated, setState, setResultData, voiceCoordinator, resetUIState]);

    const handleUserConfirm = useCallback(() => {
        console.log(`[Session: ${sessionId}] 用户确认了操作`);
        closeConfirmModal();
        
        // 从pendingAction获取工具信息
        let toolId, params, userId = 1;
        
        if (pendingAction?.tool_calls && pendingAction.tool_calls.length > 0) {
            const firstToolCall = pendingAction.tool_calls[0];
            toolId = firstToolCall.tool_id;
            params = firstToolCall.parameters || {};
        } else {
            toolId = pendingAction?.action || 'default_confirm_action';
            params = pendingAction?.params || {};
        }
        
        console.log(`[Session: ${sessionId}] 准备执行工具: ${toolId}，参数:`, params);
        
        // 执行工具调用
        executeToolAndHandleResult(toolId, params, sessionId, userId);
    }, [pendingAction, closeConfirmModal, sessionId, executeToolAndHandleResult]);

    const handleUserRetry = useCallback(() => {
        closeConfirmModal();
        setPendingAction(null);
        setState(INTERACTION_STATES.IDLE);
        console.log('User chose to retry.');
        // 重新开始语音识别
        setTimeout(() => {
            voiceCoordinator.startListening();
        }, UI_CONFIG.delays.voiceActivation);
    }, [closeConfirmModal, setPendingAction, setState, voiceCoordinator]);

    const handleUserCancel = useCallback(() => {
        console.log(`[Session: ${sessionId}] 用户取消了操作`);
        closeConfirmModal();
        setPendingAction(null);
        setState(INTERACTION_STATES.IDLE);
        voiceCoordinator.speak("好的，操作已取消。", () => {
            console.log('取消操作播报完毕，重新启动语音监听');
            // 延迟启动语音监听，确保TTS完全结束
            setTimeout(() => {
                voiceCoordinator.startListening();
            }, UI_CONFIG.delays.voiceActivation);
        });
    }, [closeConfirmModal, setPendingAction, setState, sessionId, voiceCoordinator]);

    useEffect(() => {
        if (!voiceCoordinator.isTTSActive && (currentState === INTERACTION_STATES.SPEAKING || currentState === INTERACTION_STATES.ERROR)) {
            console.log('TTS finished, setting state to idle.');
            setState(INTERACTION_STATES.IDLE);
        }
    }, [voiceCoordinator.isTTSActive, currentState, setState]);

    useEffect(() => {
        return () => {
            // 组件卸载时清理资源
            voiceCoordinator.forceStopAll();
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, [voiceCoordinator]);

    const handleVoiceError = useCallback((error) => {
        console.error('VoiceRecorder Error:', error);
        
        errorHandlerRef.current.handleError(error, ERROR_TYPES.VOICE_RECOGNITION, {
            component: 'VoiceRecorder',
            retryCallback: () => {
                setTimeout(() => {
                    voiceCoordinator.startListening();
                }, 1000);
            }
        });
    }, [voiceCoordinator]);
    
    // 添加手动重置按钮处理函数
    const handleReset = useCallback(() => {
        console.log('Manual reset triggered');
        
        // 停止所有语音活动
        voiceCoordinator.forceStopAll();
        
        // 重置所有状态
        reset();
        
        // 清除任何定时器
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
    }, [voiceCoordinator, reset]);
    
    // 移除侧边栏相关的处理函数

    // 移除MainPage中的语音确认处理逻辑，完全交给ConfirmationModal处理
    // 这样避免了双重语音处理的冲突问题

    // 处理语音识别错误
    useEffect(() => {
        if (voiceCoordinator.errorMessage) {
            console.error("语音协调器报告错误:", voiceCoordinator.errorMessage);
            
            // 根据错误类型决定是否向用户播报
            if (currentState === INTERACTION_STATES.CONFIRMING) {
                 voiceCoordinator.speak("抱歉，我没听清，请说确认或取消。", () => {
                    setState(INTERACTION_STATES.CONFIRMING);
                    // TTS完成后检查语音状态再重新启动
                    setTimeout(() => {
                        voiceCoordinator.startListening();
                    }, UI_CONFIG.delays.voiceActivation);
                 });
            } else {
                 // 其他情况下的错误，可能需要重置
                 reset();
            }
        }
    }, [voiceCoordinator.errorMessage, currentState, voiceCoordinator, reset, setState]);

    // UI Rendering
    return (
        <motion.div
            className={getContainerClassName(currentState)}
            data-testid="main-page"
            {...getAnimationProps('pageTransition')}
        >
            {/* 交互进度指示器 */}
            <InteractionProgressIndicator 
                data-testid="interaction-progress"
                currentState={currentState}
                showDetailedInfo={true}
                compact={false}
            />
            
            <StatusBar 
                {...getComponentProps('statusBar')}
                data-testid="status-bar"
                currentStatus={currentState} 
                lastTranscript={lastTranscript} 
                lastResponse={lastResponse} 
            />
            
            <div {...getComponentProps('contentWrapper')}>
                {/* 主内容区 */}
                <div {...getComponentProps('contentArea')}>
                    <div {...getComponentProps('messagesContainer')}>
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
                                data-testid="result-display"
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
                    {shouldShowResetButton(currentState) && (
                        <motion.button 
                            {...getComponentProps('resetButton')}
                            data-testid="reset-button"
                            onClick={handleReset}
                            {...getAnimationProps('resetButton')}
                        >
                            重新开始
                        </motion.button>
                    )}
                    
                    {/* 语音输入按钮 */}
                    <VoiceRecorder 
                        {...getComponentProps('voiceRecorder')}
                        data-testid="voice-recorder"
                        onResult={handleVoiceResult} 
                        onError={handleVoiceError}
                        setStatus={setState}
                        disabled={currentState !== INTERACTION_STATES.IDLE && currentState !== INTERACTION_STATES.LISTENING} // 允许在idle和listening状态下使用
                    />
      </div>
            </div>
            
            {/* 确认对话框 */}
            <AnimatePresence>
                {isConfirmModalOpen && (
                    <ConfirmationModal
                        {...getComponentProps('confirmationModal')}
                        isOpen={isConfirmModalOpen}
                        confirmText={confirmText}
                        onConfirm={handleUserConfirm}
                        onRetry={handleUserRetry}
                        onCancel={handleUserCancel}
                        voiceCoordinator={voiceCoordinator}
                        useVoiceConfirmation={true}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MainPage;