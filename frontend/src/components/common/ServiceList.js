import React, { useState } from 'react';
import styled from 'styled-components';
import { SearchBar, Tabs, Space, Grid, Button, Popup, Checkbox, Radio, Form, Divider } from 'antd-mobile';
import { AppstoreOutline, UnorderedListOutline, FilterOutline, CloseOutline } from 'antd-mobile-icons';
import ServiceCard from './ServiceCard';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

const Container = styled.div`
  padding: var(--spacing-2);
`;

const SearchContainer = styled.div`
  margin-bottom: var(--spacing-3);
  .adm-search-bar {
    --background: var(--surface);
    --border-radius: var(--radius-lg);
  }
`;

const StyledTabs = styled(Tabs)`
  --active-line-color: var(--color-primary);
  --active-title-color: var(--color-primary);
  --title-font-size: var(--font-size-md);
  
  margin-bottom: var(--spacing-4);
  
  .adm-tabs-tab {
    color: var(--text);
  }
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
`;

const ViewToggle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--text-secondary);
  
  .toggle-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &.active {
      color: var(--color-primary);
      background-color: var(--color-primary-light);
    }
    
    &:hover:not(.active) {
      background-color: var(--surface-hover);
    }
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-3);
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
`;

const SortControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  
  .sort-label {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .sort-select {
    font-size: var(--font-size-sm);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background-color: var(--surface);
    color: var(--text);
  }
`;

const FilterButton = styled(Button)`
  display: flex;
  align-items: center;
  --border-radius: var(--radius-md);
  
  .adm-button-icon {
    font-size: 18px;
  }
`;

const FilterPopup = styled(Popup)`
  .adm-popup-body {
    height: auto;
    max-height: 90vh;
    overflow-y: auto;
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--border);
  
  .title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
  }
  
  .close-button {
    border: none;
    background: none;
    color: var(--text-secondary);
    padding: var(--spacing-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const FilterContent = styled.div`
  padding: var(--spacing-3) var(--spacing-4);
`;

const FilterSection = styled.div`
  margin-bottom: var(--spacing-4);
  
  .section-title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-2);
    color: var(--text);
  }
`;

const FilterActions = styled.div`
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-top: 1px solid var(--border);
  
  button {
    flex: 1;
  }
`;

const FilterCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background-color: var(--color-primary);
  color: white;
  font-size: var(--font-size-xs);
  margin-left: var(--spacing-1);
`;

const TagsFilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
`;

const TagCheckbox = styled.div`
  display: inline-flex;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  color: var(--text);
  background-color: var(--surface);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  
  &.selected {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
`;

/**
 * 服务列表组件
 * @param {Object} props
 * @param {Array} props.services 服务列表数据
 * @param {boolean} props.loading 是否正在加载
 * @param {Function} props.onServiceClick 服务点击事件
 * @param {Function} props.onSearch 搜索事件
 * @param {string} props.error 错误信息
 * @param {Function} props.onRetry 重试事件
 * @param {string} props.defaultView 默认视图
 * @param {Function} props.onViewModeChange 视图模式变更回调
 */
const ServiceList = ({ 
  services = [], 
  loading = false, 
  onServiceClick,
  onSearch,
  error,
  onRetry,
  defaultView = 'grid',
  onViewModeChange
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState(defaultView);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    providers: [],
    tags: [],
    ratings: []
  });
  
  // 从服务数据中提取所有可能的标签和提供者
  const allTags = Array.from(new Set(services.flatMap(service => service.tags || [])));
  const allProviders = Array.from(new Set(services.map(service => service.provider || '系统')));
  
  // 计算应用的筛选数量
  const activeFilterCount = 
    filters.providers.length + 
    filters.tags.length + 
    filters.ratings.length;
  
  // 过滤服务
  const filteredServices = services.filter(service => {
    // 搜索过滤
    const searchMatch = !searchText || 
      service.title.toLowerCase().includes(searchText.toLowerCase()) ||
      service.description.toLowerCase().includes(searchText.toLowerCase()) ||
      (service.tags && service.tags.some(tag => 
        tag.toLowerCase().includes(searchText.toLowerCase())
      ));
    
    // 类型过滤
    const typeMatch = activeTab === 'all' || service.type === activeTab;
    
    // 高级筛选 - 服务提供者
    const providerMatch = filters.providers.length === 0 || 
      filters.providers.includes(service.provider || '系统');
    
    // 高级筛选 - 标签
    const tagsMatch = filters.tags.length === 0 || 
      (service.tags && filters.tags.some(tag => service.tags.includes(tag)));
    
    // 高级筛选 - 评分
    const ratingMatch = filters.ratings.length === 0 ||
      filters.ratings.includes(Math.floor(service.rating || 5));
    
    return searchMatch && typeMatch && providerMatch && tagsMatch && ratingMatch;
  });
  
  // 排序服务
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'rating-high':
        return (b.rating || 0) - (a.rating || 0);
      case 'rating-low':
        return (a.rating || 0) - (b.rating || 0);
      default:
        return 0;
    }
  });
  
  const handleSearch = (value) => {
    setSearchText(value);
    if (onSearch) {
      onSearch(value);
    }
  };
  
  const handleTabChange = (key) => {
    setActiveTab(key);
  };
  
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };
  
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  // 处理筛选变更
  const handleFilterChange = (type, value) => {
    setFilters(prev => {
      const updated = { ...prev };
      
      if (type === 'providers') {
        if (updated.providers.includes(value)) {
          updated.providers = updated.providers.filter(p => p !== value);
        } else {
          updated.providers = [...updated.providers, value];
        }
      } else if (type === 'tags') {
        if (updated.tags.includes(value)) {
          updated.tags = updated.tags.filter(t => t !== value);
        } else {
          updated.tags = [...updated.tags, value];
        }
      } else if (type === 'ratings') {
        if (updated.ratings.includes(value)) {
          updated.ratings = updated.ratings.filter(r => r !== value);
        } else {
          updated.ratings = [...updated.ratings, value];
        }
      }
      
      return updated;
    });
  };
  
  // 重置所有筛选
  const resetFilters = () => {
    setFilters({
      providers: [],
      tags: [],
      ratings: []
    });
  };
  
  // 渲染加载状态
  if (loading) {
    return <LoadingSpinner text="加载服务中..." />;
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <EmptyState
        type="error"
        title="加载失败"
        description={error}
        buttonText="重试"
        onButtonClick={onRetry}
        fullPage
      />
    );
  }
  
  // 渲染空状态
  if (!services || services.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="暂无服务"
        description="当前没有可用的服务"
        fullPage
      />
    );
  }
  
  const renderControls = () => (
    <>
      <SearchContainer>
        <SearchBar
          placeholder="搜索服务"
          value={searchText}
          onChange={handleSearch}
          onCancel={() => handleSearch('')}
        />
      </SearchContainer>
      
      <StyledTabs activeKey={activeTab} onChange={handleTabChange}>
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="语音" key="voice" />
        <Tabs.Tab title="内容" key="content" />
      </StyledTabs>
      
      <ControlsRow>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <ViewToggle>
            <div 
              className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => toggleViewMode('grid')}
              aria-label="网格视图"
            >
              <AppstoreOutline fontSize={20} />
            </div>
            <div 
              className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => toggleViewMode('list')}
              aria-label="列表视图"
            >
              <UnorderedListOutline fontSize={20} />
            </div>
          </ViewToggle>
          
          <FilterButton onClick={() => setShowFilter(true)}>
            <FilterOutline style={{ marginRight: 4 }} />
            筛选
            {activeFilterCount > 0 && <FilterCount>{activeFilterCount}</FilterCount>}
          </FilterButton>
        </div>
        
        <SortControls>
          <span className="sort-label">排序:</span>
          <select 
            className="sort-select"
            value={sortBy}
            onChange={handleSortChange}
            data-testid="sort-selector"
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="rating-high">评分 高-低</option>
            <option value="rating-low">评分 低-高</option>
          </select>
        </SortControls>
      </ControlsRow>
    </>
  );
  
  // 渲染筛选弹窗
  const renderFilterPopup = () => (
    <FilterPopup
      visible={showFilter}
      onMaskClick={() => setShowFilter(false)}
      position="bottom"
      bodyStyle={{ minHeight: '40vh' }}
    >
      <FilterHeader>
        <div className="title">筛选服务</div>
        <button 
          className="close-button"
          onClick={() => setShowFilter(false)}
        >
          <CloseOutline fontSize={24} />
        </button>
      </FilterHeader>
      
      <FilterContent>
        {allProviders.length > 0 && (
          <FilterSection>
            <div className="section-title">服务提供者</div>
            <Checkbox.Group 
              value={filters.providers}
              onChange={(values) => setFilters(prev => ({ ...prev, providers: values }))}
            >
              <Space direction="vertical" block>
                {allProviders.map(provider => (
                  <Checkbox value={provider} key={provider}>{provider}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </FilterSection>
        )}
        
        {allTags.length > 0 && (
          <FilterSection>
            <div className="section-title">标签</div>
            <TagsFilterContainer>
              {allTags.map(tag => (
                <TagCheckbox 
                  key={tag}
                  className={filters.tags.includes(tag) ? 'selected' : ''}
                  onClick={() => handleFilterChange('tags', tag)}
                >
                  {tag}
                </TagCheckbox>
              ))}
            </TagsFilterContainer>
          </FilterSection>
        )}
        
        <FilterSection>
          <div className="section-title">评分</div>
          <Checkbox.Group 
            value={filters.ratings}
            onChange={(values) => setFilters(prev => ({ ...prev, ratings: values }))}
          >
            <Space direction="horizontal" wrap>
              {[5, 4, 3, 2, 1].map(rating => (
                <Checkbox value={rating} key={rating}>{rating}星及以上</Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </FilterSection>
      </FilterContent>
      
      <FilterActions>
        <Button 
          onClick={resetFilters}
          fill="outline"
        >
          重置
        </Button>
        <Button 
          color="primary"
          onClick={() => setShowFilter(false)}
        >
          应用筛选 ({activeFilterCount})
        </Button>
      </FilterActions>
    </FilterPopup>
  );
  
  // 渲染搜索无结果
  if (filteredServices.length === 0) {
    return (
      <Container>
        {renderControls()}
        {renderFilterPopup()}
        
        <EmptyState
          type="no-results"
          title="无搜索结果"
          description="找不到匹配的服务，请尝试调整筛选条件"
          buttonText="清除筛选"
          onButtonClick={() => {
            setSearchText('');
            setActiveTab('all');
            resetFilters();
          }}
        />
      </Container>
    );
  }
  
  return (
    <Container>
      {renderControls()}
      {renderFilterPopup()}
      
      {viewMode === 'grid' ? (
        <GridContainer className="grid-view">
          {sortedServices.map(service => (
            <ServiceCard
              key={service.id}
              id={service.id}
              title={service.title}
              description={service.description}
              tags={service.tags}
              type={service.type}
              provider={service.provider}
              onClick={onServiceClick}
              viewMode={viewMode}
            />
          ))}
        </GridContainer>
      ) : (
        <ListContainer className="list-view">
          {sortedServices.map(service => (
            <ServiceCard
              key={service.id}
              id={service.id}
              title={service.title}
              description={service.description}
              tags={service.tags}
              type={service.type}
              provider={service.provider}
              onClick={onServiceClick}
              viewMode={viewMode}
            />
          ))}
        </ListContainer>
      )}
    </Container>
  );
};

export default ServiceList; 