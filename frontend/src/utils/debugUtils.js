// 调试工具函数

/**
 * 检查和清理文本数据，处理可能的编码问题
 * @param {any} data - 要检查的数据
 * @param {string} label - 数据标签，用于日志
 * @returns {string} 清理后的文本
 */
export const debugAndCleanText = (data, label = 'Unknown') => {
  console.group(`🔍 调试文本数据: ${label}`);
  
  try {
    console.log('原始数据类型:', typeof data);
    console.log('原始数据:', data);
    
    if (!data) {
      console.log('❌ 数据为空或未定义');
      console.groupEnd();
      return '';
    }
    
    let textData = data;
    
    // 如果是对象，尝试提取文本字段
    if (typeof data === 'object') {
      console.log('📦 检测到对象，尝试提取文本字段...');
      textData = data.confirm_text || data.confirmText || data.message || data.content || data.text;
      
      if (!textData) {
        console.log('⚠️ 对象中未找到常见文本字段，使用JSON字符串');
        textData = JSON.stringify(data, null, 2);
      }
      
      console.log('提取的文本字段:', textData);
    }
    
    // 转换为字符串
    let cleanText = String(textData);
    console.log('转换为字符串后:', cleanText);
    
    // 检查是否包含JSON
    if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
      try {
        console.log('🔄 尝试解析JSON...');
        const parsed = JSON.parse(cleanText);
        console.log('解析的JSON对象:', parsed);
        
        // 从解析的对象中提取文本
        const extractedText = parsed.confirm_text || parsed.confirmText || parsed.message || parsed.content || parsed.text;
        if (extractedText) {
          cleanText = extractedText;
          console.log('✅ 从JSON中提取的文本:', cleanText);
        } else {
          console.log('⚠️ JSON中未找到文本字段，使用格式化JSON');
          cleanText = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        console.log('❌ JSON解析失败:', e.message);
      }
    }
    
    // 检查编码问题
    console.log('🔤 检查编码问题...');
    const originalLength = cleanText.length;
    
    // 移除控制字符
    cleanText = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // 尝试处理可能的编码问题
    try {
      const decoded = decodeURIComponent(escape(cleanText));
      if (decoded !== cleanText) {
        console.log('🔧 检测到编码问题，已修复');
        console.log('修复前:', cleanText);
        console.log('修复后:', decoded);
        cleanText = decoded;
      }
    } catch (e) {
      console.log('⚠️ 编码修复失败:', e.message);
    }
    
    // 清理多余空白
    cleanText = cleanText.trim().replace(/\s+/g, ' ');
    
    console.log('📏 长度变化:', originalLength, '->', cleanText.length);
    console.log('✨ 最终清理结果:', cleanText);
    
    // 检查是否包含乱码特征
    const hasGarbledChars = /[\uFFFD\u0000-\u001F\u007F-\u009F]/.test(cleanText);
    const hasUnusualChars = /[^\u0000-\u007F\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(cleanText);
    
    if (hasGarbledChars) {
      console.warn('⚠️ 检测到替换字符或控制字符，可能存在编码问题');
    }
    
    if (hasUnusualChars) {
      console.warn('⚠️ 检测到异常字符，可能存在编码问题');
    }
    
    console.groupEnd();
    return cleanText || '确认执行此操作吗？';
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
    console.groupEnd();
    return '确认执行此操作吗？';
  }
};

/**
 * 记录API响应数据
 * @param {any} response - API响应
 * @param {string} apiName - API名称
 */
export const logApiResponse = (response, apiName = 'Unknown API') => {
  console.group(`📡 API响应调试: ${apiName}`);
  
  try {
    console.log('响应对象:', response);
    console.log('响应类型:', typeof response);
    
    if (response && typeof response === 'object') {
      console.log('响应键:', Object.keys(response));
      
      // 检查常见的文本字段
      const textFields = ['confirm_text', 'confirmText', 'message', 'content', 'text', 'data'];
      textFields.forEach(field => {
        if (response[field]) {
          console.log(`${field}:`, response[field]);
          debugAndCleanText(response[field], `${apiName}.${field}`);
        }
      });
    }
    
  } catch (error) {
    console.error('记录API响应时出错:', error);
  }
  
  console.groupEnd();
};

/**
 * 检查字符串是否包含乱码
 * @param {string} text - 要检查的文本
 * @returns {boolean} 是否包含乱码
 */
export const hasGarbledText = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // 检查替换字符
  if (text.includes('\uFFFD') || text.includes('�')) {
    return true;
  }
  
  // 检查异常的字节序列
  const garbledPatterns = [
    /\\x[0-9a-fA-F]{2}/,  // 十六进制转义序列
    /\\u[0-9a-fA-F]{4}/,  // Unicode转义序列
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/, // 控制字符
  ];
  
  return garbledPatterns.some(pattern => pattern.test(text));
};

export default {
  debugAndCleanText,
  logApiResponse,
  hasGarbledText
};