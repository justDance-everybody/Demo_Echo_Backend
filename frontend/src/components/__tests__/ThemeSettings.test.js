import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import ThemeSettings from '../ThemeSettings';
import { ThemeContext, ThemeProvider } from '../../contexts/ThemeContext';

expect.extend(toHaveNoViolations);

// Mock StyleEditor as it might be complex and not the focus here
jest.mock('../StyleEditor', () => () => <div data-testid="style-editor-mock">StyleEditor Mock</div>);

// Mock getComputedStyle as it's a browser API not available in JSDOM by default for all props
const mockGetComputedStyle = jest.fn();

beforeAll(() => {
  global.getComputedStyle = mockGetComputedStyle;
});

afterAll(() => {
  global.getComputedStyle = undefined; // Clean up
});

describe('ThemeSettings组件', () => {
  const mockUpdateThemeVariable = jest.fn();
  const mockTheme = {
    isDark: false,
    primary: '#4FD1C5',
    secondary: '#805AD5',
    borderRadius: '8px',
    // ... any other theme properties used by ThemeSettings or its children
  };

  const renderWithThemeProvider = (component) => {
    return render(
      <ThemeProvider overrideValue={{ theme: mockTheme, updateThemeVariable: mockUpdateThemeVariable, toggleTheme: jest.fn() }}>
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    mockUpdateThemeVariable.mockClear();
    // Default mock for getComputedStyle, can be overridden in specific tests
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: jest.fn((prop) => {
        if (prop === '--primary-color') return '#4FD1C5';
        if (prop === '--secondary-color') return '#805AD5';
        if (prop === '--border-radius') return '8px';
        return '';
      })
    });
  });

  test('应该正确渲染并不应有无障碍违规', async () => {
    const { container } = renderWithThemeProvider(<ThemeSettings />);
    
    expect(screen.getByText('主题设置')).toBeInTheDocument();
    expect(screen.getByLabelText('主题色')).toBeInTheDocument();
    expect(screen.getByLabelText('辅助色')).toBeInTheDocument();
    expect(screen.getByLabelText('圆角大小')).toBeInTheDocument();
    expect(screen.getByText('高级设置')).toBeInTheDocument();

    // 检查无障碍性
    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改主题色时应调用 updateThemeVariable', async () => {
    const { container } = renderWithThemeProvider(<ThemeSettings />);
    const primaryColorPicker = screen.getByLabelText('主题色');
    
    fireEvent.change(primaryColorPicker, { target: { value: '#FF0000' } });
    
    expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--primary-color', '#ff0000');
    // 检查无障碍性
    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改辅助色时应调用 updateThemeVariable', async () => {
    const { container } = renderWithThemeProvider(<ThemeSettings />);
    const secondaryColorPicker = screen.getByLabelText('辅助色');
    
    fireEvent.change(secondaryColorPicker, { target: { value: '#00FF00' } });
    
    expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--secondary-color', '#00ff00');
    // 检查无障碍性
    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改圆角大小应调用 updateThemeVariable', async () => {
    const { container } = renderWithThemeProvider(<ThemeSettings />);
    const borderRadiusSlider = screen.getByLabelText('圆角大小');
    
    fireEvent.change(borderRadiusSlider, { target: { value: '12' } });
    
    expect(mockUpdateThemeVariable).toHaveBeenCalledWith('--border-radius', '12px');
    // 检查无障碍性
    expect(await axe(container)).toHaveNoViolations();
  });

  test('点击高级设置按钮应切换 StyleEditor 的显示，并不应有无障碍违规', async () => {
    const { container } = renderWithThemeProvider(<ThemeSettings />);
    const advancedButton = screen.getByRole('button', { name: /高级设置/ });

    // 初始状态：StyleEditor 不可见
    expect(screen.queryByTestId('style-editor-mock')).not.toBeInTheDocument();
    expect(advancedButton).toHaveAttribute('aria-expanded', 'false');
    expect(await axe(container)).toHaveNoViolations(); // 初始状态的 a11y 检查

    // 点击显示
    fireEvent.click(advancedButton);
    expect(screen.getByTestId('style-editor-mock')).toBeInTheDocument();
    expect(advancedButton).toHaveAttribute('aria-expanded', 'true');
    expect(await axe(container)).toHaveNoViolations(); // 显示后的 a11y 检查

    // 点击隐藏
    fireEvent.click(advancedButton);
    expect(screen.queryByTestId('style-editor-mock')).not.toBeInTheDocument();
    expect(advancedButton).toHaveAttribute('aria-expanded', 'false');
    expect(await axe(container)).toHaveNoViolations(); // 隐藏后的 a11y 检查
  });
}); 