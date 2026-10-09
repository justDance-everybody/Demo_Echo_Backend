import React, { useState, useEffect } from 'react';
import ProgressBar from './ProgressBar';

/**
 * 进度条演示组件
 * 用于展示进度条的各个阶段和功能
 */
const ProgressBarDemo = () => {
    const [currentStage, setCurrentStage] = useState('idle');
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);

    const stages = ['listening', 'thinking', 'executing', 'completed'];

    // 自动播放演示
    useEffect(() => {
        let interval;
        if (isAutoPlaying) {
            let stageIndex = 0;
            setCurrentStage(stages[0]);

            interval = setInterval(() => {
                stageIndex = (stageIndex + 1) % (stages.length + 1);
                if (stageIndex === stages.length) {
                    setCurrentStage('idle');
                    setTimeout(() => {
                        setCurrentStage(stages[0]);
                        stageIndex = 0;
                    }, 2000);
                } else {
                    setCurrentStage(stages[stageIndex]);
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAutoPlaying]);

    const handleStageChange = (stage) => {
        setIsAutoPlaying(false);
        setCurrentStage(stage);
    };

    const toggleAutoPlay = () => {
        setIsAutoPlaying(!isAutoPlaying);
        if (!isAutoPlaying) {
            setCurrentStage('listening');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
                进度条组件演示
            </h2>

            {/* 进度条展示 */}
            <div style={{ marginBottom: '40px' }}>
                <ProgressBar
                    currentStage={currentStage}
                    visible={currentStage !== 'idle'}
                />
            </div>

            {/* 控制按钮 */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'center',
                marginBottom: '30px'
            }}>
                <button
                    onClick={() => handleStageChange('idle')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        background: currentStage === 'idle' ? '#4fd1c5' : '#e0e0e0',
                        color: currentStage === 'idle' ? 'white' : '#333',
                        cursor: 'pointer',
                        fontWeight: currentStage === 'idle' ? 'bold' : 'normal'
                    }}
                >
                    隐藏 (idle)
                </button>

                {stages.map(stage => (
                    <button
                        key={stage}
                        onClick={() => handleStageChange(stage)}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            background: currentStage === stage ? '#4fd1c5' : '#e0e0e0',
                            color: currentStage === stage ? 'white' : '#333',
                            cursor: 'pointer',
                            fontWeight: currentStage === stage ? 'bold' : 'normal'
                        }}
                    >
                        {stage === 'listening' && '识别中'}
                        {stage === 'thinking' && '理解中'}
                        {stage === 'executing' && '执行中'}
                        {stage === 'completed' && '完成'}
                    </button>
                ))}

                <button
                    onClick={toggleAutoPlay}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        background: isAutoPlaying ? '#ff5252' : '#38a169',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isAutoPlaying ? '停止自动播放' : '开始自动播放'}
                </button>
            </div>

            {/* 功能说明 */}
            <div style={{
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6'
            }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>功能特点:</h3>
                <ul style={{ marginBottom: 0, color: '#666' }}>
                    <li>✅ 四阶段进度展示：识别中 → 理解中 → 执行中 → 完成</li>
                    <li>✅ 流畅的动画过渡效果</li>
                    <li>✅ 当前阶段高亮显示</li>
                    <li>✅ 已完成阶段显示绿色勾号</li>
                    <li>✅ 当前阶段脉搏动画效果</li>
                    <li>✅ 响应式设计，适配移动端</li>
                    <li>✅ 支持自定义标签和样式</li>
                    <li>✅ idle状态自动隐藏</li>
                </ul>
            </div>

            {/* 使用示例 */}
            <div style={{
                marginTop: '30px',
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px'
            }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>使用示例:</h3>
                <pre style={{
                    background: '#fff',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto',
                    fontSize: '13px',
                    color: '#333'
                }}>
                    {`import ProgressBar from './components/ProgressBar/ProgressBar';

// 基本使用
<ProgressBar currentStage="thinking" />

// 自定义标签
<ProgressBar 
  currentStage="executing"
  customLabels={{
    listening: '语音识别',
    thinking: '智能分析',
    executing: '任务执行',
    completed: '任务完成'
  }}
/>

// 自定义样式
<ProgressBar 
  currentStage="completed"
  className="my-custom-progress"
  visible={true}
/>`}
                </pre>
            </div>
        </div>
    );
};

export default ProgressBarDemo; 