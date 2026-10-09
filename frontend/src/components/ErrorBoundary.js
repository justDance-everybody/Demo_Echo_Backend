import React from 'react';

/**
 * 错误边界组件
 * 用于捕获React渲染过程中的错误，防止整个应用崩溃
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新state，下次渲染将显示错误UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 可以将错误日志记录到服务
    console.error('组件错误:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      return (
        <div 
          style={{ padding: '20px', color: '#ff4d4f', backgroundColor: '#fff1f0', borderRadius: '4px', margin: '20px' }}
          data-testid="error-boundary-fallback"
        >
          <h2>应用遇到问题</h2>
          <p>我们正在努力解决这个问题，请稍后再试。</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>查看详细错误信息</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <div>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '10px', padding: '5px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#1890ff', color: 'white', cursor: 'pointer' }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    // 正常渲染子组件
    return this.props.children;
  }
}

export default ErrorBoundary; 