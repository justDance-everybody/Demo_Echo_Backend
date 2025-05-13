import { useState, useCallback, useEffect, useRef } from 'react';
import { initTTS, getBestTWVoice, speakWithFix, speakStreaming } from '../utils/TtsPolyfill';

/**
 * Custom Hook for Text-to-Speech (TTS) synthesis.
 * 提供文本到语音的合成功能，支持流式播放
 */
const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    // 检查并记录语音合成对象是否可用
    const synth = window.speechSynthesis; 
    console.log("语音合成(TTS)支持状态:", synth ? "支持" : "不支持");
    
    const [availableVoices, setAvailableVoices] = useState([]);
    const [bestVoice, setBestVoice] = useState(null);
    const [activeStreaming, setActiveStreaming] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    
    // 使用ref来存储speakStream函数引用，解决循环依赖问题
    const speakStreamRef = useRef(null);

    // 初始化语音修复
    useEffect(() => {
        console.log("初始化语音修复...");
        initTTS();
    }, []);

    // 初始化语音列表
    useEffect(() => {
        const loadVoices = () => {
            try {
                if (!synth) {
                    console.error("语音合成不可用");
                    return;
                }
                
                const voices = synth.getVoices();
                console.log(`获取到 ${voices.length} 个语音合成声音`);
                
                if (voices.length === 0) {
                    console.warn("未能获取到语音列表");
                    return;
                }
                
                setAvailableVoices(voices);
                
                // 自动寻找最佳中文语音
                const bestTWVoice = getBestTWVoice();
                if (bestTWVoice) {
                    console.log(`找到最佳中文语音: ${bestTWVoice.name} (${bestTWVoice.lang})`);
                    setBestVoice(bestTWVoice);
                } else {
                    console.warn("未找到合适的中文语音");
                }
            } catch (error) {
                console.error("加载语音列表时出错:", error);
            }
        };
        
        try {
            // 有些浏览器需要等待voices加载
            if (synth.onvoiceschanged !== undefined) {
                console.log("设置语音加载事件监听器");
                synth.onvoiceschanged = loadVoices;
            }
            
            // 初始尝试加载
            console.log("尝试初始加载语音列表");
            loadVoices();
            
            // 如果初始加载未返回语音，尝试使用setTimeout延迟加载
            if (synth.getVoices().length === 0) {
                console.log("初始加载未返回语音，尝试延迟加载");
                setTimeout(loadVoices, 300); // 进一步减少延迟
            }
        } catch (error) {
            console.error("加载语音时出错:", error);
        }
    }, [synth]);

    // 选择最佳语音
    const selectVoice = useCallback((targetLang = 'zh-CN', preferGoogle = true) => {
        if (!availableVoices.length) {
            console.warn("没有可用的语音，将使用浏览器默认语音");
            return null;
        }

        // 按照优先级筛选语音
        let selectedVoice = null;
        
        // 1. 首先尝试匹配Google和指定语言的组合(如果preferGoogle为true)
        if (preferGoogle) {
            selectedVoice = availableVoices.find(voice => 
                voice.name.includes('Google') && voice.lang === targetLang
            );
            
            if (selectedVoice) {
                console.log(`找到完全匹配的Google ${targetLang}语音:`, selectedVoice.name);
                return selectedVoice;
            }
        }
        
        // 2. 尝试完全匹配语言代码
        selectedVoice = availableVoices.find(voice => voice.lang === targetLang);
        if (selectedVoice) {
            console.log(`找到完全匹配的${targetLang}语音:`, selectedVoice.name);
            return selectedVoice;
        }
        
        // 3. 尝试匹配语言的主要部分(例如zh)
        const langMain = targetLang.split('-')[0];
        selectedVoice = availableVoices.find(voice => 
            voice.lang.startsWith(langMain + '-')
        );
        if (selectedVoice) {
            console.log(`找到部分匹配的${langMain}语音:`, selectedVoice.name);
            return selectedVoice;
        }
        
        // 4. 使用默认语音
        console.log(`未找到匹配的${targetLang}语音，使用默认语音`);
        return null;
    }, [availableVoices]);

    // 取消当前播放
    const cancel = useCallback(() => {
        if (synth) {
            console.log("取消TTS播放");
            synth.cancel(); // Stops current utterance and clears queue
            setIsSpeaking(false);
            
            // 如果存在流式播放控制，也取消它
            if (activeStreaming) {
                activeStreaming.cancel();
                setActiveStreaming(null);
            }
            
            // 重置进度
            setProgress({ current: 0, total: 0 });
            
            // 增加等待时间，确保取消操作完全生效
            return new Promise(resolve => setTimeout(resolve, 300));
        }
        return Promise.resolve();
    }, [synth, activeStreaming]);

    // 普通播放文本的函数（针对短文本，默认使用更快的语速）
    const speak = useCallback((text, lang = 'zh-CN', rate = 1.0, pitch = 1, onEnd) => {
        // 判断是否应该使用流式播放（长文本且包含完整句子结构的文本）
        if (text && text.length > 80 && speakStreamRef.current && (text.includes('。') || text.includes('！') || text.includes('？') || text.includes('；'))) {
            return speakStreamRef.current(text, lang, rate, pitch, onEnd);
        }
        
        // 如果当前正在播放，先清理并等待完成
        if (isSpeaking) {
            return cancel().then(() => {
                // 确保isSpeaking状态被更新
                setTimeout(() => {
                    return performSpeak();
                }, 500); // 增加延迟时间，确保系统有足够时间响应
            });
        } else {
            return performSpeak();
        }
        
        // 实际执行语音播放的内部函数
        function performSpeak() {
            console.log(`准备播放文本: "${text}", 语言: ${lang}, 语速: ${rate}, 音高: ${pitch}`);
            
            // 处理可选参数，如果第二个参数是函数，说明它是onEnd回调
            if (typeof lang === 'function') {
                console.log("检测到第二个参数是函数，调整参数顺序");
                onEnd = lang;
                lang = 'zh-CN'; // 默认使用中文普通话
                rate = 1.0;
                pitch = 1;
            }
            
            // 防止空文本导致错误
            if (!text || text.trim() === '') {
                console.warn("尝试播放空文本，忽略请求");
                if (onEnd && typeof onEnd === 'function') {
                    setTimeout(onEnd, 10);
                }
                return false;
            }

            // 创建增强的回调函数，确保只被调用一次
            let callbackCalled = false;
            const enhancedCallback = () => {
                if (callbackCalled) return; // 防止多次调用
                callbackCalled = true;
                
                console.log("TTS播放完成，执行回调");
                setIsSpeaking(false);
                if (onEnd && typeof onEnd === 'function') {
                    console.log("调用播放完成回调函数");
                    try {
                        // 延迟执行回调，确保状态更新已完成
                        setTimeout(() => {
                            onEnd();
                        }, 200); // 增加延迟确保组件状态已更新
                    } catch (e) {
                        console.error("执行TTS回调函数时出错:", e);
                    }
                }
            };

            // 首先尝试使用修复的语音合成方法
            console.log("使用修复版语音合成函数...");
            
            // 设置状态
            setIsSpeaking(true);
            
            const speakSuccess = speakWithFix(text, bestVoice, rate, pitch, enhancedCallback);
            
            if (speakSuccess) {
                return true;
            }
            
            // 如果修复版失败，尝试使用原始方法
            console.log("修复版语音合成失败，尝试使用原始方法...");
            
            if (!synth) {
                console.error("语音合成不受支持，无法播放文本");
                setIsSpeaking(false);
                if (onEnd && typeof onEnd === 'function') {
                    setTimeout(onEnd, 10);
                }
                return false;
            }
            
            // 强制取消任何正在进行的语音，防止重复播放
            console.log("取消任何正在进行的语音");
            synth.cancel(); 

            const utterance = new SpeechSynthesisUtterance(text);
            console.log("已创建语音合成话语对象");
            
            // 设置语音参数
            utterance.lang = lang; 
            utterance.rate = rate;
            utterance.pitch = pitch;
            console.log(`已设置语音参数: 语言=${lang}, 语速=${rate}, 音高=${pitch}`);
            
            // 选择最佳语音(优先使用Google语音)
            const preferredVoice = bestVoice || selectVoice(lang, true);
            if (preferredVoice) {
                console.log(`使用选定的语音: ${preferredVoice.name} (${preferredVoice.lang})`);
                utterance.voice = preferredVoice;
            } else {
                console.warn(`未找到合适的${lang}语音，使用浏览器默认语音`);
            }

            // 添加事件处理程序
            utterance.onstart = () => {
                console.log(`TTS开始播放: ${text}`);
                setIsSpeaking(true);
            };

            utterance.onend = () => {
                console.log("TTS完成播放");
                enhancedCallback();
            };
            
            utterance.onerror = (event) => {
                console.error("TTS播放错误:", event.error);
                // 即使出错也调用回调，确保流程继续
                enhancedCallback();
            };

            // 设置超时保护，避免播放卡住
            const timeoutMs = Math.min(5000 + text.length * 60, 40000); // 动态超时：基础5秒 + 每字符60ms，最长40秒
            const safetyTimeout = setTimeout(() => {
                console.warn(`TTS播放超时保护触发(${timeoutMs}ms)，强制调用回调`);
                enhancedCallback();
            }, timeoutMs);

            // 确保语音队列为空，然后开始播放
            setTimeout(() => {
                try {
                    // 开始播放
                    console.log("TTS speak方法已调用");
                    synth.speak(utterance);

                    // 强制更新状态
                    setTimeout(() => {
                        if (synth.speaking) {
                            setIsSpeaking(true);
                        }
                    }, 100);
                    
                    // 检查是否在合理时间内开始播放
                    const speakingCheckTimer = setTimeout(() => {
                        if (!synth.speaking && !callbackCalled) {
                            console.warn("TTS似乎没有开始播放，可能出现问题");
                            enhancedCallback();
                        }
                    }, 1500); // 增加检查时间
                    
                    // 清理函数
                    return () => {
                        clearTimeout(safetyTimeout);
                        clearTimeout(speakingCheckTimer);
                    };
                } catch (error) {
                    console.error("播放文本时出错:", error);
                    clearTimeout(safetyTimeout);
                    enhancedCallback();
                }
            }, 200); // 增加延迟，确保之前的调用已完全清除

            return true;
        }
    }, [synth, isSpeaking, selectVoice, bestVoice, cancel]);

    // 流式播放长文本
    const speakStream = useCallback((text, lang = 'zh-CN', rate = 1.0, pitch = 1, onEnd) => {
        // 如果当前正在播放，先停止
        if (isSpeaking || activeStreaming) {
            cancel().then(() => {
                // 在取消完成后，尝试开始新的播放
                setTimeout(() => {
                    startStreamingAfterCancel();
                }, 500);  // 增加延迟，确保取消操作完全生效
            });
            return true;  // 表示请求已接受
        } else {
            return startStreamingAfterCancel();
        }
        
        // 内部封装实际开始流式播放的逻辑
        function startStreamingAfterCancel() {
            console.log(`准备流式播放文本: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}", 语言: ${lang}`);
            
            // 处理可选参数，如果第二个参数是函数，说明它是onEnd回调
            if (typeof lang === 'function') {
                console.log("检测到第二个参数是函数，调整参数顺序");
                onEnd = lang;
                lang = 'zh-CN'; // 默认使用中文普通话
                rate = 1.0;
                pitch = 1;
            }
            
            // 对空文本进行处理
            if (!text || text.trim() === '') {
                console.warn("无文本需要播放");
                if (onEnd && typeof onEnd === 'function') {
                    setTimeout(onEnd, 5);
                }
                return false;
            }

            // 确保文本不过长，如果太长，可以考虑进一步分割
            const maxTextLength = 2000; // 增加最大文本长度限制
            let processedText = text;
            
            if (text.length > maxTextLength) {
                console.warn(`文本过长(${text.length}字符)，超过最大限制(${maxTextLength}字符)，将被截断`);
                processedText = text.substring(0, maxTextLength);
            }
            
            // 标记播放状态
            setIsSpeaking(true);
            
            // 防止回调被多次调用
            let callbackCalled = false;
            
            // 包装回调函数，确保只调用一次
            const safeCallback = () => {
                if (callbackCalled) return;
                callbackCalled = true;
                
                console.log("流式播放完成，执行回调");
                setIsSpeaking(false);
                setActiveStreaming(null);
                setProgress({ current: 0, total: 0 });
                
                if (onEnd && typeof onEnd === 'function') {
                    // 延迟调用回调，确保状态更新完成
                    setTimeout(() => {
                        try {
                            onEnd();
                        } catch (error) {
                            console.error("执行流式播放回调时出错:", error);
                        }
                    }, 200);
                }
            };
            
            // 设置流式播放的超时保护（避免播放卡住）
            let streamingTimeout = setTimeout(() => {
                console.warn("流式播放超时保护触发，强制结束");
                safeCallback();
            }, Math.min(text.length * 300, 180000)); // 更大的超时时间：每字符300ms，最长3分钟
            
            try {
                const streamController = speakStreaming(
                    processedText, 
                    bestVoice, 
                    rate, 
                    pitch,
                    // 段落播放进度回调
                    (current, total) => {
                        console.log(`流式播放进度: ${current + 1}/${total}`);
                        setProgress({ current: current + 1, total });
                    },
                    // 所有段落播放完成回调
                    () => {
                        clearTimeout(streamingTimeout); // 播放完成，清除超时保护
                        console.log("所有文本片段播放完成");
                        safeCallback();
                    }
                );
                
                // 如果流式播放启动成功，保存控制器引用
                if (streamController) {
                    setActiveStreaming(streamController);
                    setProgress({ current: 0, total: streamController.segmentsCount });
                    return true;
                } else {
                    // 流式播放启动失败，尝试使用单次播放
                    console.warn("流式播放启动失败，尝试使用单次播放");
                    return speak(processedText, lang, rate, pitch, onEnd);
                }
            } catch (error) {
                console.error("流式播放抛出异常:", error);
                clearTimeout(streamingTimeout);
                setIsSpeaking(false);
                
                // 尝试单次播放作为后备方案
                console.warn("尝试使用单次播放作为后备方案");
                return speak(processedText, lang, rate, pitch, onEnd);
            }
        }
    }, [bestVoice, isSpeaking, activeStreaming, cancel, speak]);

    // Effect to handle browser visibility change and cleanup
    useEffect(() => {
        // 修复Chrome中的SpeechSynthesis挂起问题
        const handleVisibilityChange = () => {
            if (document.hidden && synth && synth.speaking) {
                console.log("页面隐藏时暂停并取消语音");
                synth.pause();
                synth.cancel();
                setIsSpeaking(false);
                
                // 如果存在流式播放控制，也取消它
                if (activeStreaming) {
                    activeStreaming.cancel();
                    setActiveStreaming(null);
                }
        }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        console.log("已添加visibilitychange事件监听器");
    
        // 作为安全措施，定期检查合成器状态
        console.log("设置合成器状态检查定时器");
        const intervalId = setInterval(() => {
            if (synth && synth.speaking && !isSpeaking) {
                console.log("检测到合成器正在播放但状态未更新，修正状态");
                setIsSpeaking(true);
            } else if (synth && !synth.speaking && isSpeaking && !activeStreaming) {
                console.log("检测到合成器已停止播放但状态未更新，修正状态");
                setIsSpeaking(false);
            }
        }, 1000);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
            console.log("清理事件监听器和定时器");
            
            if (synth && isSpeaking) {
                console.log("组件卸载时取消TTS");
                synth.cancel();
            }
            
            if (activeStreaming) {
                activeStreaming.cancel();
            }
        };
    }, [synth, isSpeaking, activeStreaming]);

    // 设置speakStreamRef.current以解决循环依赖问题
    useEffect(() => {
        speakStreamRef.current = speakStream;
    }, [speakStream]);

    return {
        speak,
        speakStream,
        cancel,
        isSpeaking,
        progress
    };
};

export default useTTS; 