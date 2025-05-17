import MessageService from '../components/common/MessageService';

/**
 * 全局错误处理服务
 */
class ErrorService {
  /**
   * 默认错误处理函数
   * @param {Error|Object} error 错误对象
   * @param {boolean} showToast 是否显示Toast
   * @returns {string} 错误消息
   */
  static handleError(error, showToast = true) {
    let errorMessage = '发生未知错误，请重试';

    // 处理各种类型的错误
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || '发生未知错误，请重试';
    } else if (error && error.message) {
      errorMessage = error.message;
    } else if (error && error.data && error.data.message) {
      errorMessage = error.data.message;
    } else if (error && error.response) {
      // Axios 错误
      const { status, data } = error.response;

      if (status === 401) {
        errorMessage = '登录已过期，请重新登录';
        // 可以在这里添加重定向到登录页的逻辑
      } else if (status === 403) {
        errorMessage = '无权限执行此操作';
      } else if (status === 404) {
        errorMessage = '请求的资源不存在';
      } else if (status === 500) {
        errorMessage = '服务器错误，请稍后再试';
      } else if (data && data.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `请求失败 (${status})`;
      }
    }

    // 显示错误提示
    if (showToast) {
      MessageService.error(errorMessage);
    }

    // 记录到控制台
    console.error('Error:', error);

    return errorMessage;
  }

  /**
   * 处理API错误
   * @param {Error|Object} error API错误对象
   * @param {boolean} showToast 是否显示Toast
   * @returns {string} 错误消息
   */
  static handleApiError(error, showToast = true) {
    return this.handleError(error, showToast);
  }

  /**
   * 处理表单验证错误
   * @param {Object} errors 表单错误对象
   * @param {boolean} showToast 是否显示Toast
   * @returns {Object} 处理后的错误对象
   */
  static handleFormErrors(errors, showToast = true) {
    if (showToast && errors && Object.keys(errors).length > 0) {
      // 显示第一个错误
      const firstError = Object.values(errors)[0];
      if (firstError) {
        MessageService.error(firstError);
      }
    }
    return errors;
  }

  /**
   * 处理网络错误
   * @param {Error} error 网络错误对象
   * @param {boolean} showToast 是否显示Toast
   * @returns {string} 错误消息
   */
  static handleNetworkError(error, showToast = true) {
    let message = '网络连接失败，请检查网络';
    
    if (error && error.message === 'Network Error') {
      message = '网络连接失败，请检查网络';
    } else if (error && error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试';
    }
    
    if (showToast) {
      MessageService.error(message);
    }
    
    return message;
  }
}

export default ErrorService; 