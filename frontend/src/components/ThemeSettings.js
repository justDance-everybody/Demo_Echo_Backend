import React, { useState } from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import StyleEditor from './StyleEditor';

// 样式设置容器
const SettingsContainer = styled.div`
  padding: 1rem;
  background-color: var(--card-bg, var(--surface));
  border-radius: var(--border-radius, 8px);
  box-shadow: var(--card-shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
`;

// 标题
const Title = styled.h2`
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 设置部分
const Section = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

// 设置行
const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// 标签 - 改为 label 元素
const Label = styled.label`
  font-weight: 500;
  color: var(--text-color);
  display: block; // Ensure it takes full width if needed or adjust layout
`;

// 描述
const Description = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
`;

// 颜色选择器容器
const ColorPickerContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

// 颜色选择器
const ColorPicker = styled.input`
  width: 36px;
  height: 36px;
  padding: 0;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius, 4px);
  cursor: pointer;
  background-color: transparent;
  
  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }
`;

// 滑块容器
const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 200px;
`;

// 滑块值
const SliderValue = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: right;
  margin-top: 0.25rem;
`;

// 按钮
const Button = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius, 4px);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
`;

/**
 * 主题设置组件
 */
const ThemeSettings = () => {
  const { theme, updateThemeVariable } = useTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 主题颜色
  const [primaryColor, setPrimaryColor] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#4FD1C5'
  );
  
  // 辅助颜色
  const [secondaryColor, setSecondaryColor] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#805AD5'
  );
  
  // 圆角大小
  const [borderRadius, setBorderRadius] = useState(
    () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue('--border-radius').trim();
      return parseInt(value) || 8;
    }
  );
  
  // 更新主题色
  const handlePrimaryColorChange = (e) => {
    const value = e.target.value;
    setPrimaryColor(value);
    updateThemeVariable('--primary-color', value);
  };
  
  // 更新辅助色
  const handleSecondaryColorChange = (e) => {
    const value = e.target.value;
    setSecondaryColor(value);
    updateThemeVariable('--secondary-color', value);
  };
  
  // 更新圆角大小
  const handleBorderRadiusChange = (e) => {
    const value = e.target.value;
    setBorderRadius(value);
    updateThemeVariable('--border-radius', `${value}px`);
  };
  
  const advancedSettingsId = "advanced-settings-panel";

  return (
    <SettingsContainer>
      <Title>
        <span aria-hidden="true">🎨</span>
        主题设置
      </Title>
      
      <Section>
        <SettingRow>
          <div>
            <Label htmlFor="primary-color-picker">主题色</Label>
            <Description id="primary-color-desc">应用的主要颜色</Description>
          </div>
          <ColorPickerContainer>
            <ColorPicker
              type="color"
              id="primary-color-picker"
              value={primaryColor}
              onChange={handlePrimaryColorChange}
              aria-describedby="primary-color-desc"
            />
          </ColorPickerContainer>
        </SettingRow>
        
        <SettingRow>
          <div>
            <Label htmlFor="secondary-color-picker">辅助色</Label>
            <Description id="secondary-color-desc">用于强调和高亮的颜色</Description>
          </div>
          <ColorPickerContainer>
            <ColorPicker
              type="color"
              id="secondary-color-picker"
              value={secondaryColor}
              onChange={handleSecondaryColorChange}
              aria-describedby="secondary-color-desc"
            />
          </ColorPickerContainer>
        </SettingRow>
        
        <SettingRow>
          <div>
            <Label htmlFor="border-radius-slider">圆角大小</Label>
            <Description id="border-radius-desc">按钮和卡片的圆角半径</Description>
          </div>
          <SliderContainer>
            <input
              type="range"
              id="border-radius-slider"
              min="0"
              max="20"
              value={borderRadius}
              onChange={handleBorderRadiusChange}
              aria-describedby="border-radius-desc"
            />
            <SliderValue>{borderRadius}px</SliderValue>
          </SliderContainer>
        </SettingRow>
      </Section>
      
      <Section>
        <SettingRow>
          <div>
            <Label id="advanced-settings-label">高级设置</Label>
            <Description id="advanced-settings-desc">更多自定义样式选项</Description>
          </div>
          <Button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-controls={advancedSettingsId}
            aria-expanded={showAdvanced}
            aria-labelledby="advanced-settings-label"
            aria-describedby="advanced-settings-desc"
          >
            {showAdvanced ? '隐藏' : '显示'}
          </Button>
        </SettingRow>
        
        {showAdvanced && (
          <div id={advancedSettingsId} style={{ marginTop: '1rem' }}>
            <StyleEditor />
          </div>
        )}
      </Section>
    </SettingsContainer>
  );
};

export default ThemeSettings;
 