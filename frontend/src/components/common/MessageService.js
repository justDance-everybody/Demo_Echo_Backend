import { Toast, Dialog } from 'antd-mobile';

/**
 * 全局消息服务
 * 提供统一的Toast、Dialog等消息提示功能
 */
class MessageService {
  /**
   * 显示Toast提示
   * @param {string} content 提示内容
   * @param {'success' | 'fail' | 'loading' | undefined} icon 图标类型
   * @param {number} duration 显示时长（毫秒）
   */
  static showToast(content, icon, duration = 2000) {
    Toast.show({
      content,
      icon,
      duration,
    });
  }

  /**
   * 显示成功提示
   * @param {string} content 提示内容
   * @param {number} duration 显示时长（毫秒）
   */
  static success(content, duration = 2000) {
    this.showToast(content, 'success', duration);
  }

  /**
   * 显示失败提示
   * @param {string} content 提示内容
   * @param {number} duration 显示时长（毫秒）
   */
  static error(content, duration = 2000) {
    this.showToast(content, 'fail', duration);
  }

  /**
   * 显示加载提示
   * @param {string} content 提示内容
   * @param {number} duration 显示时长，默认为0（不自动关闭）
   * @returns {() => void} 关闭提示的函数
   */
  static loading(content = '加载中...', duration = 0) {
    Toast.show({
      content,
      icon: 'loading',
      duration,
    });
    
    return () => Toast.clear();
  }

  /**
   * 显示确认对话框
   * @param {string} content 对话框内容
   * @param {string} title 对话框标题（可选）
   * @param {Object} options 其他选项
   * @returns {Promise<boolean>} 用户选择结果
   */
  static async confirm(content, title, options = {}) {
    try {
      const result = await Dialog.confirm({
        content,
        title,
        ...options,
      });
      
      return result; // 如果用户点击确认，返回true
    } catch (e) {
      return false; // 如果用户点击取消，返回false
    }
  }

  /**
   * 显示提示对话框（只有确认按钮）
   * @param {string} content 对话框内容
   * @param {string} title 对话框标题（可选）
   * @param {Object} options 其他选项
   * @returns {Promise<void>}
   */
  static async alert(content, title, options = {}) {
    await Dialog.alert({
      content,
      title,
      ...options,
    });
  }
}

export default MessageService; 