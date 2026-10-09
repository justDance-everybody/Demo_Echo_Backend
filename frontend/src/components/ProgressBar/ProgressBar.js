import React from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

// 定义五个阶段 - 对应SessionStages
const STAGES = [
    { key: 'listening', label: '识别中', icon: '🎤' },
    { key: 'interpreting', label: '理解中', icon: '🧠' },
    { key: 'confirming', label: '确认中', icon: '❓' },
    { key: 'executing', label: '执行中', icon: '⚙️' },
    { key: 'result', label: '完成', icon: '✅' }
];

/**
 * 进度条组件
 * @param {Object} props - 组件属性
 * @param {string} props.currentStage - 当前阶段 ('listening', 'interpreting', 'confirming', 'executing', 'result', 'idle')
 * @param {boolean} props.visible - 是否显示进度条
 * @param {string} props.className - 额外的CSS类名
 * @param {Object} props.customLabels - 自定义阶段标签
 */
const ProgressBar = ({
    currentStage = 'idle',
    visible = true,
    className = '',
    customLabels = {}
}) => {
    // 如果不可见或处于idle状态，不渲染组件
    if (!visible || currentStage === 'idle') {
        return null;
    }

    // 获取当前阶段的索引
    const getCurrentStageIndex = () => {
        const index = STAGES.findIndex(stage => stage.key === currentStage);
        return index >= 0 ? index : 0;
    };

    const currentStageIndex = getCurrentStageIndex();

    // 计算进度百分比
    const getProgressPercentage = () => {
        if (currentStage === 'result') {
            return 100;
        }
        return ((currentStageIndex + 1) / STAGES.length) * 100;
    };

    const progressPercentage = getProgressPercentage();

    return (
        <motion.div
            className={`progress-bar-container ${className}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            data-testid="progress-bar"
        >
            {/* 进度条背景 */}
            <div className="progress-bar-track">
                {/* 进度条填充 */}
                <motion.div
                    className="progress-bar-fill"
                    data-testid="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>

            {/* 阶段指示器 */}
            <div className="progress-stages">
                {STAGES.map((stage, index) => {
                    const isActive = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const isCompleted = index < currentStageIndex || currentStage === 'result';

                    return (
                        <motion.div
                            key={stage.key}
                            className={`progress-stage ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{
                                scale: isCurrent ? 1.1 : 1,
                                opacity: isActive ? 1 : 0.5
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* 阶段图标 */}
                            <div className="stage-icon">
                                {isCompleted ? '✅' : stage.icon}
                            </div>

                            {/* 阶段标签 */}
                            <div className="stage-label">
                                {customLabels[stage.key] || stage.label}
                            </div>

                            {/* 当前阶段的动画指示器 */}
                            {isCurrent && currentStage !== 'result' && (
                                <motion.div
                                    className="stage-pulse"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* 当前阶段描述 */}
            <motion.div
                className="progress-description"
                key={currentStage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {currentStage === 'listening' && '正在识别您的语音...'}
                {currentStage === 'interpreting' && '正在理解您的意图...'}
                {currentStage === 'confirming' && '等待您的确认...'}
                {currentStage === 'executing' && '正在执行操作...'}
                {currentStage === 'result' && '操作已完成！'}
            </motion.div>
        </motion.div>
    );
};

export default ProgressBar; 