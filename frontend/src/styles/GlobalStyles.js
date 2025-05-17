import { createGlobalStyle } from 'styled-components';
import './tokens.css'; // 导入设计令牌CSS
// 注意: Inter字体需要在index.html中通过<link>标签加载，而不是通过@import

const GlobalStyles = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: var(--background);
    color: var(--text);
    transition: background-color var(--transition-normal), color var(--transition-normal);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    font-weight: var(--font-weight-semibold);
    color: var(--text);
  }

  h1 {
    font-size: var(--font-size-3xl);
  }

  h2 {
    font-size: var(--font-size-2xl);
  }

  h3 {
    font-size: var(--font-size-xl);
  }

  h4 {
    font-size: var(--font-size-lg);
  }

  h5, h6 {
    font-size: var(--font-size-md);
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  a:hover {
    color: var(--color-primary-dark);
  }

  /* 自定义滚动条 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--background);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: var(--radius-md);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  /* 覆盖Ant Design样式 */
  .ant-layout {
    background-color: var(--background);
  }

  .ant-card {
    background-color: var(--surface);
    color: var(--text);
    border-color: var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition-fast);
  }

  .ant-card:hover {
    box-shadow: var(--shadow-md);
  }

  .ant-card-head {
    color: var(--text);
    border-color: var(--border);
  }
  
  .ant-btn-primary {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
  }
  
  .ant-btn-primary:hover {
    background-color: var(--color-primary-dark);
    border-color: var(--color-primary-dark);
  }
  
  .ant-divider {
    border-color: var(--border);
  }
  
  .ant-spin-dot i {
    background-color: var(--color-primary);
  }

  /* Ant Design Mobile 样式覆盖 */
  .adm-button-primary {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .adm-button-primary:not(.adm-button-disabled):active {
    background-color: var(--color-primary-dark);
    border-color: var(--color-primary-dark);
  }

  .adm-card {
    background-color: var(--surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .adm-list-item {
    background-color: var(--surface);
    color: var(--text);
    border-color: var(--border);
  }

  .adm-nav-bar {
    background-color: var(--surface);
    color: var(--text);
    border-bottom: 1px solid var(--border);
  }

  .adm-toast {
    --background-color: var(--surface);
    --text-color: var(--text);
  }
`;

export default GlobalStyles; 