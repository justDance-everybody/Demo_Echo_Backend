import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const DebugPage = () => {
    const { isAuthenticated, user, role, token } = useContext(AuthContext);

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
            <h1>调试信息</h1>
            <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
                <h2>认证状态:</h2>
                <p><strong>isAuthenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
                <p><strong>role:</strong> {role || 'null'}</p>
                <p><strong>token:</strong> {token ? token.substring(0, 20) + '...' : 'null'}</p>

                <h2>用户信息:</h2>
                <pre>{JSON.stringify(user, null, 2)}</pre>

                <h2>localStorage:</h2>
                <p><strong>token:</strong> {localStorage.getItem('token') || 'null'}</p>
                <p><strong>userRole:</strong> {localStorage.getItem('userRole') || 'null'}</p>

                <h2>环境变量:</h2>
                <p><strong>REACT_APP_USE_MOCKS:</strong> {process.env.REACT_APP_USE_MOCKS || 'undefined'}</p>
                <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'undefined'}</p>
            </div>
        </div>
    );
};

export default DebugPage; 