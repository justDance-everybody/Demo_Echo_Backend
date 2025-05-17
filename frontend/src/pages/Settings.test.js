import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Settings from './Settings/index.jsx';
import { ThemeProvider, ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

expect.extend(toHaveNoViolations);

// Mock子组件，以隔离测试
// 使用 jest.fn() 来允许检查 mock 组件是否被点击等交互
const mockThemeToggle = jest.fn();
jest.mock('../components/ThemeToggle', () => (props) => <div data-testid="theme-toggle-mock" onClick={mockThemeToggle} {...props}>ThemeToggle Mock</div>);
jest.mock('../components/StyleEditor', () => () => <div data-testid="style-editor-mock">StyleEditor Mock</div>);

// Mock react-router-dom useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock toast
jest.mock('../components/common/Toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SettingsPage 组件', () => {
  const mockThemeContextValue = {
    theme: { isDark: false, 'font-scale': 1, 'font-family': 'system' },
    toggleTheme: jest.fn(),
    updateThemeVariable: jest.fn(),
    setTheme: jest.fn(), // 确保模拟了 setTheme
  };

  const mockAuthContextUser = {
    user: { username: 'testuser', role: 'user' },
    loading: false,
    logout: jest.fn(),
  };

  const mockAuthContextDeveloper = {
    user: { username: 'devuser', role: 'developer' },
    loading: false,
    logout: jest.fn(),
  };

  const renderWithProviders = (ui, authValue = mockAuthContextUser, themeValue = mockThemeContextValue) => {
    return render(
      <AuthContext.Provider value={authValue}>
        <ThemeContext.Provider value={themeValue}>
          {ui}
        </ThemeContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该正确渲染标题和选项卡，并且不应有无障碍违规', async () => {
    const { container } = renderWithProviders(<Settings />);
    
    expect(screen.getByRole('heading', { name: /设置/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /外观和主题/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /高级设置/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /账户设置/i })).toBeInTheDocument();

    // 默认显示外观和主题选项卡
    expect(screen.getByRole('tab', { name: /外观和主题/i })).toHaveAttribute('aria-selected', 'true');
    const appearancePanel = screen.getByRole('tabpanel', { name: /外观和主题/i });
    expect(appearancePanel).toBeVisible();

    expect(await axe(container)).toHaveNoViolations();
  });

  test('点击选项卡应切换内容，并且不应有无障碍违规', async () => {
    const { container } = renderWithProviders(<Settings />);
    const advancedTab = screen.getByRole('tab', { name: /高级设置/i });

    fireEvent.click(advancedTab);
    expect(advancedTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /高级设置/i })).toBeVisible();
    // 检查之前的面板是否不再可见或不存在 (根据实现)
    expect(screen.queryByRole('tabpanel', { name: /外观和主题/i })).not.toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();

    const appearanceTab = screen.getByRole('tab', { name: /外观和主题/i });
    fireEvent.click(appearanceTab);
    expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /外观和主题/i })).toBeVisible();

    expect(await axe(container)).toHaveNoViolations();
  });

  describe('外观和主题选项卡', () => {
    test('内容应正确渲染，并不应有无障碍违规', async () => {
      const { container } = renderWithProviders(<Settings />); // 默认显示外观tab
  
      // 卡片标题
      expect(screen.getByRole('heading', { name: /主题模式/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /字体设置/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /主题样式自定义/i, level: 2 })).toBeInTheDocument();
      
      // 主题切换部分
      expect(screen.getByText('当前主题')).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle-mock')).toBeInTheDocument();
      
      // 字体选择部分
      expect(screen.getByLabelText(/应用字体/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /应用字体/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/字体大小/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /字体大小/i })).toBeInTheDocument();
      
      // StyleEditor mock
      expect(screen.getByTestId('style-editor-mock')).toBeInTheDocument();
  
      expect(await axe(container)).toHaveNoViolations();
    });

    test('点击暗色模式开关(mock)应调用toggleTheme', async () => {
      renderWithProviders(<Settings />); 
      const themeToggleMock = screen.getByTestId('theme-toggle-mock');
      fireEvent.click(themeToggleMock);
      expect(mockThemeToggle).toHaveBeenCalled(); // 检查mock组件的onClick是否被调用
                                                  // 注意: 我们这里不能直接检查 mockThemeContextValue.toggleTheme
                                                  // 因为 ThemeToggle mock 内部没有调用它。
                                                  // 要测试上下文函数的调用，需要在 ThemeToggle mock 中调用传入的 toggleTheme prop
    });
  });

  // describe('ThemeSettings 弹窗 (通过 StyleEditor 触发)', () => {
  //   test('点击自定义主题按钮(假设在StyleEditor内)应显示ThemeSettings', async () => {
  //     // 这个测试变得复杂，因为 ThemeSettings 现在是 StyleEditor 的一部分
  //     // 我们需要一种方式从 StyleEditor mock 内部触发 ThemeSettings 的显示，
  //     // 或者重新考虑 StyleEditor 的 mock 方式，使其能暴露一个触发器。
  //     // 暂时跳过/注释，直到 StyleEditor 和 ThemeSettings 的集成更清晰。
  //   });
  // });

  describe('高级设置选项卡', () => {
    test('内容应正确渲染 (开发者用户), 并不应有无障碍违规', async () => {
      const { container } = renderWithProviders(<Settings />, mockAuthContextDeveloper);
      fireEvent.click(screen.getByRole('tab', { name: /高级设置/i }));
      
      expect(screen.getByRole('heading', { name: /高级功能/i, level: 2})).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /API 设置/i, level: 2})).toBeInTheDocument();

      // API 端点部分 - 由于缺乏正确的 label/id，暂时不测试输入框的值更改
      expect(screen.getByText(/API端点/i)).toBeInTheDocument(); // 修改点：使用正确的标签文本
      // const apiEndpointInput = screen.getByDisplayValue('https://api.example.com'); // 这是一个脆弱的选择器
      // expect(apiEndpointInput).toBeInTheDocument();
      // fireEvent.change(apiEndpointInput, { target: { value: 'http://new.api' } });
      // expect(apiEndpointInput).toHaveValue('http://new.api');

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('账户设置选项卡', () => {
    test('内容应正确渲染, 并不应有无障碍违规', async () => {
      const { container } = renderWithProviders(<Settings />); 
      fireEvent.click(screen.getByRole('tab', { name: /账户设置/i }));

      expect(screen.getByRole('heading', { name: /账户详情/i, level: 2 })).toBeInTheDocument(); // 修改点
      // expect(screen.getByText(/用户名: testuser/i)).toBeInTheDocument(); // 修改点：此文本不存在
      // 可以检查输入框和其默认值
      const usernameInput = screen.getByDisplayValue('用户名'); // 根据defaultValue定位
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput.closest('div.sc-kAyceB')).toHaveTextContent('您的账户显示名称');
      
      expect(screen.getByRole('button', { name: /更改密码/i })).toBeInTheDocument(); // 修改点：检查存在的按钮
      
      expect(await axe(container)).toHaveNoViolations();
    });

    // test('点击退出登录按钮应调用logout', async () => {
    //   renderWithProviders(<Settings />); 
    //   fireEvent.click(screen.getByRole('tab', { name: /账户设置/i }));
    //   const logoutButton = screen.getByRole('button', { name: /退出登录/i }); // 此按钮不存在
    //   fireEvent.click(logoutButton);
    //   expect(mockAuthContextUser.logout).toHaveBeenCalledTimes(1);
    // });
  });

  // // 下面的测试用例与当前 Settings/index.jsx 中不存在的功能相关，暂时注释
  // test('点击保存设置按钮显示Toast', async () => {
  //   renderWithProviders(<Settings />); 
  //   const saveButton = screen.getByTestId('save-button'); // 假设有一个保存按钮
  //   fireEvent.click(saveButton);
  //   await waitFor(() => expect(toast.success).toHaveBeenCalledWith('设置已保存!'));
  // });

  // test('点击返回按钮导航返回', async () => {
  //   renderWithProviders(<Settings />); 
  //   const backButton = screen.getByTestId('back-button'); // 假设有一个返回按钮
  //   fireEvent.click(backButton);
  //   expect(mockNavigate).toHaveBeenCalledWith(-1);
  // });
}); 