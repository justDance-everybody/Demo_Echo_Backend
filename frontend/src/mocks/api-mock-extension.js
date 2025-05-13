/**
 * 前端测试 API Mock 扩展
 * 
 * 扩展现有的mock模块，添加测试专用的模拟数据和响应
 */

/**
 * 为测试框架扩展API mock
 * @param {Object} api - 现有的API mock实例
 */
export const extendApiMock = (api) => {
  // 原始mock模块会处理基本的API模拟
  // 这里添加测试专用的边缘情况和错误处理
  
  // 拦截interpret API调用
  const originalInterpret = api.mockHandlers?.interpret;
  api.mockResolvedValue('interpret', async (data) => {
    // 检查是否是测试专用请求
    if (data.text?.includes('不存在的功能')) {
      return {
        success: false,
        error: {
          code: 'TEST_UNKNOWN_INTENT',
          message: '无法理解您的请求'
        }
      };
    }
    
    // 否则交给原始处理器
    if (originalInterpret) {
      return await originalInterpret(data);
    }
    
    // 默认响应
    return {
      type: 'confirm',
      action: 'test_action',
      params: { test: true },
      confirmText: '这是测试模式下的默认确认文本。'
    };
  });
  
  // 拦截execute API调用
  const originalExecute = api.mockHandlers?.execute;
  api.mockResolvedValue('execute', async (data) => {
    // 检查是否是测试专用请求
    if (data.action === 'test_error') {
      return {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: '这是一个测试错误响应'
        }
      };
    }
    
    // 否则交给原始处理器
    if (originalExecute) {
      return await originalExecute(data);
    }
    
    // 默认响应
    return {
      success: true,
      data: {
        testResult: '这是测试模式下的默认执行结果'
      },
      message: '测试执行成功'
    };
  });
  
  // 添加测试专用API调用
  api.mockResolvedValue('testHealth', async () => {
    return {
      status: 'ok',
      message: '测试API正常工作',
      timestamp: new Date().toISOString()
    };
  });
  
  console.log('🔧 API Mock已扩展，添加了测试专用API模拟');
  
  return api;
};

export default extendApiMock; 