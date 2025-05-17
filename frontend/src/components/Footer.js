import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

// 页脚容器
const FooterContainer = styled.footer`
  padding: 2rem 1rem;
  background-color: var(--surface);
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  margin-top: auto;
`;

// 页脚内容布局
const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

// 页脚列
const FooterColumn = styled.div`
  h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: var(--text-color);
    font-weight: 500;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
  
  a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--primary-color);
    }
  }
`;

// 版权信息区
const CopyrightSection = styled.div`
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
  font-size: 0.9rem;
  
  p {
    margin: 0.5rem 0;
  }
`;

// 社交媒体图标
const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: center;
  
  a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--background);
    color: var(--text-color);
    transition: all 0.2s ease;
    
    &:hover {
      background-color: var(--primary-color);
      color: white;
      transform: translateY(-2px);
    }
  }
`;

// 页脚组件
const Footer = () => {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterColumn>
          <h3>关于我们</h3>
          <ul>
            <li><Link to="/about">平台介绍</Link></li>
            <li><Link to="/team">团队成员</Link></li>
            <li><Link to="/contact">联系我们</Link></li>
            <li><Link to="/careers">招聘信息</Link></li>
          </ul>
        </FooterColumn>
        
        <FooterColumn>
          <h3>资源</h3>
          <ul>
            <li><Link to="/docs">开发文档</Link></li>
            <li><Link to="/api">API参考</Link></li>
            <li><Link to="/examples">示例代码</Link></li>
            <li><Link to="/blog">技术博客</Link></li>
          </ul>
        </FooterColumn>
        
        <FooterColumn>
          <h3>支持</h3>
          <ul>
            <li><Link to="/help">帮助中心</Link></li>
            <li><Link to="/faq">常见问题</Link></li>
            <li><Link to="/feedback">反馈建议</Link></li>
            <li><Link to="/status">系统状态</Link></li>
          </ul>
        </FooterColumn>
        
        <FooterColumn>
          <h3>联系信息</h3>
          <p>邮箱: support@echo-ai.com</p>
          <p>电话: 400-800-8888</p>
          <p>地址: 北京市海淀区科技园</p>
        </FooterColumn>
      </FooterContent>
      
      <CopyrightSection>
        <p>
          © {currentYear} Echo AI 语音助手平台 版权所有
        </p>
        <p>
          <Link to="/privacy">隐私政策</Link> | 
          <Link to="/terms"> 服务条款</Link> | 
          <Link to="/sitemap"> 网站地图</Link>
        </p>
        
        <SocialLinks>
          <a href="https://github.com/echo-ai" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <span role="img" aria-label="github">📂</span>
          </a>
          <a href="https://twitter.com/echo-ai" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <span role="img" aria-label="twitter">🐦</span>
          </a>
          <a href="https://linkedin.com/company/echo-ai" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <span role="img" aria-label="linkedin">🔗</span>
          </a>
          <a href="https://discord.gg/echo-ai" target="_blank" rel="noopener noreferrer" aria-label="Discord">
            <span role="img" aria-label="discord">💬</span>
          </a>
        </SocialLinks>
      </CopyrightSection>
    </FooterContainer>
  );
};

export default Footer; 