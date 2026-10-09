import React from 'react';

const SimpleTestPage = () => {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>✅ React 渲染测试成功！</h1>
      <p style={{ color: '#666', fontSize: '18px' }}>如果你能看到这个页面，说明React应用运行正常。</p>
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => alert('按钮点击正常工作！')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4FD1C5',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          点击测试
        </button>
      </div>
      <p style={{ marginTop: '20px', color: '#999' }}>
        当前时间: {new Date().toLocaleString()}
      </p>
    </div>
  );
};

export default SimpleTestPage; 