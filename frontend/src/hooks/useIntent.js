import { useState, useCallback } from 'react';

/**
 * 意图分类的自定义Hook
 * 用于将用户语音输入分类为确认、重试或取消
 * @returns {Object} 意图分类相关的状态和方法
 */
const useIntent = () => {
  const [intent, setIntent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastText, setLastText] = useState(''); // 存储上一次处理的文本
  const [lastConfirmAt, setLastConfirmAt] = useState(0); // 记录上次确认的时间戳

  /**
   * 根据输入文本识别用户意图
   * @param {string} text - 用户语音转换成的文本
   * @param {string} originalQuery - 原始查询文本，用于比较防止误认为确认
   * @returns {string} 识别出的意图: 'CONFIRM', 'RETRY', 'CANCEL'
   */
  const classifyIntent = useCallback((text, originalQuery = '') => {
    if (isProcessing) {
      console.log("已经在处理意图分类，跳过", text);
      return null;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // 检查空文本
      if (!text) {
        console.log("意图分类收到空文本");
        setIntent(null);
        setIsProcessing(false);
        return null;
      }

      // 规范化文本进行比较
      const normalizedText = text.trim().toLowerCase();
      const normalizedOriginal = originalQuery.trim().toLowerCase();
      
      // 防止处理重复文本（在短时间内）
      const now = Date.now();
      if (normalizedText === lastText && now - lastConfirmAt < 2000) {
        console.log("忽略在2秒内重复的文本:", text);
        setIsProcessing(false);
        return "IGNORE"; // 特殊状态，表示应忽略此输入
      }
      
      // 防止将原始查询误认为确认回复
      if (normalizedText === normalizedOriginal) {
        console.log("收到与原始查询相同的文本，判断为回声:", normalizedText);
        setIsProcessing(false);
        
        // 如果距离上次处理相同文本已经过了足够时间，则可能是用户故意重复，应作为确认处理
        if (now - lastConfirmAt > 5000) {
          console.log("但距离上次确认已超过5秒，视为有效确认");
          setLastText(normalizedText);
          setLastConfirmAt(now);
          setIntent("CONFIRM");
          return "CONFIRM";
        }
        
        return "IGNORE";
      }
      
      // 确认词语匹配
      const confirmPhrases = ['是', '好', '好的', '确认', '对', '对的', '可以', '没错', '确定', '是的', '同意', '继续', 'ok', '可', '好啊', '行', '没问题', '准确'];
      const retryPhrases = ['重新', '重试', '换个', '换一个', '重说', '不对', '错了', '不准确', '不是这个', '错误'];
      const cancelPhrases = ['取消', '停止', '算了', 'forget it', '不用了', '关闭', '退出', '结束', '不要', '不行'];
      
      // 意图匹配
      const hasConfirm = confirmPhrases.some(phrase => normalizedText.includes(phrase));
      const hasRetry = retryPhrases.some(phrase => normalizedText.includes(phrase));
      const hasCancel = cancelPhrases.some(phrase => normalizedText.includes(phrase));
      
      let result = null;
      
      // 优先级: 取消 > 重试 > 确认
      if (hasCancel) {
        console.log("匹配到取消关键词");
        result = "CANCEL";
      } else if (hasRetry) {
        console.log("匹配到重试关键词");
        result = "RETRY";
      } else if (hasConfirm) {
        console.log("匹配到确认关键词");
        result = "CONFIRM";
      } else if (normalizedText.length > 15) {
        // 对于较长的文本，谨慎判断，可能是用户提出的新问题
        console.log("未匹配到意图关键词，且文本较长，可能是新问题，使用默认行为");
        result = "RETRY"; // 长文本默认作为重试/新查询处理
      } else {
        // 对于较短的非匹配文本，默认视为确认
        console.log("短文本未匹配到关键词，默认为确认");
        result = "CONFIRM";
      }
      
      // 更新状态
      setIntent(result);
      setLastText(normalizedText);
      setLastConfirmAt(now);
      setIsProcessing(false);
      
      return result;
    } catch (err) {
      console.error("意图分类过程中出现错误:", err);
      setError(err.message);
      setIsProcessing(false);
      return null;
    }
  }, [isProcessing, lastText, lastConfirmAt]);

  /**
   * 重置意图分类状态
   */
  const resetIntent = useCallback(() => {
    setIntent(null);
    setIsProcessing(false);
    setError(null);
    setLastText('');
    setLastConfirmAt(0);
  }, []);

  return {
    intent,
    isProcessing,
    error,
    classifyIntent,
    resetIntent
  };
};

export default useIntent; 