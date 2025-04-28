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

  /**
   * 根据输入文本识别用户意图
   * @param {string} text - 用户语音转换成的文本
   * @returns {string} 识别出的意图: 'CONFIRM', 'RETRY', 'CANCEL'
   */
  const classifyIntent = useCallback((text) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const normalizedText = text.toLowerCase().trim();
      
      // 确认意图的关键词
      const confirmKeywords = [
        '确认', '是的', '好的', '可以', '确定', '正确', 
        '对', '没错', '嗯', '继续', '执行', '同意', '确信',
        '接受', '是', '好', '行', '同意', '对的', 'yes', 'ok', 'confirm'
      ];
      
      // 重试意图的关键词
      const retryKeywords = [
        '重试', '再说一次', '重新', '我想重来', '不对', '错了', 
        '不正确', '不是这样', '修改', '改变', '换', '再试一次',
        '不是', '错误', '重新开始', '重来', '重头来', 'retry', 'restart'
      ];
      
      // 取消意图的关键词
      const cancelKeywords = [
        '取消', '不要', '停止', '算了', '放弃', '终止', 
        '退出', '中断', '不需要', '不用了', '停下', '中止',
        '不做了', '不执行', '不用', '别', '取消', 'cancel', 'stop'
      ];
      
      // 检查关键词匹配
      if (confirmKeywords.some(keyword => normalizedText.includes(keyword))) {
        setIntent('CONFIRM');
        setIsProcessing(false);
        return 'CONFIRM';
      } else if (retryKeywords.some(keyword => normalizedText.includes(keyword))) {
        setIntent('RETRY');
        setIsProcessing(false);
        return 'RETRY';
      } else if (cancelKeywords.some(keyword => normalizedText.includes(keyword))) {
        setIntent('CANCEL');
        setIsProcessing(false);
        return 'CANCEL';
      } else {
        // 默认为确认意图，如果不明确表示重试或取消
        setIntent('CONFIRM');
        setIsProcessing(false);
        return 'CONFIRM';
      }
    } catch (err) {
      console.error('意图分类错误:', err);
      setError('意图分类失败');
      setIsProcessing(false);
      return null;
    }
  }, []);

  /**
   * 重置意图分类状态
   */
  const resetIntent = useCallback(() => {
    setIntent(null);
    setIsProcessing(false);
    setError(null);
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