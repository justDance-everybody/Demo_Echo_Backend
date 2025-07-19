import React from 'react';
import { INTERACTION_STATES } from '../../config/constants';
import './StatusBar.css'; 

const StatusBar = ({ currentStatus }) => {

    const getStatusText = (status) => {
        switch (status) {
            case INTERACTION_STATES.IDLE:
                return '空闲，等待语音输入';
            case INTERACTION_STATES.LISTENING:
                return '正在监听...';
            case INTERACTION_STATES.THINKING:
                return '正在思考...';
            case INTERACTION_STATES.CONFIRMING:
                return '等待确认';
            case INTERACTION_STATES.EXECUTING:
                return '正在执行...';
            case INTERACTION_STATES.SPEAKING:
                return '正在播报...';
            case INTERACTION_STATES.ERROR:
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