// frontend/src/components/__tests__/ToolsList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToolsList from '../ToolsList';
import apiClient from '../../services/apiClient';

// Mock API客户端
jest.mock('../../services/apiClient', () => ({
    getItems: jest.fn()
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

describe('ToolsList Component', () => {
    const mockOnToolSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockToolsData = {
        items: [
            {
                tool_id: 'tool1',
                name: '天气查询',
                description: '查询天气信息',
                type: 'http',
                tags: ['weather', 'system']
            },
            {
                tool_id: 'tool2',
                name: '音乐播放器',
                description: '播放音乐',
                type: 'mcp',
                tags: ['music', 'entertainment']
            }
        ],
        pagination: {
            current_page: 1,
            total_pages: 2,
            total_items: 5,
            page_size: 5,
            has_next: true,
            has_prev: false
        }
    };

    test('renders tools list with pagination info', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('天气查询')).toBeInTheDocument();
        });

        expect(screen.getByText('音乐播放器')).toBeInTheDocument();
        expect(screen.getByText('第 1 页 / 共 2 页')).toBeInTheDocument();
        expect(screen.getByText('共 5 个工具')).toBeInTheDocument();
        expect(screen.getByText('加载更多')).toBeInTheDocument();
    });

    test('handles tool selection', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('天气查询')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('天气查询'));
        expect(mockOnToolSelect).toHaveBeenCalledWith('tool1');
    });

    test('displays pull to refresh hint', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('天气查询')).toBeInTheDocument();
        });

        expect(screen.getByText('下拉刷新')).toBeInTheDocument();
    });

    test('handles load more functionality', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('加载更多')).toBeInTheDocument();
        });

        const loadMoreButton = screen.getByText('加载更多');

        // Mock下一页数据
        const nextPageData = {
            ...mockToolsData,
            items: [
                {
                    tool_id: 'tool3',
                    name: '翻译工具',
                    description: '文本翻译',
                    type: 'http',
                    tags: ['translate']
                }
            ],
            pagination: {
                ...mockToolsData.pagination,
                current_page: 2,
                has_next: false
            }
        };

        apiClient.getItems.mockResolvedValueOnce(nextPageData);
        fireEvent.click(loadMoreButton);

        await waitFor(() => {
            expect(apiClient.getItems).toHaveBeenCalledWith(2, 5); // 第2页，每页5个
        });
    });

    test('displays error message and fallback data on API failure', async () => {
        const mockError = new Error('API请求失败');
        apiClient.getItems.mockRejectedValue(mockError);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText(/API请求失败/)).toBeInTheDocument();
        });

        // 应该显示备用数据
        expect(screen.getByText('天气查询')).toBeInTheDocument();
        expect(screen.getByText('日程管理')).toBeInTheDocument();
    });

    test('shows loading state correctly', async () => {
        // Mock一个延迟的Promise
        let resolvePromise;
        const delayedPromise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        apiClient.getItems.mockReturnValue(delayedPromise);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        // 应该显示加载状态
        expect(screen.getByText('加载中...')).toBeInTheDocument();

        // 解决Promise
        resolvePromise(mockToolsData);

        await waitFor(() => {
            expect(screen.getByText('天气查询')).toBeInTheDocument();
        });
    });

    test('displays end message when no more pages', async () => {
        const lastPageData = {
            ...mockToolsData,
            pagination: {
                ...mockToolsData.pagination,
                has_next: false
            }
        };

        apiClient.getItems.mockResolvedValue(lastPageData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('已显示全部工具')).toBeInTheDocument();
            expect(screen.queryByText('加载更多')).not.toBeInTheDocument();
        });
    });

    test('displays tool type badges correctly', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('HTTP接口')).toBeInTheDocument();
        });

        expect(screen.getByText('MCP工具')).toBeInTheDocument();
    });

    test('displays tool tags correctly', async () => {
        apiClient.getItems.mockResolvedValue(mockToolsData);

        render(<ToolsList onToolSelect={mockOnToolSelect} />);

        await waitFor(() => {
            expect(screen.getByText('weather')).toBeInTheDocument();
        });

        expect(screen.getByText('system')).toBeInTheDocument();
        expect(screen.getByText('music')).toBeInTheDocument();
        expect(screen.getByText('entertainment')).toBeInTheDocument();
    });
}); 