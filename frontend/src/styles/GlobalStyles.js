import { createGlobalStyle } from 'styled-components';
import './tokens.css'; // 导入设计令牌CSS
import '../index.css'; // 引入 Tailwind 基础层，保持顺序在 tokens 后
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
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
      radial-gradient(ellipse at 20% 10%, rgba(124,77,255,0.06), transparent 40%),
      radial-gradient(ellipse at 80% 20%, rgba(0,229,255,0.08), transparent 40%);
    background-size: var(--grid-size) var(--grid-size), var(--grid-size) var(--grid-size), 100% 100%, 100% 100%;
    background-attachment: fixed;
    caret-color: var(--color-primary);
    transition: background-color var(--transition-normal), color var(--transition-normal);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      to bottom,
      rgba(255,255,255,0.03) 0px,
      rgba(255,255,255,0.03) 1px,
      transparent 2px
    );
    animation: scanline-pan 12s linear infinite;
    mix-blend-mode: overlay;
  }

  @keyframes scanline-pan {
    0% { transform: translateY(0); }
    100% { transform: translateY(var(--grid-size)); }
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
    position: relative;
    overflow: hidden;
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