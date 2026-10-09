import React from 'react';
import ReactDOM from 'react-dom/client';

// 极简的测试组件
function SimpleApp() {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      color: '#333'
    }}>
      <h1>🎉 React渲染成功！</h1>
      <p>如果你能看到这个页面，说明React基本功能正常。</p>
      <button 
        onClick={() => alert('点击成功！')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4FD1C5',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          marginTop: '20px'
        }}
      >
        测试按钮
      </button>
    </div>
  );
}

// 直接渲染，不使用任何复杂的Context或异步加载
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('准备渲染简单的React应用...');
  
  root.render(<SimpleApp />);
  
  console.log('✅ 简单的React应用渲染完成！');
} catch (error) {
  console.error('❌ React渲染失败:', error);
} 