import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    --primary: #4FD1C5;
    --secondary: #805AD5;
    --background: ${props => props.theme.background};
    --surface: ${props => props.theme.surface};
    --text: ${props => props.theme.text};
    --text-secondary: ${props => props.theme.textSecondary};
    --border: ${props => props.theme.border};
    --error: ${props => props.theme.error};
    --success: ${props => props.theme.success};
    --warning: ${props => props.theme.warning};
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${props => props.theme.background};
    color: ${props => props.theme.text};
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  /* 自定义滚动条 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.border};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.textSecondary};
  }

  /* 覆盖Ant Design样式 */
  .ant-layout {
    background-color: ${props => props.theme.background};
  }

  .ant-card {
    background-color: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    border-color: ${props => props.theme.border};
  }

  .ant-card-head {
    color: ${props => props.theme.text};
    border-color: ${props => props.theme.border};
  }
  
  .ant-btn-primary {
    background-color: ${props => props.theme.primary};
    border-color: ${props => props.theme.primary};
  }
  
  .ant-btn-primary:hover {
    background-color: ${props => `${props.theme.primary}dd`};
    border-color: ${props => `${props.theme.primary}dd`};
  }
  
  .ant-divider {
    border-color: ${props => props.theme.border};
  }
  
  .ant-spin-dot i {
    background-color: ${props => props.theme.primary};
  }
  
  /* 加载字体 */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
`;

export default GlobalStyles; 