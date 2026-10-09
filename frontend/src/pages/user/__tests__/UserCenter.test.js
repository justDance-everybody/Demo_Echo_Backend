import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserCenter from '../UserCenter';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeContext } from '../../../contexts/ThemeContext';

// 模拟antd-mobile组件
jest.mock('antd-mobile', () => ({
    NavBar: ({ children, onBack }) => (
        <div data-testid="navbar" onClick={onBack}>
            {children}
        </div>
    ),
    List: {
        Item: ({ children, prefix, onClick, description, extra, arrow }) => (
            <div data-testid="list-item" onClick={onClick}>
                {prefix && <span data-testid="prefix">{prefix}</span>}
                <span data-testid="content">{children}</span>
                {description && <span data-testid="description">{description}</span>}
                {extra && <span data-testid="extra">{extra}</span>}
                {arrow && <span data-testid="arrow">→</span>}
            </div>
        )
    },
    Avatar: ({ children, src }) => (
        <div data-testid="avatar">
            {src ? <img src={src} alt="avatar" /> : children}
        </div>
    ),
    Button: ({ children, onClick, ...props }) => (
        <button data-testid="button" onClick={onClick} {...props}>
            {children}
        </button>
    ),
    Dialog: {
        confirm: jest.fn(() => Promise.resolve(true))
    },
    Toast: {
        show: jest.fn()
    }
}));

// 模拟antd-mobile-icons
jest.mock('antd-mobile-icons', () => ({
    UserOutline: () => <span data-testid="user-icon">👤</span>,
    SetOutline: () => <span data-testid="set-icon">⚙️</span>,
    SoundOutline: () => <span data-testid="sound-icon">🔊</span>,
    LockOutline: () => <span data-testid="lock-icon">🔒</span>,
    MessageOutline: () => <span data-testid="message-icon">💬</span>,
    GlobalOutline: () => <span data-testid="global-icon">🌐</span>
}));

// 模拟styled-components
jest.mock('styled-components', () => {
    const mockStyled = (component) => (props) => component;

    // 为所有HTML元素创建模拟
    ['div', 'span', 'button', 'img', 'h1', 'h2', 'h3', 'p', 'ul', 'li'].forEach(tag => {
        mockStyled[tag] = mockStyled;
    });

    return {
        __esModule: true,
        default: mockStyled,
        keyframes: () => 'mocked-keyframes',
        createGlobalStyle: () => () => null
    };
});

describe('UserCenter组件', () => {
    const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        avatar: null
    };

    const mockAuthContext = {
        user: mockUser,
        logout: jest.fn()
    };

    const mockThemeContext = {
        theme: { isDark: false },
        toggleTheme: jest.fn()
    };

    const renderUserCenter = () => {
        return render(
            <BrowserRouter>
                <AuthContext.Provider value={mockAuthContext}>
                    <ThemeContext.Provider value={mockThemeContext}>
                        <UserCenter />
                    </ThemeContext.Provider>
                </AuthContext.Provider>
            </BrowserRouter>
        );
    };

    test('应该正常渲染', () => {
        renderUserCenter();

        // 验证导航栏存在
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        expect(screen.getByText('个人中心')).toBeInTheDocument();

        // 验证用户信息显示
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();

        // 验证设置选项存在
        expect(screen.getByText('语音设置')).toBeInTheDocument();
        expect(screen.getByText('主题模式')).toBeInTheDocument();
        expect(screen.getByText('账户安全')).toBeInTheDocument();
        expect(screen.getByText('消息通知')).toBeInTheDocument();
        expect(screen.getByText('语言设置')).toBeInTheDocument();

        // 验证退出登录按钮存在
        expect(screen.getByText('退出登录')).toBeInTheDocument();
    });

    test('应该显示正确的主题状态', () => {
        renderUserCenter();

        // 验证浅色主题显示
        expect(screen.getByText('浅色')).toBeInTheDocument();
    });

    test('深色主题时应该显示深色', () => {
        const darkThemeContext = {
            theme: { isDark: true },
            toggleTheme: jest.fn()
        };

        render(
            <BrowserRouter>
                <AuthContext.Provider value={mockAuthContext}>
                    <ThemeContext.Provider value={darkThemeContext}>
                        <UserCenter />
                    </ThemeContext.Provider>
                </AuthContext.Provider>
            </BrowserRouter>
        );

        expect(screen.getByText('深色')).toBeInTheDocument();
    });
}); 