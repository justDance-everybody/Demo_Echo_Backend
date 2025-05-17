import React, { useState } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import StyleEditor from '../../components/StyleEditor';

// 设置页面容器
const SettingsContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

// 标题样式
const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
`;

// 设置卡片容器
const SettingsCardContainer = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  margin-bottom: 2rem;
`;

// 设置卡片
const SettingsCard = styled.div`
  background-color: var(--card-bg);
  padding: 1.5rem;
  border-radius: var(--border-radius, 8px);
  box-shadow: var(--card-shadow, 0 2px 5px rgba(0, 0, 0, 0.1));
  
  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    font-weight: 500;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  hr {
    margin: 1rem 0;
    border: none;
    border-top: 1px solid var(--border-color);
  }
`;

// 使用styled-components分组样式
const SettingsGroup = styled.div`
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: var(--text-color);
    font-weight: 500;
  }
`;

// 选项卡容器
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
`;

// 选项卡
const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.active ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.active ? 'var(--primary-color)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--primary-color);
  }
`;

// 设置行
const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  
  &:last-child {
    border-bottom: none;
  }
  
  label {
    color: var(--text-color);
    font-weight: 500;
  }
  
  .description {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }
`;

// 设置页面主要内容
const Settings = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance'); // 默认显示appearance选项卡
  
  return (
    <SettingsContainer>
      <Title>
        <span aria-hidden="true">⚙️</span>
        设置
      </Title>
      
      {/* 选项卡导航 */}
      <TabsContainer role="tablist" aria-label="设置类别">
        <Tab 
          role="tab"
          id="tab-appearance"
          aria-controls="tabpanel-appearance"
          aria-selected={activeTab === 'appearance'} 
          onClick={() => setActiveTab('appearance')}
        >
          外观和主题
        </Tab>
        <Tab 
          role="tab"
          id="tab-advanced"
          aria-controls="tabpanel-advanced"
          aria-selected={activeTab === 'advanced'} 
          onClick={() => setActiveTab('advanced')}
        >
          高级设置
        </Tab>
        <Tab 
          role="tab"
          id="tab-account"
          aria-controls="tabpanel-account"
          aria-selected={activeTab === 'account'} 
          onClick={() => setActiveTab('account')}
        >
          账户设置
        </Tab>
      </TabsContainer>

      {/* 外观设置选项卡面板 */}
      {activeTab === 'appearance' && (
        <div role="tabpanel" id="tabpanel-appearance" aria-labelledby="tab-appearance">
          <SettingsCardContainer>
            {/* 主题模式设置卡片 */}
            <SettingsCard>
              <h2>
                <span aria-hidden="true">🎨</span>
                主题模式
              </h2>
              <p>切换应用的亮色或暗色主题模式。</p>
              
              <SettingsGroup>
                <SettingRow>
                  <div>
                    <label htmlFor="theme-toggle-button-instance">当前主题</label>
                    <div className="description">
                      {theme.isDark ? '暗色主题' : '亮色主题'}
                    </div>
                  </div>
                  <ThemeToggle id="theme-toggle-button-instance" />
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
            
            {/* 字体设置卡片 */}
            <SettingsCard>
              <h2>
                <span aria-hidden="true">📝</span>
                字体设置
              </h2>
              <p>自定义应用中使用的字体和字体大小。</p>
              
              <SettingsGroup>
                <SettingRow>
                  <div>
                    <label htmlFor="font-family-select">应用字体</label>
                    <div className="description">
                      修改整个应用的默认字体
                    </div>
                  </div>
                  <select id="font-family-select" defaultValue="system">
                    <option value="system">系统默认</option>
                    <option value="sans-serif">Sans-serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">等宽字体</option>
                  </select>
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="font-size-select">字体大小</label>
                    <div className="description">
                      调整应用的整体字体大小
                    </div>
                  </div>
                  <select id="font-size-select" defaultValue="medium">
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
          </SettingsCardContainer>
          
          {/* 样式编辑器 */}
          <SettingsCard>
            <h2>
              <span aria-hidden="true">🎭</span>
              主题样式自定义
            </h2>
            <p>自定义应用的颜色、样式和外观。</p>
            <hr />
            <StyleEditor />
          </SettingsCard>
        </div>
      )}
      
      {/* 高级设置选项卡面板 */}
      {activeTab === 'advanced' && (
        <div role="tabpanel" id="tabpanel-advanced" aria-labelledby="tab-advanced">
          <SettingsCardContainer>
            <SettingsCard>
              <h2>
                <span aria-hidden="true">⚙️</span>
                高级功能
              </h2>
              <p>配置应用的高级功能和行为。</p>
              
              <SettingsGroup>
                <h3>性能选项</h3>
                <SettingRow>
                  <div>
                    <label htmlFor="developer-mode-checkbox">开发者模式</label>
                    <div className="description">
                      启用额外的调试功能和控制台输出
                    </div>
                  </div>
                  <input type="checkbox" id="developer-mode-checkbox" />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="performance-mode-checkbox">性能模式</label>
                    <div className="description">
                      优化应用性能，但可能会减少某些视觉效果
                    </div>
                  </div>
                  <input type="checkbox" id="performance-mode-checkbox" />
                </SettingRow>
              </SettingsGroup>
              
              <SettingsGroup>
                <h3>数据管理</h3>
                <SettingRow>
                  <div>
                    <label>缓存数据</label>
                    <div className="description">
                      清除应用缓存的数据和设置
                    </div>
                  </div>
                  <button>清除缓存</button>
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
            
            <SettingsCard>
              <h2>
                <span aria-hidden="true">🔌</span>
                API 设置
              </h2>
              <p>配置API连接和认证设置。</p>
              
              <SettingsGroup>
                <SettingRow>
                  <div>
                    <label htmlFor="api-endpoint-input">API端点</label>
                    <div className="description">
                      设置默认API服务器地址
                    </div>
                  </div>
                  <input 
                    type="text" 
                    id="api-endpoint-input"
                    defaultValue="https://api.example.com" 
                    style={{ width: '180px' }}
                  />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="api-timeout-input">请求超时</label>
                    <div className="description">
                      API请求超时时间（秒）
                    </div>
                  </div>
                  <input 
                    type="number" 
                    id="api-timeout-input"
                    defaultValue={30} 
                    min={5} 
                    max={120}
                    style={{ width: '80px' }}
                  />
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
          </SettingsCardContainer>
        </div>
      )}
      
      {/* 账户设置选项卡面板 */}
      {activeTab === 'account' && (
        <div role="tabpanel" id="tabpanel-account" aria-labelledby="tab-account">
          <SettingsCardContainer>
            <SettingsCard>
              <h2>
                <span aria-hidden="true">👤</span>
                账户详情
              </h2>
              <p>管理您的账户信息和偏好。</p>
              
              <SettingsGroup>
                <SettingRow>
                  <div>
                    <label htmlFor="username-input">用户名</label>
                    <div className="description">
                      您的账户显示名称
                    </div>
                  </div>
                  <input 
                    type="text" 
                    id="username-input"
                    defaultValue="用户名" 
                    style={{ width: '180px' }}
                  />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="email-input">邮箱地址</label>
                    <div className="description">
                      用于通知和账户恢复
                    </div>
                  </div>
                  <input 
                    type="email" 
                    id="email-input"
                    defaultValue="user@example.com" 
                    style={{ width: '180px' }}
                  />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label>更改密码</label>
                    <div className="description">
                      修改您的账户密码
                    </div>
                  </div>
                  <button>更改密码</button>
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
            
            <SettingsCard>
              <h2>
                <span aria-hidden="true">🔔</span>
                通知设置
              </h2>
              <p>管理您接收通知的方式和频率。</p>
              
              <SettingsGroup>
                <SettingRow>
                  <div>
                    <label htmlFor="email-notifications-checkbox">电子邮件通知</label>
                    <div className="description">
                      通过电子邮件接收通知
                    </div>
                  </div>
                  <input type="checkbox" id="email-notifications-checkbox" defaultChecked />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="system-notifications-checkbox">系统通知</label>
                    <div className="description">
                      显示浏览器或桌面通知
                    </div>
                  </div>
                  <input type="checkbox" id="system-notifications-checkbox" defaultChecked />
                </SettingRow>
                
                <SettingRow>
                  <div>
                    <label htmlFor="notification-frequency-select">通知频率</label>
                    <div className="description">
                      设置通知发送频率
                    </div>
                  </div>
                  <select id="notification-frequency-select" defaultValue="immediate">
                    <option value="immediate">实时</option>
                    <option value="daily">每日摘要</option>
                    <option value="weekly">每周摘要</option>
                  </select>
                </SettingRow>
              </SettingsGroup>
            </SettingsCard>
          </SettingsCardContainer>
        </div>
      )}
    </SettingsContainer>
  );
};

export default Settings; 