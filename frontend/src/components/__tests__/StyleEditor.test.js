import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StyleEditor from '../StyleEditor';
import { ThemeProvider } from '../../contexts/ThemeContext'; // Use actual provider

// Mock localStorage
let localStorageMock = {};
global.Storage.prototype.getItem = jest.fn((key) => localStorageMock[key]);
global.Storage.prototype.setItem = jest.fn((key, value) => {
  localStorageMock[key] = value;
});
global.Storage.prototype.clear = jest.fn(() => {
  localStorageMock = {};
});

// Mock document.documentElement.style.setProperty and getPropertyValue
const setPropertyMock = jest.fn();
const getPropertyValueMock = jest.fn();
Object.defineProperty(window.document.documentElement.style, 'getPropertyValue', {
    value: getPropertyValueMock,
    configurable: true
});
Object.defineProperty(window.document.documentElement.style, 'setProperty', {
    value: setPropertyMock,
  configurable: true
});

// Mock window.getComputedStyle
const mockComputedStyle = {
    getPropertyValue: getPropertyValueMock // Reuse the same mock for simplicity or make specific
};
global.getComputedStyle = jest.fn(() => mockComputedStyle);


describe('StyleEditor组件 - 集成测试', () => {
  const renderWithActualProvider = (component) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  const initialCssVars = {
    '--primary-color': '#4FD1C5',
    '--secondary-color': '#805AD5',
    '--text-color': '#F8F8F8',
      '--background': '#1E1E2F',
      '--surface': '#27293D',
    '--border-color': '#2D3748',
  };

  beforeEach(() => {
    localStorageMock = {};
    setPropertyMock.mockClear();
    getPropertyValueMock.mockClear();
    global.Storage.prototype.getItem.mockClear();
    global.Storage.prototype.setItem.mockClear();
    
    // Setup getPropertyValueMock for initial load
    getPropertyValueMock.mockImplementation((varName) => initialCssVars[varName] || '');
    
    // Set initial localStorage state if StyleEditor depends on it for initial theme mode
    localStorageMock['theme'] = 'dark'; // Assuming dark mode for default values in StyleEditor
    localStorageMock['customTheme'] = JSON.stringify({});
  });

  test('正确渲染并从计算样式加载初始值', () => {
    renderWithActualProvider(<StyleEditor />);
    expect(screen.getByText('样式编辑器')).toBeInTheDocument();
    
    // Check that inputs are rendered with values from getPropertyValueMock
    expect(screen.getByDisplayValue(initialCssVars['--primary-color'])).toBeInTheDocument();
    expect(screen.getByDisplayValue(initialCssVars['--secondary-color'])).toBeInTheDocument();
  });

  test('修改颜色变量时应更新CSS变量和localStorage', async () => {
    renderWithActualProvider(<StyleEditor />);
    const newPrimaryColor = '#ff00ff';

    // Find the input for --primary-color. StyleEditor uses varName as key and in the display.
    // The input is a text input in the current StyleEditor.js
    const primaryColorInput = screen.getByDisplayValue(initialCssVars['--primary-color']);
    
    await act(async () => {
        fireEvent.change(primaryColorInput, { target: { value: newPrimaryColor } });
    });

    expect(setPropertyMock).toHaveBeenCalledWith('--primary-color', newPrimaryColor);
    const customTheme = JSON.parse(localStorageMock['customTheme']);
    expect(customTheme['primary-color']).toEqual(newPrimaryColor);
  });

  test('重置按钮应将变量恢复为默认值并更新CSS和localStorage', async () => {
    renderWithActualProvider(<StyleEditor />);
    const resetButton = screen.getByText('重置为默认值');

    // Modify a variable first to ensure reset has an effect
    const primaryColorInput = screen.getByDisplayValue(initialCssVars['--primary-color']);
    await act(async () => {
        fireEvent.change(primaryColorInput, { target: { value: '#000000' } });
    });
    // Clear mocks to only capture reset calls
    setPropertyMock.mockClear();
    global.Storage.prototype.setItem.mockClear();

    await act(async () => {
    fireEvent.click(resetButton);
    });

    // StyleEditor's resetToDefault has its own set of defaults
    // Check a few to ensure setProperty was called for them
    const editorDefaultsDark = {
        '--primary-color': '#4FD1C5',
        '--secondary-color': '#805AD5',
        '--text-color': '#F8F8F8',
        '--background': '#1E1E2F',
        '--surface': '#27293D',
        '--border-color': '#2D3748',
    };

    expect(setPropertyMock).toHaveBeenCalledWith('--primary-color', editorDefaultsDark['--primary-color']);
    expect(setPropertyMock).toHaveBeenCalledWith('--background', editorDefaultsDark['--background']);
    // Add more checks if necessary for all defaults

    // Check localStorage reflects these defaults
    // The entire customTheme should reflect the reset state, which means it should contain all default vars
    const finalCustomTheme = JSON.parse(localStorageMock['customTheme']);
    expect(finalCustomTheme['primary-color']).toEqual(editorDefaultsDark['--primary-color']);
    expect(finalCustomTheme['background']).toEqual(editorDefaultsDark['--background']);
  });

  test('导出主题配置功能', () => {
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    const mockLinkClick = jest.fn();
    // Mock document.createElement to intercept the link and its click
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
            return { href: '', download: '', click: mockLinkClick, style: {} };
        }
        return originalCreateElement.call(document, tagName);
    });

    renderWithActualProvider(<StyleEditor />);
    const exportButton = screen.getByText('导出主题配置');
    fireEvent.click(exportButton);
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockLinkClick).toHaveBeenCalled();

    // Restore original createElement
    document.createElement = originalCreateElement;
    global.URL.revokeObjectURL = jest.fn(); // also mock revoke
  });
}); 