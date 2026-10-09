import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('NotFoundPage组件', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    test('应该渲染默认的404页面内容', () => {
        renderWithRouter(<NotFoundPage />);

        expect(screen.getByText('页面未找到')).toBeInTheDocument();
        expect(screen.getByText('抱歉，您访问的页面不存在。可能已被移动或删除。')).toBeInTheDocument();
    });

    test('应该渲染自定义的标题和描述', () => {
        const customTitle = '自定义标题';
        const customDescription = '自定义描述内容';

        renderWithRouter(
            <NotFoundPage title={customTitle} description={customDescription} />
        );

        expect(screen.getByText(customTitle)).toBeInTheDocument();
        expect(screen.getByText(customDescription)).toBeInTheDocument();
    });

    test('应该渲染搜索输入框和按钮', () => {
        renderWithRouter(<NotFoundPage />);

        const searchInput = screen.getByPlaceholderText('搜索页面或内容...');
        const searchButton = screen.getByText('搜索');

        expect(searchInput).toBeInTheDocument();
        expect(searchButton).toBeInTheDocument();
        expect(searchButton).toBeDisabled(); // 初始状态下应该是禁用的
    });

    test('输入搜索内容后搜索按钮应该启用', () => {
        renderWithRouter(<NotFoundPage />);

        const searchInput = screen.getByPlaceholderText('搜索页面或内容...');
        const searchButton = screen.getByText('搜索');

        fireEvent.change(searchInput, { target: { value: '测试搜索' } });

        expect(searchButton).not.toBeDisabled();
    });

    test('点击搜索按钮应该导航到首页并带有搜索参数', () => {
        renderWithRouter(<NotFoundPage />);

        const searchInput = screen.getByPlaceholderText('搜索页面或内容...');
        const searchButton = screen.getByText('搜索');

        fireEvent.change(searchInput, { target: { value: '测试搜索' } });
        fireEvent.click(searchButton);

        expect(mockNavigate).toHaveBeenCalledWith('/?search=%E6%B5%8B%E8%AF%95%E6%90%9C%E7%B4%A2');
    });

    test('按回车键应该触发搜索', () => {
        renderWithRouter(<NotFoundPage />);

        const searchInput = screen.getByPlaceholderText('搜索页面或内容...');

        fireEvent.change(searchInput, { target: { value: '测试搜索' } });
        fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });

        expect(mockNavigate).toHaveBeenCalledWith('/?search=%E6%B5%8B%E8%AF%95%E6%90%9C%E7%B4%A2');
    });

    test('点击"回到首页"按钮应该导航到首页', () => {
        renderWithRouter(<NotFoundPage />);

        const homeButton = screen.getByText('回到首页');
        fireEvent.click(homeButton);

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('点击"返回上页"按钮应该调用navigate(-1)', () => {
        // Mock window.history.length
        Object.defineProperty(window, 'history', {
            value: { length: 2 },
            writable: true
        });

        renderWithRouter(<NotFoundPage />);

        const backButton = screen.getByText('返回上页');
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test('当没有历史记录时，"返回上页"按钮应该导航到首页', () => {
        // Mock window.history.length
        Object.defineProperty(window, 'history', {
            value: { length: 1 },
            writable: true
        });

        renderWithRouter(<NotFoundPage />);

        const backButton = screen.getByText('返回上页');
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('应该渲染404插图', () => {
        renderWithRouter(<NotFoundPage />);

        const illustration = screen.getByRole('img', { hidden: true });
        expect(illustration).toBeInTheDocument();
    });

    test('搜索输入框应该有正确的aria-label', () => {
        renderWithRouter(<NotFoundPage />);

        const searchInput = screen.getByLabelText('搜索');
        expect(searchInput).toBeInTheDocument();
    });
}); 