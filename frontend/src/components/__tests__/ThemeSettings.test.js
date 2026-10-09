import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import ThemeSettings from '../ThemeSettings';
import { ThemeProvider } from '../../contexts/ThemeContext';

expect.extend(toHaveNoViolations);

// Mock StyleEditor as it might be complex and not the focus here
jest.mock('../StyleEditor', () => () => <div data-testid="style-editor-mock">StyleEditor Mock</div>);

// Mock localStorage
let localStorageMock = {};
global.Storage.prototype.getItem = jest.fn((key) => localStorageMock[key]);
global.Storage.prototype.setItem = jest.fn((key, value) => {
  localStorageMock[key] = value;
});
global.Storage.prototype.clear = jest.fn(() => {
  localStorageMock = {};
});

// Mock document.documentElement.style.setProperty
const setPropertyMock = jest.fn();
Object.defineProperty(document.documentElement, 'style', {
  configurable: true,
  value: { setProperty: setPropertyMock, getPropertyValue: jest.fn() }, // Added getPropertyValue mock for completeness
});

describe('ThemeSettings组件 - 集成测试', () => {
  const renderWithActualProvider = (component) => {
    // Render with the actual ThemeProvider, no overrideValue for theme logic
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    // Clear mocks and localStorage before each test
    localStorageMock = {}; // Reset localStorage mock
    setPropertyMock.mockClear();
    // Clear other mocks if they were set (getItem, setItem for Storage)
    global.Storage.prototype.getItem.mockClear();
    global.Storage.prototype.setItem.mockClear();
    // Set an initial theme in localStorage for consistent testing if needed
    localStorageMock['theme'] = 'light'; 
    localStorageMock['customTheme'] = JSON.stringify({});
  });

  test('应该正确渲染并不应有无障碍违规', async () => {
    const { container } = renderWithActualProvider(<ThemeSettings />);
    
    expect(screen.getByText('主题设置')).toBeInTheDocument();
    expect(screen.getByLabelText('主题色')).toBeInTheDocument();
    expect(screen.getByLabelText('辅助色')).toBeInTheDocument();
    expect(screen.getByLabelText('圆角大小')).toBeInTheDocument();
    expect(screen.getByText('高级设置')).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改主题色时应更新CSS变量和localStorage', async () => {
    const { container } = renderWithActualProvider(<ThemeSettings />);
    const primaryColorPicker = screen.getByLabelText('主题色');
    const newColor = '#ff0000';

    await act(async () => {
        fireEvent.change(primaryColorPicker, { target: { value: newColor } });
    });
    
    expect(setPropertyMock).toHaveBeenCalledWith('--primary-color', newColor.toLowerCase());
    expect(global.Storage.prototype.setItem).toHaveBeenCalledWith(
      'customTheme',
      JSON.stringify({ 'primary-color': newColor.toLowerCase() })
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改辅助色时应更新CSS变量和localStorage', async () => {
    const { container } = renderWithActualProvider(<ThemeSettings />);
    const secondaryColorPicker = screen.getByLabelText('辅助色');
    const newColor = '#00ff00';

    await act(async () => {
        fireEvent.change(secondaryColorPicker, { target: { value: newColor } });
    });
    
    expect(setPropertyMock).toHaveBeenCalledWith('--secondary-color', newColor.toLowerCase());
    // Check that customTheme in localStorage is updated (might include previous changes if not cleared properly)
    const customTheme = JSON.parse(localStorageMock['customTheme']);
    expect(customTheme['secondary-color']).toEqual(newColor.toLowerCase());
    expect(await axe(container)).toHaveNoViolations();
  });

  test('更改圆角大小应更新CSS变量和localStorage', async () => {
    const { container } = renderWithActualProvider(<ThemeSettings />);
    const borderRadiusSlider = screen.getByLabelText('圆角大小');
    const newValue = '12';
    const expectedCssValue = '12px';
    
    await act(async () => {
        fireEvent.change(borderRadiusSlider, { target: { value: newValue } });
    });
    
    expect(setPropertyMock).toHaveBeenCalledWith('--border-radius', expectedCssValue);
    const customTheme = JSON.parse(localStorageMock['customTheme']);
    expect(customTheme['border-radius']).toEqual(expectedCssValue);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('点击高级设置按钮应切换 StyleEditor 的显示', async () => {
    const { container } = renderWithActualProvider(<ThemeSettings />);
    const advancedButton = screen.getByRole('button', { name: /高级设置/ });

    expect(screen.queryByTestId('style-editor-mock')).not.toBeInTheDocument();
    fireEvent.click(advancedButton);
    expect(screen.getByTestId('style-editor-mock')).toBeInTheDocument();
    fireEvent.click(advancedButton);
    expect(screen.queryByTestId('style-editor-mock')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
}); 