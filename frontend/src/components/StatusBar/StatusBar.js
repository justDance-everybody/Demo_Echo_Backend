import React from 'react';
import './StatusBar.css'; 

const StatusBar = ({ currentStatus }) => {

    const getStatusText = (status) => {
        switch (status) {
            case 'idle':
                return '空闲，等待语音输入';
            case 'listening':
                return '正在监听...';
            case 'thinking':
                return '正在思考...';
            case 'confirming':
                return '等待确认';
            case 'executing':
                return '正在执行...';
            case 'speaking':
                return '正在播报...';
            case 'error':
                return '发生错误，请重试';
            default:
                return '未知状态';
        }
    };

    return (
        <div className={`status-bar-container status-${currentStatus}`}>
            <p className="status-text">{getStatusText(currentStatus)}</p>
        </div>
    );
};

export default StatusBar; 