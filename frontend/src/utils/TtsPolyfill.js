/**
 * TTS 修复与增强
 * 
 * 解决Chrome和Firefox中语音合成API的已知问题:
 * 1. Chrome中语音有时会被卡住
 * 2. Firefox中语音列表可能无法加载
 * 3. 特定浏览器版本的语音选择问题
 * 4. 实现伪流式播放以提高响应速度
 */

// 初始化后需要调用此函数
export function initTTS() {
  try {
    console.log("初始化TTS修复...");
    const synth = window.speechSynthesis;
    
    if (!synth) {
      console.error("此浏览器不支持语音合成API");
      return false;
    }
    
    // 强制取消任何可能的挂起播放
    synth.cancel();
    
    // Chrome bug: 超过某个时间长度的语句可能会在某些情况下停止
    // https://bugs.chromium.org/p/chromium/issues/detail?id=679437
    // 解决方案: 定期重启语音合成器
    const intervalId = setInterval(() => {
      if (!synth.speaking) return;
      
      // 如果语音合成器还在说话，先暂停再恢复，防止卡住
      synth.pause();
      setTimeout(() => {
        if (synth) synth.resume();
      }, 50); // 短暂延迟后恢复
    }, 2000); // 缩短检查间隔到2秒
    
    // 存储interval ID以便可以在需要时清除
    window._ttsCheckIntervalId = intervalId;
    
    // 有些浏览器需要手动触发voices加载
    if (synth.getVoices().length === 0) {
      console.log("初次加载语音列表为空，尝试延迟加载");
      setTimeout(() => {
        // 手动获取并存储语音
        const voices = synth.getVoices();
        console.log(`延迟加载获取到 ${voices.length} 个语音`);
        
        if (voices.length === 0) {
          console.warn("延迟加载后仍未获取到语音列表");
          // 再次尝试，有些浏览器需要更长时间
          setTimeout(() => {
            const retryVoices = synth.getVoices();
            console.log(`二次延迟加载获取到 ${retryVoices.length} 个语音`);
          }, 1000);
        }
      }, 500); // 减少延迟加载时间
    }
    
    // 预热语音引擎，减少第一次播放的初始化时间
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0; // 静音预热
      utterance.rate = 1;
      synth.speak(utterance);
      console.log("已预热语音引擎");
    } catch (e) {
      console.warn("语音引擎预热失败", e);
    }
    
    console.log("TTS修复初始化完成");
    return true;
  } catch (error) {
    console.error("TTS修复初始化失败:", error);
    return false;
  }
}

// 尝试获取最佳的中文语音
export function getBestTWVoice() {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    
    const voices = synth.getVoices();
    if (!voices || voices.length === 0) return null;
    
    // 优先选择Google的中文普通话语音
    let bestVoice = voices.find(v => v.name.includes('Google') && v.lang === 'zh-CN');
    
    // 如果没有Google中文普通话，尝试Google的台湾语音
    if (!bestVoice) {
      bestVoice = voices.find(v => v.name.includes('Google') && v.lang === 'zh-TW');
    }
    
    // 如果仍没有Google语音，选择任何zh-CN语音
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === 'zh-CN');
    }
    
    // 如果还没有，尝试任何zh-TW语音
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === 'zh-TW');
    }
    
    // 如果仍然没有，尝试任何zh语音
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang.startsWith('zh'));
    }
    
    return bestVoice;
  } catch (error) {
    console.error("获取最佳中文语音失败:", error);
    return null;
  }
}

// 智能拆分文本为较小片段进行播放
export function splitTextForStreaming(text) {
  if (!text || text.length <= 80) return [text]; // 增加阈值，减少不必要的分割
  
  // 按句子分割（句号、问号、感叹号、分号后跟空格或者结束）
  const sentenceBreaks = text.match(/[。？！；.?!;][、，,\s]?/g) || [];
  
  if (sentenceBreaks.length === 0) {
    // 如果没有标点，则按照逗号或空格分割
    const parts = text.split(/[，,、\s]/g).filter(t => t.trim());
    
    // 将拆分后的短句组合成更长但仍安全的片段
    const result = [];
    let currentSegment = '';
    
    for (const part of parts) {
      if (currentSegment.length + part.length < 50) { // 增加长度限制，减少分割次数
        currentSegment += part + (part.length > 0 ? '，' : '');
      } else {
        if (currentSegment) result.push(currentSegment);
        currentSegment = part;
      }
    }
    
    if (currentSegment) result.push(currentSegment);
    return result;
  }
  
  const segments = [];
  let lastIndex = 0;
  
  // 遍历所有句子分隔符的位置
  for (let i = 0; i < sentenceBreaks.length; i++) {
    // 找到当前分隔符在文本中的位置
    const breakIndex = text.indexOf(sentenceBreaks[i], lastIndex);
    if (breakIndex === -1) continue;
    
    // 段落结束位置（包含分隔符）
    const endIndex = breakIndex + sentenceBreaks[i].length;
    
    // 提取段落并添加到结果中
    const segment = text.substring(lastIndex, endIndex);
    if (segment.trim()) {
      segments.push(segment);
    }
    
    // 更新下一段开始位置
    lastIndex = endIndex;
  }
  
  // 添加最后一段（如果有）
  if (lastIndex < text.length) {
    const lastSegment = text.substring(lastIndex);
    if (lastSegment.trim()) {
      segments.push(lastSegment);
    }
  }
  
  // 优先按自然句子断开，但确保片段不会过长
  const result = [];
  let currentSegment = '';
  
  for (const segment of segments) {
    // 如果当前段落超过安全长度，需要进一步分割
    if (segment.length > 80) {
      // 先添加已累积的片段
      if (currentSegment) {
        result.push(currentSegment);
        currentSegment = '';
      }
      
      // 将长段落按逗号分割，但尽量保持完整语义
      const subBreaks = segment.match(/[，,、]/g) || [];
      
      if (subBreaks.length === 0) {
        // 没有逗号等，直接添加
        result.push(segment);
      } else {
        let subLastIndex = 0;
        let subPart = '';
        
        // 按逗号分割，但尽量保持完整语义
        for (let j = 0; j < subBreaks.length; j++) {
          const subBreakIndex = segment.indexOf(subBreaks[j], subLastIndex);
          if (subBreakIndex === -1) continue;
          
          const subEndIndex = subBreakIndex + subBreaks[j].length;
          const part = segment.substring(subLastIndex, subEndIndex);
          
          if (subPart.length + part.length < 80) {
            subPart += part;
          } else {
            if (subPart) result.push(subPart);
            subPart = part;
          }
          
          subLastIndex = subEndIndex;
        }
        
        // 添加最后一部分
        if (subLastIndex < segment.length) {
          const lastPart = segment.substring(subLastIndex);
          if (subPart.length + lastPart.length < 80) {
            subPart += lastPart;
          } else {
            if (subPart) result.push(subPart);
            subPart = lastPart;
          }
        }
        
        if (subPart) result.push(subPart);
      }
    } 
    // 如果当前段落加上累积片段不超过80字符，则合并以减少分段
    else if (currentSegment.length + segment.length < 80) {
      currentSegment += segment;
    } else {
      // 否则，添加累积片段，开始新片段
      if (currentSegment) result.push(currentSegment);
      currentSegment = segment;
    }
  }
  
  // 添加最后累积的片段
  if (currentSegment) result.push(currentSegment);
  
  return result;
}

// 串行播放多个文本片段，模拟流式效果
export function speakStreaming(text, voice = null, rate = 1.3, pitch = 1, onSegmentEnd = null, onAllEnd = null) {
  // 分割文本
  const segments = splitTextForStreaming(text);
  
  if (!segments || segments.length === 0) {
    console.warn('没有可播放的文本片段');
    if (onAllEnd) setTimeout(onAllEnd, 0);
    return false;
  }
  
  console.log(`文本已分割为 ${segments.length} 个片段进行流式播放`);
  
  // 预加载所有片段，准备连续播放
  const synth = window.speechSynthesis;
  const utterances = segments.map((segment, index) => {
    const utterance = new SpeechSynthesisUtterance(segment);
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    // 为所有片段设置相同的语音
    if (voice) {
      utterance.voice = voice;
    } else {
      const bestVoice = getBestTWVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = 'zh-CN';
      }
    }
    
    return utterance;
  });
  
  let isCancelled = false;
  let lastSegmentIndex = -1; // 添加跟踪最后成功播放的片段索引的变量
  
  const cancelStreaming = () => {
    console.log('取消流式播放');
    isCancelled = true;
    window.speechSynthesis.cancel();
  };
  
  // 设置全局超时保护，防止整个流程卡住
  const streamingTimeoutId = setTimeout(() => {
    if (!isCancelled) {
      console.warn('全局流式播放超时保护触发，强制取消');
      cancelStreaming();
      if (onAllEnd) onAllEnd();
    }
  }, Math.min(segments.length * 15000, 120000)); // 增加超时时间，每段15秒，最长2分钟
  
  // 准备播放队列
  const playNext = (index) => {
    if (isCancelled || index >= utterances.length) {
      if (!isCancelled && onAllEnd) {
        clearTimeout(streamingTimeoutId);
        console.log('所有文本片段播放完成');
        onAllEnd();
      }
      return;
    }
    
    const utterance = utterances[index];
    console.log(`准备播放第 ${index + 1}/${utterances.length} 段: "${segments[index].substring(0, 30)}${segments[index].length > 30 ? '...' : ''}"`);
    
    // 设置此片段的播放超时
    const segmentTimeout = setTimeout(() => {
      console.warn(`片段 ${index + 1} 播放超时，强制继续下一片段`);
      synth.cancel();
      
      if (onSegmentEnd) onSegmentEnd(index, segments.length);
      lastSegmentIndex = index;
      
      // 继续播放下一片段
      setTimeout(() => playNext(index + 1), 10);
    }, Math.min(segments[index].length * 300 + 5000, 20000)); // 更智能的超时计算：每字符300ms+5秒基础时间，最长20秒
    
    // 设置完成回调
    utterance.onend = () => {
      clearTimeout(segmentTimeout);
      if (onSegmentEnd) onSegmentEnd(index, segments.length);
      lastSegmentIndex = index;
      
      // 立即开始下一片段，减少间隙感
      playNext(index + 1);
    };
    
    utterance.onerror = (event) => {
      clearTimeout(segmentTimeout);
      console.error(`片段 ${index + 1} 播放错误:`, event.error);
      
      // 尝试继续下一片段
      setTimeout(() => playNext(index + 1), 10);
    };
    
    // 播放当前片段
    try {
      // 播放前取消任何正在播放的内容
      if (index > 0) {
        synth.cancel();
      }
      
      synth.speak(utterance);
    } catch (error) {
      console.error(`播放片段 ${index + 1} 时出错:`, error);
      
      // 尝试继续下一片段
      setTimeout(() => playNext(index + 1), 10);
    }
  };
  
  // 开始播放第一个片段
  playNext(0);
  
  return { 
    cancel: cancelStreaming,
    segmentsCount: segments.length
  };
}

// 为Chrome、Safari和Firefox修复的speak函数
export function speakWithFix(text, voice = null, rate = 1.3, pitch = 1, onEnd = null) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.error("浏览器不支持语音合成");
      if (onEnd) onEnd();
      return false;
    }
    
    // 取消当前的语音
    synth.cancel();
    
    if (!text || text.trim() === '') {
      console.warn("无文本需要播放");
      if (onEnd) onEnd();
      return false;
    }
    
    // 创建语音对象
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置参数，默认使用更快的语速
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    // 如果提供了特定语音，使用它，否则尝试使用zh-CN
    if (voice) {
      utterance.voice = voice;
    } else {
      // 未指定语音时，尝试获取最佳中文语音
      const bestVoice = getBestTWVoice();
      if (bestVoice) {
        console.log(`使用最佳语音: ${bestVoice.name} (${bestVoice.lang})`);
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        // 仍然找不到合适语音，使用zh-CN
        console.warn("未找到合适的中文语音，使用默认zh-CN设置");
        utterance.lang = 'zh-CN';
      }
    }
    
    // 设置事件处理
    utterance.onstart = () => {
      console.log(`TTS开始播放: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`);
    };
    
    utterance.onend = () => {
      console.log("TTS播放完成");
      if (onEnd) {
        try {
          onEnd(); // 直接调用回调，不使用setTimeout
        } catch (e) {
          console.error("执行TTS onend回调时出错:", e);
        }
      }
    };
    
    utterance.onerror = (event) => {
      console.error("TTS播放错误:", event.error);
      if (onEnd) {
        try {
          onEnd(); // 直接调用回调，不使用setTimeout
        } catch (e) {
          console.error("执行TTS onerror回调时出错:", e);
        }
      }
    };
    
    // 使用定时器解决某些浏览器的语音问题，但减少延迟
    setTimeout(() => {
      try {
        synth.speak(utterance);
        console.log("TTS speak方法已调用");
        
        // Chrome bug: 有时不会触发onend事件，优化超时时间计算
        if (navigator.userAgent.indexOf('Chrome') !== -1) {
          // 更合理的超时计算策略
          // 基础时间 + 每字符时间
          let baseTimeout = 2000; // 增加基础超时
          let charTimeout = 300; // 增加每字符时间
          let maxDuration = baseTimeout + text.length * charTimeout; 
          
          // 限制最大超时时间，确保不超过Chrome的安全界限
          maxDuration = Math.min(maxDuration, 30000); // 增加最大超时到30秒
          
          // 限制最小超时时间
          maxDuration = Math.max(maxDuration, 3000); // 确保至少有3秒

          console.log(`[TtsPolyfill] speakWithFix: Calculated Chrome timeout: ${maxDuration}ms for ${text.length} chars`);
          
          setTimeout(() => {
            // 检查时需要确认 synth 对象仍然存在
            if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              console.log("Chrome安全超时：强制结束语音播放");
              synth.cancel();
              if (onEnd) {
                try {
                  onEnd(); // 直接调用回调
                } catch (e) {
                  console.error("执行TTS 超时回调时出错:", e);
                }
              }
            }
          }, maxDuration);
        }
        
        return true;
      } catch (error) {
        console.error("TTS播放执行出错:", error);
        if (onEnd) {
          try {
            onEnd(); // 直接调用回调
          } catch (e) {
            console.error("执行TTS 执行错误回调时出错:", e);
          }
        }
        return false;
      }
    }, 10); // 进一步减少到10ms
    
    return true;
  } catch (error) {
    console.error("TTS播放函数异常:", error);
    if (onEnd) {
      try {
        onEnd(); // 直接调用回调
      } catch (e) {
        console.error("执行TTS 函数异常回调时出错:", e);
      }
    }
    return false;
  }
}

const TtsPolyfill = {
  initTTS,
  getBestTWVoice,
  speakWithFix,
  speakStreaming,
  splitTextForStreaming
}; 

export default TtsPolyfill;