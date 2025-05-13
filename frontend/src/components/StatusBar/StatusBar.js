import React from 'react';
import './StatusBar.css'; 

const StatusBar = ({ currentStatus }) => {

    const getStatusText = (status) => {
        switch (status) {
            case 'idle':
                return '空闲，等待语音输入';
            case 'listening':
                return '正在听您说话...';
            case 'thinking':
                return '正在理解您的指令...';
            case 'confirming':
                return '请确认操作...';
            case 'executing':
                return '正在执行操作...';
            case 'speaking':
                return '正在播报结果...';
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