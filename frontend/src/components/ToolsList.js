import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../services/apiClient';
import './ToolsList.css';

const ToolsList = ({ onToolSelect }) => {
    const [tools, setTools] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        page_size: 5, // 每页显示5个工具
        has_next: false,
        has_prev: false
    });

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // 下拉刷新相关状态
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [startY, setStartY] = useState(0);

    // 下拉刷新配置
    const PULL_THRESHOLD = 80; // 触发刷新的下拉距离
    const MAX_PULL_DISTANCE = 120; // 最大下拉距离

    // 获取工具列表
    const fetchTools = useCallback(async (page = 1, isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const result = await apiClient.getItems(page, pagination.page_size);

            if (page === 1 || isRefresh) {
                // 刷新或第一页，替换数据
                setTools(result.items);
            } else {
                // 加载更多，追加数据
                setTools(prevTools => [...prevTools, ...result.items]);
            }

            setPagination(result.pagination);
        } catch (error) {
            console.error('获取工具列表失败:', error);
            setError(error.message || '获取工具列表失败');

            // 如果是第一次加载失败，使用备用数据
            if (page === 1 && tools.length === 0) {
                const fallbackTools = [
                    {
                        tool_id: 'maps_weather',
                        name: '天气查询',
                        description: '查询指定城市的天气情况',
                        type: 'http',
                        tags: ['weather', 'system']
                    },
                    {
                        tool_id: 'calendar',
                        name: '日程管理',
                        description: '查看和管理日程安排',
                        type: 'http',
                        tags: ['calendar', 'system']
                    }
                ];
                setTools(fallbackTools);
                setPagination({
                    current_page: 1,
                    total_pages: 1,
                    total_items: fallbackTools.length,
                    page_size: pagination.page_size,
                    has_next: false,
                    has_prev: false
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [pagination.page_size, tools.length]);

    // 下拉刷新
    const handleRefresh = useCallback(async () => {
        await fetchTools(1, true);
        // 重置下拉状态
        setPullDistance(0);
        setIsPulling(false);
    }, [fetchTools]);

    // 处理触摸开始
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1) {
            setStartY(e.touches[0].clientY);
            setIsPulling(false);
        }
    }, []);

    // 处理触摸移动
    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 1 && !refreshing && !loading) {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            // 只有在列表顶部且向下拉时才处理
            const container = e.currentTarget;
            const isAtTop = container.scrollTop === 0;

            if (isAtTop && diff > 0) {
                e.preventDefault(); // 阻止默认滚动行为
                setIsPulling(true);

                // 计算下拉距离，添加阻尼效果
                const dampedDistance = Math.min(diff * 0.5, MAX_PULL_DISTANCE);
                setPullDistance(dampedDistance);
            }
        }
    }, [startY, refreshing, loading, MAX_PULL_DISTANCE]);

    // 处理触摸结束
    const handleTouchEnd = useCallback(() => {
        if (isPulling) {
            if (pullDistance >= PULL_THRESHOLD) {
                // 触发刷新
                handleRefresh();
            } else {
                // 重置状态
                setPullDistance(0);
                setIsPulling(false);
            }
        }
    }, [isPulling, pullDistance, PULL_THRESHOLD, handleRefresh]);

    // 添加鼠标事件支持（用于桌面端测试）
    const handleMouseDown = useCallback((e) => {
        setStartY(e.clientY);
        setIsPulling(false);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (e.buttons === 1 && !refreshing && !loading) { // 左键按下时
            const currentY = e.clientY;
            const diff = currentY - startY;

            const container = e.currentTarget;
            const isAtTop = container.scrollTop === 0;

            if (isAtTop && diff > 0) {
                e.preventDefault();
                setIsPulling(true);

                const dampedDistance = Math.min(diff * 0.3, MAX_PULL_DISTANCE);
                setPullDistance(dampedDistance);
            }
        }
    }, [startY, refreshing, loading, MAX_PULL_DISTANCE]);

    const handleMouseUp = useCallback(() => {
        if (isPulling) {
            if (pullDistance >= PULL_THRESHOLD) {
                handleRefresh();
            } else {
                setPullDistance(0);
                setIsPulling(false);
            }
        }
    }, [isPulling, pullDistance, PULL_THRESHOLD, handleRefresh]);

    // 加载更多
    const handleLoadMore = useCallback(async () => {
        if (!loading && pagination.has_next) {
            await fetchTools(pagination.current_page + 1);
        }
    }, [loading, pagination.has_next, pagination.current_page, fetchTools]);

    // 初始加载
    useEffect(() => {
        fetchTools(1);
    }, []);

    return (
        <div className="tools-list-container">
            <div className="tools-list-header">
                <h2>可用工具</h2>
                <span className="pull-hint">下拉刷新</span>
            </div>

            {error && (
                <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <span>⚠️ {error}</span>
                    <button onClick={() => handleRefresh()} className="retry-btn">
                        重试
                    </button>
                </motion.div>
            )}

            {/* 下拉刷新指示器 */}
            <motion.div
                className="pull-refresh-indicator"
                style={{
                    height: pullDistance,
                    opacity: isPulling ? 1 : 0
                }}
                animate={{
                    height: refreshing ? PULL_THRESHOLD : pullDistance
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="pull-refresh-content">
                    {refreshing ? (
                        <>
                            <div className="loading-spinner small"></div>
                            <span>正在刷新...</span>
                        </>
                    ) : (
                        <>
                            <motion.div
                                className="pull-icon"
                                animate={{
                                    rotate: pullDistance >= PULL_THRESHOLD ? 180 : 0
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                ↓
                            </motion.div>
                            <span>
                                {pullDistance >= PULL_THRESHOLD ? '释放刷新' : '下拉刷新'}
                            </span>
                        </>
                    )}
                </div>
            </motion.div>

            <div
                className="tools-list"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <AnimatePresence mode="popLayout">
                    {tools.map((tool, index) => (
                        <motion.div
                            key={tool.tool_id}
                            className="tool-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onToolSelect && onToolSelect(tool.tool_id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="tool-content">
                                <h3 className="tool-name">{tool.name}</h3>
                                <p className="tool-description">{tool.description}</p>
                                <div className="tool-meta">
                                    <span className={`tool-type ${tool.type}`}>
                                        {tool.type === 'mcp' ? 'MCP工具' : 'HTTP接口'}
                                    </span>
                                    <div className="tool-tags">
                                        {tool.tags && tool.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="tool-tag">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="tool-action">
                                <span className="arrow">→</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        className="loading-item"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="loading-spinner"></div>
                        <span>加载中...</span>
                    </motion.div>
                )}
            </div>

            {/* 分页控制 */}
            <div className="pagination-controls">
                <div className="pagination-info">
                    <span className="page-info">
                        第 {pagination.current_page} 页 / 共 {pagination.total_pages} 页
                    </span>
                    <span className="total-info">
                        共 {pagination.total_items} 个工具
                    </span>
                </div>

                {pagination.has_next && (
                    <motion.button
                        className="load-more-btn"
                        onClick={handleLoadMore}
                        disabled={loading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner small"></div>
                                加载中...
                            </>
                        ) : (
                            '加载更多'
                        )}
                    </motion.button>
                )}

                {!pagination.has_next && tools.length > 0 && (
                    <div className="end-message">
                        已显示全部工具
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolsList; 