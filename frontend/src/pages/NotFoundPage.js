import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const PageContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.05) 0%, 
    rgba(147, 51, 234, 0.05) 25%, 
    rgba(236, 72, 153, 0.05) 50%, 
    rgba(245, 158, 11, 0.05) 75%, 
    rgba(16, 185, 129, 0.05) 100%
  );
  padding: 1.5rem 2.5rem;
  
  [data-theme="dark"] & {
    background: linear-gradient(135deg, 
      rgba(15, 23, 42, 0.95) 0%, 
      rgba(30, 41, 59, 0.95) 25%, 
      rgba(51, 65, 85, 0.95) 50%, 
      rgba(71, 85, 105, 0.95) 75%, 
      rgba(30, 41, 59, 0.95) 100%
    );
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
`;

const IllustrationSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 50vh;
  opacity: 0.04;
  color: var(--text-color);
  
  [data-theme="dark"] & {
    opacity: 0.03;
  }
`;

const NotFoundContent = styled.div`
  position: relative;
  text-align: center;
  z-index: 1;
  padding-top: 13rem;
`;

const Title = styled.h1`
  margin-top: 1rem;
  font-size: 3rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--primary-color);
  line-height: 1.1;
  
  @media (min-width: 640px) {
    font-size: 4.5rem;
  }
`;

const Description = styled.p`
  margin-top: 1.5rem;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-secondary, rgba(107, 114, 128, 1));
  line-height: 1.6;
  
  [data-theme="dark"] & {
    color: rgba(156, 163, 175, 1);
  }
  
  @media (min-width: 640px) {
    font-size: 1.25rem;
    line-height: 1.8;
  }
`;

const SearchSection = styled.div`
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-left: auto;
  margin-right: auto;
  max-width: 24rem;
  
  @media (min-width: 640px) {
    flex-direction: row;
    gap: 0.5rem;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  height: 1rem;
  width: 1rem;
  color: var(--text-secondary, rgba(107, 114, 128, 1));
  
  svg {
    width: 100%;
    height: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color, rgba(229, 231, 235, 1));
  background-color: var(--surface);
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  font-size: 0.875rem;
  color: var(--text-color);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &::placeholder {
    color: var(--text-secondary, rgba(156, 163, 175, 1));
  }
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  [data-theme="dark"] & {
    border-color: var(--border-color, rgba(75, 85, 99, 1));
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 2.25rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  
  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 24rem;
  
  &:hover:not(:disabled) {
    background-color: rgba(59, 130, 246, 0.9);
  }
  
  @media (min-width: 640px) {
    width: auto;
    max-width: none;
    min-width: 120px;
  }
`;

const OutlineButton = styled(Button)`
  border: 1px solid var(--border-color, rgba(229, 231, 235, 1));
  background-color: var(--surface);
  color: var(--text-color);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  
  &:hover:not(:disabled) {
    background-color: var(--hover-bg, rgba(249, 250, 251, 1));
  }
  
  [data-theme="dark"] & {
    border-color: var(--border-color, rgba(75, 85, 99, 1));
    
    &:hover:not(:disabled) {
      background-color: var(--hover-bg, rgba(55, 65, 81, 0.5));
    }
  }
`;

const SecondaryButton = styled(Button)`
  background-color: var(--secondary-bg, rgba(243, 244, 246, 1));
  color: var(--text-color);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  flex: 1;
  
  &:hover:not(:disabled) {
    background-color: var(--secondary-bg-hover, rgba(229, 231, 235, 1));
  }
  
  [data-theme="dark"] & {
    background-color: var(--secondary-bg, rgba(55, 65, 81, 1));
    
    &:hover:not(:disabled) {
      background-color: var(--secondary-bg-hover, rgba(75, 85, 99, 1));
    }
  }
  
  @media (min-width: 640px) {
    flex: none;
    min-width: 120px;
  }
`;

const ActionSection = styled.div`
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  @media (min-width: 640px) {
    flex-direction: row;
    gap: 1.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  order: -1;
  width: 100%;
  max-width: 24rem;
  
  @media (min-width: 640px) {
    order: 0;
    width: auto;
    max-width: none;
  }
`;

const ArrowIcon = styled.span`
  margin-right: 0.5rem;
  opacity: 0.6;
  transition: transform 0.2s ease;
  display: inline-block;
  
  ${SecondaryButton}:hover & {
    transform: translateX(-0.125rem);
  }
`;

const NotFoundPage = ({
  title = "页面未找到",
  description = "抱歉，您访问的页面不存在。可能已被移动或删除。"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // 这里可以实现搜索逻辑，暂时跳转到首页
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <PageContainer>
      <ContentWrapper>
        <IllustrationSvg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 362 145"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M62.6 142c-2.133 0-3.2-1.067-3.2-3.2V118h-56c-2 0-3-1-3-3V92.8c0-1.333.4-2.733 1.2-4.2L58.2 4c.8-1.333 2.067-2 3.8-2h28c2 0 3 1 3 3v85.4h11.2c.933 0 1.733.333 2.4 1 .667.533 1 1.267 1 2.2v21.2c0 .933-.333 1.733-1 2.4-.667.533-1.467.8-2.4.8H93v20.8c0 2.133-1.067 3.2-3.2 3.2H62.6zM33 90.4h26.4V51.2L33 90.4zM181.67 144.6c-7.333 0-14.333-1.333-21-4-6.666-2.667-12.866-6.733-18.6-12.2-5.733-5.467-10.266-13-13.6-22.6-3.333-9.6-5-20.667-5-33.2 0-12.533 1.667-23.6 5-33.2 3.334-9.6 7.867-17.133 13.6-22.6 5.734-5.467 11.934-9.533 18.6-12.2 6.667-2.8 13.667-4.2 21-4.2 7.467 0 14.534 1.4 21.2 4.2 6.667 2.667 12.8 6.733 18.4 12.2 5.734 5.467 10.267 13 13.6 22.6 3.334 9.6 5 20.667 5 33.2 0 12.533-1.666 23.6-5 33.2-3.333 9.6-7.866 17.133-13.6 22.6-5.6 5.467-11.733 9.533-18.4 12.2-6.666 2.667-13.733 4-21.2 4zm0-31c9.067 0 15.6-3.733 19.6-11.2 4.134-7.6 6.2-17.533 6.2-29.8s-2.066-22.2-6.2-29.8c-4.133-7.6-10.666-11.4-19.6-11.4-8.933 0-15.466 3.8-19.6 11.4-4 7.6-6 17.533-6 29.8s2 22.2 6 29.8c4.134 7.467 10.667 11.2 19.6 11.2zM316.116 142c-2.134 0-3.2-1.067-3.2-3.2V118h-56c-2 0-3-1-3-3V92.8c0-1.333.4-2.733 1.2-4.2l56.6-84.6c.8-1.333 2.066-2 3.8-2h28c2 0 3 1 3 3v85.4h11.2c.933 0 1.733.333 2.4 1 .666.533 1 1.267 1 2.2v21.2c0 .933-.334 1.733-1 2.4-.667.533-1.467.8-2.4.8h-11.2v20.8c0 2.133-1.067 3.2-3.2 3.2h-27.2zm-29.6-51.6h26.4V51.2l-26.4 39.2z"
          />
        </IllustrationSvg>

        <NotFoundContent>
          <Title>{title}</Title>
          <Description>{description}</Description>

          <SearchSection>
            <SearchInputWrapper>
              <SearchIcon>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </SearchIcon>
              <SearchInput
                placeholder="搜索页面或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                aria-label="搜索"
              />
            </SearchInputWrapper>
            <OutlineButton onClick={handleSearch} disabled={!searchQuery.trim()}>
              搜索
            </OutlineButton>
          </SearchSection>

          <ActionSection>
            <ButtonGroup>
              <SecondaryButton onClick={handleGoBack}>
                <ArrowIcon>←</ArrowIcon>
                返回上页
              </SecondaryButton>
            </ButtonGroup>
            <PrimaryButton onClick={handleGoHome}>
              回到首页
            </PrimaryButton>
          </ActionSection>
        </NotFoundContent>
      </ContentWrapper>
    </PageContainer>
  );
};

export default NotFoundPage; 